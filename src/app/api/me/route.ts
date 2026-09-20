import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  return NextResponse.json({
    email: profile.email,
    role: profile.role,
    storeId: profile.storeId,
    storeName: profile.storeName,
    storeSlug: profile.storeSlug,
    displayName: profile.displayName,
    skinType: profile.skinType,
    skinConcerns: profile.skinConcerns,
    age: profile.age,
    gender: profile.gender,
    hairType: profile.hairType,
    hairConcerns: profile.hairConcerns,
    avatarUrl: profile.avatarUrl,
  });
}
