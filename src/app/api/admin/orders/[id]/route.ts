import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { isOrderStatus, SALE_STATUSES } from "@/lib/orderStatus";
import { applyQuantities, orderTotal, validQuantities } from "@/lib/orderEdit";
import type { OrderItem } from "@/types";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStaff(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const status: string = body.status;

  if (!status || !isOrderStatus(status)) {
    return NextResponse.json({ error: "Некорректный статус заказа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    // Remember WHEN the order became a sale (paid) and when it went to the courier, for the sales totals.
    const { data: before } = await supabase.from("orders").select("paid_at, shipped_at, status_source").eq("id", id).eq("store_id", profile.storeId).maybeSingle();
    const now = new Date().toISOString();
    const stamps: Record<string, string> = {};
    if (before) {
      stamps.status_source = "admin";
      stamps.status_changed_at = now;
      if (SALE_STATUSES.includes(status) && !before.paid_at) stamps.paid_at = now;
      if (status === "shipped" && !before.shipped_at) stamps.shipped_at = now;
    }
    let update = supabase.from("orders").update({ status, ...stamps }).eq("id", id).eq("store_id", profile.storeId);
    if (profile.role === "branch_manager") {
      if (!profile.branchId) return NextResponse.json({ error: "Вам пока не назначен филиал." }, { status: 403 });
      update = update.eq("branch_id", profile.branchId);
    }
    const { data: order, error } = await update.select("*, branches(*)").single();

    if (error) throw error;

    return NextResponse.json({ ok: true, order: mapOrder(order) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить статус заказа." }, { status: 500 });
  }
}

// Reduce / remove lines of an order in the app ("нет в наличии" = 0). A branch manager may do it only until the
// order is paid; after that only the owner / admin. A removed line also sets that product's stock in the order's
// branch to 0, so nobody orders it again.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStaff(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const supabase = await createServerSupabaseClient();
    let read = supabase.from("orders").select("*, branches(*)").eq("id", id).eq("store_id", profile.storeId);
    if (profile.role === "branch_manager") {
      if (!profile.branchId) return NextResponse.json({ error: "Вам пока не назначен филиал." }, { status: 403 });
      read = read.eq("branch_id", profile.branchId);
    }
    const { data: order } = await read.maybeSingle();
    if (!order) return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });

    if (profile.role === "branch_manager" && order.status !== "sent" && order.status !== "confirmed") {
      return NextResponse.json({ error: "После оплаты состав заказа меняет только администратор." }, { status: 403 });
    }

    const items = order.items_json as OrderItem[];
    const quantities: unknown = body.quantities;
    if (!validQuantities(items, quantities)) {
      return NextResponse.json({ error: "Можно только уменьшить количество (0 — товара нет)." }, { status: 400 });
    }

    const next = applyQuantities(items, quantities);
    const anyLeft = quantities.some((q) => q > 0);
    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        items_json: next,
        total_price: orderTotal(next),
        original_total: order.original_total ?? order.total_price,
        edited_at: new Date().toISOString(),
        edited_by: "admin",
        ...(anyLeft ? {} : { status: "cancelled" }),
      })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*, branches(*)")
      .single();
    if (error) {
      return NextResponse.json({ error: "Не удалось изменить заказ. Возможно, владельцу нужно запустить SQL «order_edit» в Supabase." }, { status: 500 });
    }

    // What is now missing → stock 0 in this branch.
    const gone = items.filter((it, i) => quantities[i] === 0 && it.quantity > 0 && it.productId);
    if (gone.length > 0 && order.branch_id) {
      await supabase.from("product_branch_stock").upsert(
        gone.map((it) => ({ store_id: profile.storeId, product_id: it.productId, branch_id: order.branch_id, quantity: 0, updated_at: new Date().toISOString() })),
        { onConflict: "product_id,branch_id" }
      );
    }

    return NextResponse.json({ ok: true, order: mapOrder(updated) });
  } catch {
    return NextResponse.json({ error: "Не удалось изменить заказ." }, { status: 500 });
  }
}
