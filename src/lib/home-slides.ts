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
