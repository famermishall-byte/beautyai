import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { parseWholesaleInput, thresholdSom } from "@/lib/wholesale";

// Владелец / админ выбирает способ опта, порог в $ и курс доллара (см. supabase/wholesale.sql).
// Проверка — parseWholesaleInput (lib/wholesale.ts, с тестами).
export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const parsed = parseWholesaleInput(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const settings = parsed.settings;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("stores")
    .update({
      wholesale_mode: settings.mode,
      wholesale_percent: settings.percent,
      wholesale_threshold_usd: settings.thresholdUsd,
      usd_rate: settings.usdRate,
    })
    .eq("id", profile.storeId);
  if (error) return NextResponse.json({ error: "Не удалось сохранить настройки опта." }, { status: 500 });

  return NextResponse.json({ ok: true, settings, thresholdSom: thresholdSom(settings) });
}
