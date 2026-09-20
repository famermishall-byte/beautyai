import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { buildFeedbackMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const message: string = (body.message ?? "").trim();
  const branchId: string | undefined = body.branchId;

  if (!message) {
    return NextResponse.json({ error: "Напишите сообщение." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Any branch works for the WhatsApp destination — feedback isn't tied to
    // a specific store location, we just need *a* number to send it to.
    // Prefer the branch the customer has picked in the catalog, if given.
    let branchQuery = supabase.from("branches").select("*").eq("store_id", profile.storeId);
    branchQuery = branchId ? branchQuery.eq("id", branchId) : branchQuery.order("created_at", { ascending: true });
    const { data: branch } = await branchQuery.limit(1).maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Не удалось найти филиал для связи." }, { status: 404 });
    }

    const { error } = await supabase.from("feedback").insert({
      store_id: profile.storeId,
      user_id: profile.userId,
      message,
    });
    if (error) throw error;

    const whatsappMessage = buildFeedbackMessage({
      message,
      customerName: profile.displayName ?? profile.email ?? "Клиент",
      storeName: profile.storeName,
    });
    const whatsappUrl = buildWhatsAppUrl(branch.whatsapp, whatsappMessage);

    return NextResponse.json({ ok: true, whatsappUrl });
  } catch {
    return NextResponse.json({ error: "Не удалось отправить сообщение — база данных недоступна." }, { status: 500 });
  }
}
