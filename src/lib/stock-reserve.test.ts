import { test } from "node:test";
import assert from "node:assert/strict";
import { reservedByProductBranch, netStock, availableForOrder } from "./stock-reserve";

test("reservedByProductBranch sums open orders per product and branch", () => {
  const m = reservedByProductBranch([
    { status: "sent", branchId: "b1", items: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }] },
    { status: "paid", branchId: "b1", items: [{ productId: "p1", quantity: 3 }] },
    { status: "shipped", branchId: "b2", items: [{ productId: "p1", quantity: 4 }] },
  ]);
  assert.equal(m.get("p1|b1"), 5);
  assert.equal(m.get("p2|b1"), 1);
  assert.equal(m.get("p1|b2"), 4);
});

test("reservedByProductBranch skips closed orders, no branch, no productId, zero qty", () => {
  const m = reservedByProductBranch([
    { status: "completed", branchId: "b1", items: [{ productId: "p1", quantity: 2 }] },
    { status: "cancelled", branchId: "b1", items: [{ productId: "p1", quantity: 2 }] },
    { status: "sent", branchId: null, items: [{ productId: "p1", quantity: 2 }] },
    { status: "sent", branchId: "b1", items: [{ quantity: 2 }, { productId: "p3", quantity: 0 }] },
  ]);
  assert.equal(m.size, 0);
});

test("netStock never goes below zero", () => {
  assert.equal(netStock(10, 3), 7);
  assert.equal(netStock(2, 5), 0);
  assert.equal(netStock(4, 0), 4);
});

test("availableForOrder adds back this order's own reservation", () => {
  assert.equal(availableForOrder(0, 3, true), 3);
  assert.equal(availableForOrder(2, 3, false), 2);
  assert.equal(availableForOrder(null, 3, true), null);
});
