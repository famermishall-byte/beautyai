import { test } from "node:test";
import assert from "node:assert/strict";
import { VIDEO_MAX_BYTES, checkVideoFile, validateSlideInput, visibleSlides, moveSlide } from "./home-slides";
import type { HomeSlide, Product } from "../types";

test("checkVideoFile: тип и размер", () => {
  assert.equal(checkVideoFile({ type: "video/mp4", size: 1000 }), "ok");
  assert.equal(checkVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1 }), "size");
  assert.equal(checkVideoFile({ type: "video/avi", size: 1000 }), "type");
  assert.equal(checkVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES }), "ok");
});

const base = { mediaType: "image", imageUrl: "i", videoUrl: null, action: "promo", productId: null };

test("validateSlideInput", () => {
  assert.equal(validateSlideInput({ ...base, mediaType: "video", videoUrl: null }), "media");
  assert.equal(validateSlideInput({ ...base, imageUrl: null }), "media");
  assert.equal(validateSlideInput({ ...base, action: "cart" }), "product");
  assert.equal(validateSlideInput({ ...base, action: "x" }), "action");
  assert.equal(validateSlideInput(base), "ok");
});

const slide = (id: string, o: Partial<HomeSlide> = {}): HomeSlide => ({
  id, mediaType: "image", imageUrl: "i", videoUrl: null, title: null, subtitle: null,
  action: "promo", productId: null, priority: 0, active: true, product: null, ...o,
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

test("moveSlide", () => {
  const l = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(moveSlide(l, 0, -1).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(moveSlide(l, 0, 1).map((x) => x.id), ["b", "a", "c"]);
  assert.deepEqual(l.map((x) => x.id), ["a", "b", "c"]);
});
