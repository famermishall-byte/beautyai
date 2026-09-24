"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, User } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const SIZE = 320;

// Crop to a centred square and shrink, so a multi-megabyte phone photo
// becomes a ~30 KB avatar before it is uploaded.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85)
  );
}

export function AvatarUploader({
  avatarUrl,
  initial,
  onChanged,
}: {
  avatarUrl: string | null;
  initial: string;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("avatar");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAvatarUrl(url: string | null) {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    });
    if (!res.ok) throw new Error("save");
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("choosePhoto"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth");

      const blob = await toSquareJpeg(file);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await saveAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      await onChanged();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      await saveAvatarUrl(null);
      await onChanged();
    } catch {
      setError(t("deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-accent-soft text-accent flex items-center justify-center overflow-hidden ring-4 ring-card shadow-card">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={t("yourPhoto")} className="w-full h-full object-cover" />
          ) : initial ? (
            <span className="font-display text-4xl">{initial}</span>
          ) : (
            <User className="size-10" strokeWidth={1.5} aria-hidden />
          )}
          {busy && (
            <div className="absolute inset-0 bg-card/70 flex items-center justify-center rounded-full">
              <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={avatarUrl ? t("changePhoto") : t("addPhoto")}
          className="absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center shadow-float transition hover:bg-accent-strong active:scale-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Camera className="size-4.5" strokeWidth={2} aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {avatarUrl && !busy && (
        <button type="button" onClick={handleRemove} className="mt-2.5 text-xs text-muted hover:text-error transition focus-ring">
          {t("deletePhoto")}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-error text-center">{error}</p>}
    </div>
  );
}
