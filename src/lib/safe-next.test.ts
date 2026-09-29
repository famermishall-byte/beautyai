import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safe-next";

test("safeNextPath keeps an in-app path with its query", () => {
  assert.equal(safeNextPath("/admin/orders"), "/admin/orders");
  assert.equal(safeNextPath("/catalog?tab=search"), "/catalog?tab=search");
});

test("safeNextPath refuses anything that could leave the site", () => {
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "admin/orders", "javascript:alert(1)", ""]) {
    assert.equal(safeNextPath(bad), "/", bad);
  }
  assert.equal(safeNextPath(null), "/");
});

test("safeNextPath does not send the user back to the login page", () => {
  assert.equal(safeNextPath("/login"), "/");
  assert.equal(safeNextPath("/login?next=/admin"), "/");
});
