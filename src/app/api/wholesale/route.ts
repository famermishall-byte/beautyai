import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { loadWholesaleSettings } from "@/lib/cart-server";
import { thresholdSom } from "@/lib/wholesale";

// Настройки опта магазина — для плашки на главной и админки. thresholdSom = null — опт не действует.
export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  const supabase = await createServerSupabaseClient();
  const settings = await loadWholesaleSettings(supabase, profile.storeId);
  return NextResponse.json({ settings, thresholdSom: thresholdSom(settings) });
}
