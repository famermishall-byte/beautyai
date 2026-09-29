import { test } from "node:test";
import assert from "node:assert/strict";
import { VIDEO_MAX_BYTES, checkVideoFile, validateSlideInput, visibleSlides, moveSlide, slideRowFromBody, slideHref } from "./home-slides";
import type { HomeSlide, Product } from "../types";

test("checkVideoFile: тип и размер", () => {
  assert.equal(checkVideoFile({ type: "video/mp4", size: 1000 }), "ok");
  assert.equal(checkVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1 }), "size");
  assert.equal(checkVideoFile({ type: "video/avi", size: 1000 }), "type");
  assert.equal(checkVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES }), "ok");
});

const base = { placement: "hero", category: null, mediaType: "image", imageUrl: "i", videoUrl: null, action: "promo", productId: null };

test("validateSlideInput", () => {
  assert.equal(validateSlideInput({ ...base, mediaType: "video", videoUrl: null }), "media");
  assert.equal(validateSlideInput({ ...base, imageUrl: null }), "media");
  assert.equal(validateSlideInput({ ...base, action: "cart" }), "product");
  assert.equal(validateSlideInput({ ...base, action: "x" }), "action");
  assert.equal(validateSlideInput(base), "ok");
});

test("validateSlideInput: hero и inline", () => {
  assert.equal(validateSlideInput({ ...base, action: "category", category: "Уход" }), "action");
  assert.equal(validateSlideInput({ ...base, action: "product", productId: "p" }), "action");
  const inl = { ...base, placement: "inline" };
  assert.equal(validateSlideInput({ ...inl, action: "cart", productId: "p" }), "action");
  assert.equal(validateSlideInput({ ...inl, action: "category" }), "category");
  assert.equal(validateSlideInput({ ...inl, action: "category", category: "Уход" }), "ok");
  assert.equal(validateSlideInput({ ...inl, action: "product" }), "product");
  assert.equal(validateSlideInput({ ...inl, action: "product", productId: "p" }), "ok");
  assert.equal(validateSlideInput({ ...inl, action: "promo" }), "ok");
  assert.equal(validateSlideInput({ ...inl, action: "new" }), "ok");
  assert.equal(validateSlideInput({ ...inl, action: "catalog" }), "ok");
});

const slide = (id: string, o: Partial<HomeSlide> = {}): HomeSlide => ({
  id, mediaType: "image", imageUrl: "i", videoUrl: null, title: null, subtitle: null,
  action: "promo", productId: null, placement: "hero", category: null, priority: 0, active: true, product: null, ...o,
});
const prod = (inStock: boolean) => ({ id: "p", inStock }) as Product;

test("visibleSlides фильтрует и сортирует", () => {
  const list = [
    slide("off", { active: false }),
    slide("nop", { action: "cart", product: null }),
    slide("oos", { action: "cart", product: prod(false) }),
    slide("b", { priority: 2 }),
    slide("a", { priority: 1, action: "cart", product: prod(true) }),
  ];
  assert.deepEqual(visibleSlides(list).map((s) => s.id), ["a", "b"]);
});

test("visibleSlides: category и product", () => {
  const list = [
    slide("c1", { action: "category", category: "Уход" }),
    slide("c2", { action: "category", category: "Нет такой" }),
    slide("c3", { action: "category", category: null }),
    slide("p1", { action: "product", product: prod(false) }),
    slide("p2", { action: "product", product: null }),
  ];
  assert.deepEqual(visibleSlides(list, ["Уход"]).map((s) => s.id), ["c1", "p1"]);
  assert.deepEqual(visibleSlides(list).map((s) => s.id), ["c1", "c2", "p1"]);
});

test("slideHref", () => {
  const h = (action: HomeSlide["action"], o: { productId?: string | null; category?: string | null } = {}) =>
    slideHref({ action, productId: o.productId ?? null, category: o.category ?? null });
  assert.equal(h("cart", { productId: "p1" }), "/product/p1");
  assert.equal(h("product", { productId: "p2" }), "/product/p2");
  assert.equal(h("category", { category: "Уход за лицом" }), "/catalog?group=" + encodeURIComponent("Уход за лицом"));
  assert.equal(h("promo"), "/catalog?promo=1");
  assert.equal(h("new"), "/catalog?new=1");
  assert.equal(h("catalog"), "/catalog");
});

test("slideRowFromBody", () => {
  assert.deepEqual(slideRowFromBody({ mediaType: "video", imageUrl: "p", action: "promo" }), { ok: false, error: "media" });
  assert.deepEqual(slideRowFromBody(null), { ok: false, error: "media" });
  const promo = slideRowFromBody({ mediaType: "image", imageUrl: "i", videoUrl: "v", action: "promo", productId: "x", title: "  ", subtitle: " s " });
  assert.deepEqual(promo, {
    ok: true,
    row: { media_type: "image", image_url: "i", video_url: null, title: null, subtitle: "s", action: "promo", product_id: null, placement: "hero", link_category: null },
  });
  const cart = slideRowFromBody({ mediaType: "video", imageUrl: "p", videoUrl: "v", action: "cart", productId: "x" });
  assert.equal(cart.ok && cart.row.product_id, "x");
  assert.equal(cart.ok && cart.row.video_url, "v");
});

test("slideRowFromBody: inline", () => {
  const cat = slideRowFromBody({ placement: "inline", mediaType: "image", imageUrl: "i", action: "category", category: " Уход ", productId: "x" });
  assert.equal(cat.ok && cat.row.placement, "inline");
  assert.equal(cat.ok && cat.row.link_category, "Уход");
  assert.equal(cat.ok && cat.row.product_id, null);
  const prodRow = slideRowFromBody({ placement: "inline", mediaType: "image", imageUrl: "i", action: "product", productId: "x", category: "Уход" });
  assert.equal(prodRow.ok && prodRow.row.product_id, "x");
  assert.equal(prodRow.ok && prodRow.row.link_category, null);
  assert.deepEqual(slideRowFromBody({ placement: "inline", mediaType: "image", imageUrl: "i", action: "category" }), { ok: false, error: "category" });
  assert.deepEqual(slideRowFromBody({ placement: "inline", mediaType: "image", imageUrl: "i", action: "cart", productId: "x" }), { ok: false, error: "action" });
  const def = slideRowFromBody({ mediaType: "image", imageUrl: "i", action: "promo" });
  assert.equal(def.ok && def.row.placement, "hero");
});

test("moveSlide", () => {
  const l = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(moveSlide(l, 0, -1).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(moveSlide(l, 0, 1).map((x) => x.id), ["b", "a", "c"]);
  assert.deepEqual(l.map((x) => x.id), ["a", "b", "c"]);
});
