import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";

const RECOMMEND_TOOL = {
  name: "recommend_products",
  description:
    "Вернуть подобранные товары из каталога магазина в ответ на запрос покупателя.",
  input_schema: {
    type: "object" as const,
    properties: {
      found: {
        type: "boolean",
        description: "true, если в каталоге нашлось хотя бы одно подходящее предложение",
      },
      message: {
        type: "string",
        description:
          "Короткое дружелюбное сообщение покупателю на русском языке. Если found=false — честно объясни, что подходящего варианта в ассортименте нет.",
      },
      recommendations: {
        type: "array",
        description: "Список рекомендованных товаров, от самого подходящего к менее подходящему",
        items: {
          type: "object",
          properties: {
            productId: { type: "string", description: "id товара из предоставленного каталога" },
            reason: { type: "string", description: "Короткое объяснение, почему товар подходит (1-2 предложения, на русском)" },
          },
          required: ["productId", "reason"],
        },
      },
    },
    required: ["found", "message", "recommendations"],
  },
};

const SYSTEM_PROMPT = `Ты — AI-консультант по косметике для конкретного магазина.

СТРОГИЕ ПРАВИЛА:
1. Ты можешь рекомендовать ТОЛЬКО товары из каталога, который дан тебе в этом сообщении. Никогда не придумывай товары, которых нет в списке.
2. Никогда не придумывай характеристики, цену или свойства товара, которых нет в предоставленных данных.
3. Если в каталоге нет товара, подходящего под запрос (в том числе под указанный бюджет), честно скажи об этом в поле message и верни found=false с пустым списком recommendations. Не пытайся "подогнать" неподходящий товар только чтобы что-то ответить.
4. Учитывай бюджет покупателя, если он указан в запросе — не предлагай товары дороже указанной суммы.
5. Объясняй свой выбор коротко и по-человечески, на русском языке.
6. Всегда отвечай вызовом инструмента recommend_products.`;

function toRecommendedProduct(product: Record<string, unknown>, reason: string) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    description: product.description,
    characteristics: product.characteristics,
    purpose: product.purpose,
    inStock: product.in_stock,
    imageUrl: product.image_url,
    reason,
  };
}

function findDirectMatches(products: Record<string, unknown>[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return products.filter((p) => {
    const haystack = [p.name, p.brand, p.category, p.description, p.characteristics, p.purpose]
      .filter((field): field is string => typeof field === "string")
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const message: string = body.message ?? "";

  if (!message.trim()) {
    return NextResponse.json({ error: "Пустой запрос." }, { status: 400 });
  }

  let products: Record<string, unknown>[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const productsRes = await supabase
      .from("products")
      .select("*")
      .eq("store_id", profile.storeId)
      .eq("in_stock", true);
    if (productsRes.error) throw productsRes.error;
    products = productsRes.data ?? [];
  } catch {
    return NextResponse.json(
      { error: "База данных недоступна на сервере." },
      { status: 500 }
    );
  }

  if (products.length === 0) {
    return NextResponse.json({
      found: false,
      message: "В каталоге магазина пока нет товаров. Сначала загрузите ассортимент в админ-панели.",
      products: [],
    });
  }

  // Прямой поиск по совпадению текста в названии/бренде/категории/описании —
  // работает всегда, даже если AI-консультант (ниже) не настроен или не смог понять запрос.
  const directMatches = findDirectMatches(products, message);
  if (directMatches.length > 0) {
    return NextResponse.json({
      found: true,
      message: `Вот что нашлось по запросу «${message}»:`,
      products: directMatches.map((p) => toRecommendedProduct(p, `Совпадает с запросом «${message}»`)),
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Не настроен ANTHROPIC_API_KEY на сервере. Добавь ключ в файл .env." },
      { status: 500 }
    );
  }

  const catalogForModel = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    description: p.description,
    characteristics: p.characteristics,
    purpose: p.purpose,
  }));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [RECOMMEND_TOOL],
    tool_choice: { type: "tool", name: "recommend_products" },
    messages: [
      {
        role: "user",
        content: `Каталог магазина (JSON):\n${JSON.stringify(catalogForModel)}\n\nЗапрос покупателя: "${message}"`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "AI не вернул структурированный ответ. Попробуйте ещё раз." },
      { status: 502 }
    );
  }

  const result = toolUse.input as {
    found: boolean;
    message: string;
    recommendations: { productId: string; reason: string }[];
  };

  const catalogIds = new Set(products.map((p) => p.id as string));
  const validRecommendations = result.recommendations.filter((r) => catalogIds.has(r.productId));

  const recommendedProducts = validRecommendations
    .map((r) => {
      const product = products.find((p) => p.id === r.productId);
      if (!product) return null;
      return toRecommendedProduct(product, r.reason);
    })
    .filter(Boolean);

  return NextResponse.json({
    found: result.found && recommendedProducts.length > 0,
    message: result.message,
    products: recommendedProducts,
  });
}
