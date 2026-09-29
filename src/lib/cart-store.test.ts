import { test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem, Product } from "../types";
import { createCartStore } from "./cart-store";

const product = (id: string, price = 100): Product => ({
  id, sku: `SKU-${id}`, barcode: null, name: `Товар ${id}`, brand: "B", category: "C", price,
  description: null, characteristics: null, purpose: null, inStock: true, imageUrl: null,
});

/** Поддельный /api/cart: хранит строки как настоящий, умеет падать и «тормозить» запись. */
function fakeServer(catalog: Product[]) {
  const rows = new Map<string, { quantity: number; selected: boolean }>();
  let failNext = 0;
  let writeGate: Promise<void> | null = null;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    if (method !== "GET" && writeGate) await writeGate;
    if (failNext > 0) {
      failNext--;
      return json({ error: "boom" }, 500);
    }
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (method === "GET") {
      const items: CartItem[] = [...rows].map(([id, r]) => ({ product: catalog.find((p) => p.id === id)!, ...r }));
      return json({ items });
    }
    if (method === "PUT") {
      if (body.quantity <= 0) rows.delete(body.productId);
      else rows.set(body.productId, { quantity: body.quantity, selected: rows.get(body.productId)?.selected ?? true });
    }
    if (method === "PATCH") {
      for (const [id, r] of rows) if (body.productIds === "all" || body.productIds.includes(id)) r.selected = body.selected;
    }
    if (method === "DELETE") rows.delete(new URL(url, "http://x").searchParams.get("productId")!);
    return json({ ok: true });
  };
  return {
    rows,
    fetchImpl,
    failNextRequests: (n: number) => (failNext = n),
    holdWrites: () => {
      let release!: () => void;
      writeGate = new Promise((r) => (release = r));
      return () => {
        writeGate = null;
        release();
      };
    },
  };
}

test("flush reports failure when an unticked checkbox did not reach the server", async () => {
  const server = fakeServer([product("a")]);
  server.rows.set("a", { quantity: 1, selected: true });
  const store = createCartStore(server.fetchImpl, () => {});
  await store.load();

  server.failNextRequests(1);
  store.toggle("a");
  assert.equal(await store.flush(), false, "the order must not be sent");
  assert.equal(server.rows.get("a")!.selected, true);
  assert.equal(store.getState().items[0].selected, true, "screen resynced with the server");
  assert.equal(store.getState().saveFailed, true);
  assert.equal(await store.flush(), true, "a later flush with nothing failing is fine again");
});

test("two adds in the same tick both stay in the cart (care kit 'add all')", async () => {
  const server = fakeServer([product("a"), product("b")]);
  const store = createCartStore(server.fetchImpl, () => {});
  await store.load();

  store.add(product("a"));
  store.add(product("b"));
  assert.deepEqual(store.getState().items.map((i) => i.product.id), ["a", "b"]);
  assert.equal(await store.flush(), true);
  assert.deepEqual([...server.rows.keys()], ["a", "b"]);
});

test("reload waits for a pending write instead of overwriting it", async () => {
  const server = fakeServer([product("a")]);
  const store = createCartStore(server.fetchImpl, () => {});
  await store.load();

  const release = server.holdWrites();
  store.add(product("a"));
  const reloading = store.reload();
  release();
  await reloading;
  assert.deepEqual(store.getState().items.map((i) => [i.product.id, i.quantity]), [["a", 1]]);
});

test("an add after a failed first load does not overwrite the server quantity", async () => {
  const server = fakeServer([product("a")]);
  server.rows.set("a", { quantity: 5, selected: true });
  const store = createCartStore(server.fetchImpl, () => {});
  server.failNextRequests(1);
  assert.equal(await store.load(), false);

  store.add(product("a"));
  assert.equal(await store.flush(), true);
  assert.equal(server.rows.get("a")!.quantity, 6);
  assert.equal(store.getState().items[0].quantity, 6);
});

test("switching account drops the previous account's cart and ignores its in-flight work", async () => {
  const server = fakeServer([product("a")]);
  const store = createCartStore(server.fetchImpl, () => {});
  store.switchAccount("store:me@x");
  await store.load();
  store.add(product("a"));
  store.switchAccount(null);
  assert.deepEqual(store.getState(), { items: [], loaded: false, saveFailed: false });
});

test("switchAccount to the same account is a no-op; a different account starts clean", async () => {
  const server = fakeServer([product("a")]);
  server.rows.set("a", { quantity: 2, selected: true });
  const store = createCartStore(server.fetchImpl, () => {});
  assert.equal(store.switchAccount("store:me@x"), true);
  await store.load();
  assert.equal(store.switchAccount("store:me@x"), false);
  assert.equal(store.getState().items.length, 1, "same account keeps its cart");
  assert.equal(store.switchAccount("store:other@x"), true);
  assert.deepEqual(store.getState().items, []);
});

test("mergeLegacy reports false when the account switched before it ran", async () => {
  const server = fakeServer([product("a")]);
  const store = createCartStore(server.fetchImpl, () => {});
  store.switchAccount("store:me@x");
  const release = server.holdWrites();
  store.add(product("a"));
  const merged = store.mergeLegacy([{ productId: "a", quantity: 1 }]);
  store.switchAccount("store:other@x");
  release();
  assert.equal(await merged, false);
});

test("an add made before the account is known is not dropped when the account arrives", async () => {
  const server = fakeServer([product("a")]);
  const store = createCartStore(server.fetchImpl, () => {});
  store.add(product("a"));
  store.switchAccount("store:me@x");
  store.load();
  assert.equal(await store.flush(), true);
  assert.equal(server.rows.get("a")?.quantity, 1);
  assert.deepEqual(store.getState().items.map((i) => i.product.id), ["a"]);
});
