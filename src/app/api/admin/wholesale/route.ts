import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { thresholdSom, type WholesaleMode, type WholesaleSettings } from "@/lib/wholesale";

const MODES: WholesaleMode[] = ["off", "percent", "per_product"];

function positive(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Владелец / админ выбирает способ опта, порог в $ и курс доллара (см. supabase/wholesale.sql).
export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const mode = body.mode as WholesaleMode;
  if (!MODES.includes(mode)) return NextResponse.json({ error: "Неизвестный способ расчёта опта." }, { status: 400 });

  const thresholdUsd = positive(body.thresholdUsd);
  if (!thresholdUsd) return NextResponse.json({ error: "Укажите порог опта в долларах (больше нуля)." }, { status: 400 });

  const usdRate = positive(body.usdRate);
  if (mode !== "off" && !usdRate) return NextResponse.json({ error: "Укажите курс доллара." }, { status: 400 });

  const percent = positive(body.percent);
  if (mode === "percent" && !(percent && percent < 100)) {
    return NextResponse.json({ error: "Укажите процент скидки от 1 до 99." }, { status: 400 });
  }

  const settings: WholesaleSettings = { mode, percent: percent && percent < 100 ? percent : null, thresholdUsd, usdRate };
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
