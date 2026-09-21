import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { isOrderStatus } from "@/lib/orderStatus";

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
    let update = supabase.from("orders").update({ status }).eq("id", id).eq("store_id", profile.storeId);
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
