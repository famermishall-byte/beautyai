import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncRowOutcome, SyncSummary } from "./sync";
import { summarizeSyncPlan } from "./sync";

/**
 * Executes a sync plan's create/update/branch-stock/review-queue writes.
 * Shared by the admin-triggered route (src/app/api/admin/import-templates/[id]/sync)
 * and the scheduled cron route (src/app/api/cron/sync-sources) — the only
 * difference between them is which Supabase client they pass in (a
 * user-session client for the former, a service-role client for the latter,
 * since a cron run has no logged-in admin for RLS to key off of).
 */
export async function executeSyncPlan(
  supabase: SupabaseClient,
  storeId: string,
  sourceId: string,
  plan: SyncRowOutcome[]
): Promise<SyncSummary> {
  const summary = summarizeSyncPlan(plan);
  const createRows = plan.filter((o) => o.kind === "create");
  const updateRows = plan.filter((o) => o.kind === "update");
  const reviewRows = plan.filter((o) => o.kind === "review");

  const stockWrites: { productId: string; branchId: string; quantity: number }[] = [];

  if (createRows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("products")
      .insert(
        createRows.map((c) => ({
          store_id: storeId,
          sku: c.product.sku,
          barcode: c.product.barcode,
          external_id: c.product.externalId,
          name: c.product.name,
          brand: c.product.brand,
          category: c.product.category,
          price: c.product.price,
          description: c.product.description || null,
          characteristics: c.product.characteristics || null,
          purpose: c.product.purpose || null,
          image_url: c.product.imageUrl || null,
          in_stock: c.stocks.length > 0 ? c.stocks.some((s) => s.quantity > 0) : true,
        }))
      )
      .select("id, sku");
    if (insertError) throw insertError;

    const idBySku = new Map((inserted ?? []).map((p) => [p.sku as string, p.id as string]));
    for (const c of createRows) {
      const productId = idBySku.get(c.product.sku);
      if (!productId) continue;
      for (const stock of c.stocks) {
        stockWrites.push({ productId, branchId: stock.branchId, quantity: stock.quantity });
      }
    }
  }

  for (const u of updateRows) {
    const changes: Record<string, unknown> = {};
    if (u.changes.price !== undefined) changes.price = u.changes.price;
    if (u.changes.brand !== undefined) changes.brand = u.changes.brand;
    if (u.changes.category !== undefined) changes.category = u.changes.category;
    if (u.changes.description !== undefined) changes.description = u.changes.description;
    if (u.changes.characteristics !== undefined) changes.characteristics = u.changes.characteristics;
    if (u.changes.purpose !== undefined) changes.purpose = u.changes.purpose;
    if (u.changes.imageUrl !== undefined) changes.image_url = u.changes.imageUrl;
    if (u.changes.barcode !== undefined) changes.barcode = u.changes.barcode;
    if (u.changes.externalId !== undefined) changes.external_id = u.changes.externalId;

    if (Object.keys(changes).length > 0) {
      await supabase.from("products").update(changes).eq("id", u.productId).eq("store_id", storeId);
    }
    if (u.branchId && u.quantity !== null) {
      stockWrites.push({ productId: u.productId, branchId: u.branchId, quantity: u.quantity });
    }
  }

  if (stockWrites.length > 0) {
    await supabase.from("product_branch_stock").upsert(
      stockWrites.map((w) => ({
        store_id: storeId,
        product_id: w.productId,
        branch_id: w.branchId,
        quantity: w.quantity,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "product_id,branch_id" }
    );

    const touchedProductIds = [...new Set(stockWrites.map((w) => w.productId))];
    const { data: stockRows } = await supabase
      .from("product_branch_stock")
      .select("product_id, quantity")
      .in("product_id", touchedProductIds);

    const anyInStock = new Map<string, boolean>();
    for (const row of stockRows ?? []) {
      const pid = row.product_id as string;
      anyInStock.set(pid, (anyInStock.get(pid) ?? false) || (row.quantity as number) > 0);
    }
    await Promise.all(
      touchedProductIds.map((pid) =>
        supabase
          .from("products")
          .update({ in_stock: anyInStock.get(pid) ?? false })
          .eq("id", pid)
          .eq("store_id", storeId)
      )
    );
  }

  if (reviewRows.length > 0) {
    await supabase.from("import_review_items").insert(
      reviewRows.map((r) => ({
        store_id: storeId,
        source_id: sourceId,
        raw_row: r.rawRow,
        reason: r.reason,
        status: "pending",
      }))
    );
  }

  await supabase
    .from("import_templates")
    .update({ last_synced_at: new Date().toISOString(), last_sync_summary: summary })
    .eq("id", sourceId)
    .eq("store_id", storeId);

  return summary;
}
