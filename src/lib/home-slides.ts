import type { HomeSlide, SlideAction, SlidePlacement } from "../types";

// Видео: до 30 МБ, mp4/webm/mov (лимит бакета banners тот же).
export const VIDEO_MAX_BYTES = 31457280;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function checkVideoFile(f: { type: string; size: number }): "ok" | "type" | "size" {
  if (!VIDEO_TYPES.includes(f.type)) return "type";
  if (f.size > VIDEO_MAX_BYTES) return "size";
  return "ok";
}

// Действия по месту показа: верхний слайдер — как раньше, встроенный баннер — свои.
export const HERO_ACTIONS: SlideAction[] = ["cart", "promo"];
export const INLINE_ACTIONS: SlideAction[] = ["product", "category", "promo", "new", "catalog"];

export type SlideInput = {
  placement: string;
  mediaType: string;
  imageUrl: string | null;
  videoUrl: string | null;
  action: string;
  productId: string | null;
  category: string | null;
};

export function validateSlideInput(i: SlideInput): "ok" | "media" | "product" | "action" | "category" {
  if (i.mediaType === "video" ? !i.videoUrl : !i.imageUrl) return "media";
  const allowed: string[] = i.placement === "inline" ? INLINE_ACTIONS : HERO_ACTIONS;
  if (!allowed.includes(i.action)) return "action";
  if ((i.action === "cart" || i.action === "product") && !i.productId) return "product";
  if (i.action === "category" && !i.category) return "category";
  return "ok";
}

export const SLIDE_INPUT_ERRORS: Record<"media" | "product" | "action" | "category", string> = {
  media: "Загрузите фото или видео для слайда.",
  product: "Выберите товар для кнопки «Купить товар».",
  action: "Выберите действие слайда.",
  category: "Выберите категорию.",
};

export type SlideRow = {
  media_type: "image" | "video";
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  subtitle: string | null;
  action: SlideAction;
  product_id: string | null;
  placement: SlidePlacement;
  link_category: string | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// Полная форма слайда из JSON → строка для home_slides (или код ошибки).
export function slideRowFromBody(body: unknown): { ok: true; row: SlideRow } | { ok: false; error: "media" | "product" | "action" | "category" } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const input: SlideInput = {
    placement: b.placement === "inline" ? "inline" : "hero",
    mediaType: b.mediaType === "video" ? "video" : "image",
    imageUrl: str(b.imageUrl),
    videoUrl: str(b.videoUrl),
    action: typeof b.action === "string" ? b.action : "",
    productId: str(b.productId),
    category: str(b.category),
  };
  const check = validateSlideInput(input);
  if (check !== "ok") return { ok: false, error: check };
  const action = input.action as SlideAction;
  return {
    ok: true,
    row: {
      media_type: input.mediaType as "image" | "video",
      image_url: input.imageUrl,
      video_url: input.mediaType === "video" ? input.videoUrl : null,
      title: str(b.title),
      subtitle: str(b.subtitle),
      action,
      product_id: action === "cart" || action === "product" ? input.productId : null,
      placement: input.placement as SlidePlacement,
      link_category: action === "category" ? input.category : null,
    },
  };
}

// Показываем активные слайды; «в корзину» — только если товар в наличии, «товар» — если он есть,
// «категория» — если она задана и (когда передан список групп каталога) существует.
export function visibleSlides(slides: HomeSlide[], groupNames?: string[]): HomeSlide[] {
  return slides
    .filter((s) => {
      if (!s.active) return false;
      if (s.action === "cart") return s.product !== null && s.product.inStock;
      if (s.action === "product") return s.product !== null;
      if (s.action === "category") return !!s.category && (!groupNames || groupNames.includes(s.category));
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

// Куда ведёт нажатие на слайд/баннер.
export function slideHref(s: Pick<HomeSlide, "action" | "productId" | "category">): string {
  switch (s.action) {
    case "cart":
    case "product":
      return s.productId ? `/product/${s.productId}` : "/catalog";
    case "category":
      return s.category ? `/catalog?group=${encodeURIComponent(s.category)}` : "/catalog";
    case "new":
      return "/catalog?new=1";
    case "catalog":
      return "/catalog?all=1";
    default:
      return "/catalog?promo=1";
  }
}

// Сдвиг элемента на соседнюю позицию, без мутации исходного массива.
export function moveSlide<T extends { id: string }>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[index], out[j]] = [out[j], out[index]];
  return out;
}
