import type { HomeSlide } from "../types";

// Видео: до 30 МБ, mp4/webm/mov (лимит бакета banners тот же).
export const VIDEO_MAX_BYTES = 31457280;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function checkVideoFile(f: { type: string; size: number }): "ok" | "type" | "size" {
  if (!VIDEO_TYPES.includes(f.type)) return "type";
  if (f.size > VIDEO_MAX_BYTES) return "size";
  return "ok";
}

export type SlideInput = { mediaType: string; imageUrl: string | null; videoUrl: string | null; action: string; productId: string | null };

export function validateSlideInput(i: SlideInput): "ok" | "media" | "product" | "action" {
  if (i.mediaType === "video" ? !i.videoUrl : !i.imageUrl) return "media";
  if (i.action !== "cart" && i.action !== "promo") return "action";
  if (i.action === "cart" && !i.productId) return "product";
  return "ok";
}

export const SLIDE_INPUT_ERRORS: Record<"media" | "product" | "action", string> = {
  media: "Загрузите фото или видео для слайда.",
  product: "Выберите товар для кнопки «Купить товар».",
  action: "Выберите действие слайда.",
};

export type SlideRow = {
  media_type: "image" | "video";
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  subtitle: string | null;
  action: "cart" | "promo";
  product_id: string | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// Полная форма слайда из JSON → строка для home_slides (или код ошибки).
export function slideRowFromBody(body: unknown): { ok: true; row: SlideRow } | { ok: false; error: "media" | "product" | "action" } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const input: SlideInput = {
    mediaType: b.mediaType === "video" ? "video" : "image",
    imageUrl: str(b.imageUrl),
    videoUrl: str(b.videoUrl),
    action: typeof b.action === "string" ? b.action : "",
    productId: str(b.productId),
  };
  const check = validateSlideInput(input);
  if (check !== "ok") return { ok: false, error: check };
  const action = input.action as "cart" | "promo";
  return {
    ok: true,
    row: {
      media_type: input.mediaType as "image" | "video",
      image_url: input.imageUrl,
      video_url: input.mediaType === "video" ? input.videoUrl : null,
      title: str(b.title),
      subtitle: str(b.subtitle),
      action,
      product_id: action === "cart" ? input.productId : null,
    },
  };
}

// Показываем активные слайды; «в корзину» — только если товар есть в наличии.
export function visibleSlides(slides: HomeSlide[]): HomeSlide[] {
  return slides
    .filter((s) => s.active && (s.action !== "cart" || (s.product !== null && s.product.inStock)))
    .sort((a, b) => a.priority - b.priority);
}

// Сдвиг элемента на соседнюю позицию, без мутации исходного массива.
export function moveSlide<T extends { id: string }>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[index], out[j]] = [out[j], out[index]];
  return out;
}
