import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Courier link (/c/<courier_token>): one action — «Доставлен». The courier token is separate from the seller's, so the
// courier cannot change the order or cancel it (supabase/order_delivery.sql).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data, error } = await supabase.rpc("mark_delivered_by_courier_token", { p_token: token });
  if (error) {
    const text = error.code === "P0001" && error.message ? error.message : "Не удалось отметить доставку. Попробуйте ещё раз.";
    return NextResponse.json({ error: text }, { status: 400 });
  }
  return NextResponse.json({ order: data });
}
