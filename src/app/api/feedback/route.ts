import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { normalizeContactPhone } from "@/lib/feedback";

// Подсказка для поля «Телефон для связи»: номер из последнего заказа клиента (клиент может его поменять).
export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("orders")
      .select("customer_phone")
      .eq("user_id", profile.userId)
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ phone: (data?.customer_phone as string | null) ?? null });
  } catch {
    return NextResponse.json({ phone: null });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const message: string = (body.message ?? "").trim();
  const branchId: string | undefined = body.branchId;
  const phone = normalizeContactPhone(body.phone);

  if (!message) {
    return NextResponse.json({ error: "Напишите сообщение." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Укажите телефон для связи." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Any branch works for the WhatsApp destination — feedback isn't tied to
    // a specific store location, we just need *a* number to send it to.
    // Prefer the branch the customer has picked in the catalog, if given.
    let branchQuery = supabase.from("branches").select("*").eq("store_id", profile.storeId);
    branchQuery = branchId ? branchQuery.eq("id", branchId) : branchQuery.order("created_at", { ascending: true });
    const { data: branch } = await branchQuery.limit(1).maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Не удалось найти филиал для связи." }, { status: 404 });
    }

    // Имя и почта копируются в сообщение: профили клиентов сотрудникам не видны (RLS), а связаться нужно.
    const base = { store_id: profile.storeId, user_id: profile.userId, branch_id: branch.id, message };
    let { error } = await supabase
      .from("feedback")
      .insert({ ...base, author_name: profile.displayName, author_email: profile.email, contact_phone: phone });
    // До миграции supabase/feedback_contact.sql колонок контактов нет — сохраняем сообщение без них.
    if (error && (error.code === "PGRST204" || error.code === "42703")) {
      ({ error } = await supabase.from("feedback").insert(base));
    }
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось отправить сообщение — база данных недоступна." }, { status: 500 });
  }
}
