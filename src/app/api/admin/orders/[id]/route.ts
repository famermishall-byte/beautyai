import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { isOrderStatus, SALE_STATUSES } from "@/lib/orderStatus";

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
    const { data: before } = await supabase.from("orders").select("paid_at, shipped_at").eq("id", id).eq("store_id", profile.storeId).maybeSingle();
    const now = new Date().toISOString();
    const stamps: Record<string, string> = {};
    if (before) {
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
