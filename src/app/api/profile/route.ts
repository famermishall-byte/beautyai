import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { SKIN_TYPES, SKIN_CONCERNS } from "@/lib/skincare";

const VALID_SKIN_TYPES = new Set<string>(SKIN_TYPES.map((t) => t.value));
const VALID_CONCERNS = new Set<string>(SKIN_CONCERNS.map((c) => c.value));

export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if ("displayName" in body) {
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    update.display_name = displayName || null;
  }

  if ("skinType" in body) {
    const skinType = body.skinType;
    if (skinType !== null && !VALID_SKIN_TYPES.has(skinType)) {
      return NextResponse.json({ error: "Некорректный тип кожи." }, { status: 400 });
    }
    update.skin_type = skinType;
  }

  if ("skinConcerns" in body) {
    const skinConcerns = body.skinConcerns;
    if (
      !Array.isArray(skinConcerns) ||
      !skinConcerns.every((c) => typeof c === "string" && VALID_CONCERNS.has(c))
    ) {
      return NextResponse.json({ error: "Некорректный список проблем кожи." }, { status: 400 });
    }
    update.skin_concerns = skinConcerns;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profiles").update(update).eq("id", profile.userId);

  if (error) {
    return NextResponse.json({ error: "Не удалось сохранить." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
