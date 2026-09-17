import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { isOrderStatus } from "@/lib/orderStatus";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
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
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*, branches(*)")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, order: mapOrder(order) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить статус заказа." }, { status: 500 });
  }
}
