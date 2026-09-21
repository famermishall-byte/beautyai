import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// The seller's one-link console (/o/<token>): change the quantities of an order or set its status.
// The secret token in the link is the authorization (same idea as the older one-tap links); the rules —
// reduce only, locked after payment, branch stock set to 0 for what is missing — live in the SQL
// functions (supabase/order_edit.sql, supabase/order_payments.sql), not here.

type RpcError = { code?: string; message?: string };

function explain(error: RpcError): string {
  if (error.code === "PGRST202" || error.code === "42883") return "Обновление ещё не подключено: владельцу нужно запустить SQL «order_edit» в Supabase.";
  if (error.code === "P0001" && error.message) return error.message;
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

const SELLER_STATUSES = new Set(["confirmed", "paid", "cancelled"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action === "edit") {
    const { data, error } = await supabase.rpc("edit_order_by_token", { p_token: token, p_quantities: body.quantities });
    if (error) return NextResponse.json({ error: explain(error) }, { status: 400 });
    return NextResponse.json({ order: data });
  }

  if (body.action === "status") {
    const status = String(body.status ?? "");
    if (!SELLER_STATUSES.has(status)) return NextResponse.json({ error: "Недопустимый статус." }, { status: 400 });
    const { error } = await supabase.rpc("set_order_status_by_token", { p_token: token, p_status: status });
    if (error) return NextResponse.json({ error: explain(error) }, { status: 400 });
    const { data } = await supabase.rpc("get_order_by_token", { p_token: token });
    return NextResponse.json({ order: data });
  }

  return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
}
