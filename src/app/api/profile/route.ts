import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { SKIN_TYPES, SKIN_CONCERNS } from "@/lib/skincare";
import { HAIR_TYPES, HAIR_CONCERNS } from "@/lib/haircare";
import { SUPABASE_URL } from "@/lib/supabase/config";

const VALID_SKIN_TYPES = new Set<string>(SKIN_TYPES.map((t) => t.value));
const VALID_CONCERNS = new Set<string>(SKIN_CONCERNS.map((c) => c.value));
const VALID_HAIR_TYPES = new Set<string>(HAIR_TYPES.map((t) => t.value));
const VALID_HAIR_CONCERNS = new Set<string>(HAIR_CONCERNS.map((c) => c.value));

// YYYY-MM-DD, a real calendar date, not in the future, not before 1900.
function isValidBirthDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  return d.getTime() <= Date.now() && d.getUTCFullYear() >= 1900;
}

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

  if ("birthDate" in body) {
    const birthDate = body.birthDate;
    if (birthDate !== null && !isValidBirthDate(birthDate)) {
      return NextResponse.json({ error: "Некорректная дата рождения." }, { status: 400 });
    }
    update.birth_date = birthDate;
  }

  if ("gender" in body) {
    const gender = body.gender;
    if (gender !== null && gender !== "female" && gender !== "male") {
      return NextResponse.json({ error: "Некорректный пол." }, { status: 400 });
    }
    update.gender = gender;
  }

  if ("hairType" in body) {
    const hairType = body.hairType;
    if (hairType !== null && !VALID_HAIR_TYPES.has(hairType)) {
      return NextResponse.json({ error: "Некорректный тип волос." }, { status: 400 });
    }
    update.hair_type = hairType;
  }

  if ("hairConcerns" in body) {
    const hairConcerns = body.hairConcerns;
    if (
      !Array.isArray(hairConcerns) ||
      !hairConcerns.every((c) => typeof c === "string" && VALID_HAIR_CONCERNS.has(c))
    ) {
      return NextResponse.json({ error: "Некорректный список проблем волос." }, { status: 400 });
    }
    update.hair_concerns = hairConcerns;
  }

  if ("avatarUrl" in body) {
    const avatarUrl = body.avatarUrl;
    // Only a file inside this user's own folder of the public avatars bucket.
    const allowedPrefix = `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.userId}/`;
    if (avatarUrl !== null && !(typeof avatarUrl === "string" && avatarUrl.startsWith(allowedPrefix))) {
      return NextResponse.json({ error: "Некорректное фото." }, { status: 400 });
    }
    update.avatar_url = avatarUrl;
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
