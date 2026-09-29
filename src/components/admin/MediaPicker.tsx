"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { checkVideoFile, VIDEO_TYPES } from "@/lib/home-slides";
import { photoToJpeg, uploadPromoFile, videoExt, videoPoster } from "@/lib/promo-media";

export type MediaValue = { mediaType: "image" | "video"; imageUrl: string | null; videoUrl: string | null };

type ErrorKey = "photoType" | "type" | "size" | "unplayable" | "upload";

const uploadClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-strong transition cursor-pointer hover:bg-accent hover:text-white focus-within:ring-2 focus-within:ring-accent";

/** Фото или видео для промо-слайда/баннера: загрузка в Storage, обложка видео — первый кадр. */
export function MediaPicker({ mediaType, imageUrl, videoUrl, onChange }: MediaValue & { onChange: (v: MediaValue) => void }) {
  const t = useTranslations("homeSlides.media");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  function switchType(next: "image" | "video") {
    if (next === mediaType) return;
    setError(null);
    // Обложка видео не подходит как фото — начинаем с чистого листа.
    onChange({ mediaType: next, imageUrl: null, videoUrl: null });
  }

  async function handlePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("photoType");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPromoFile(await photoToJpeg(file), "jpg", "image/jpeg");
      onChange({ mediaType: "image", imageUrl: url, videoUrl: null });
    } catch {
      setError("upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideo(file: File) {
    const check = checkVideoFile(file);
    if (check !== "ok") {
      setError(check);
      return;
    }
    setUploading(true);
    setError(null);
    let poster: Blob;
    try {
      poster = await videoPoster(file);
    } catch {
      setError("unplayable");
      setUploading(false);
      return;
    }
    try {
      const posterUrl = await uploadPromoFile(poster, "jpg", "image/jpeg");
      const url = await uploadPromoFile(file, videoExt(file.type), file.type);
      onChange({ mediaType: "video", imageUrl: posterUrl, videoUrl: url });
    } catch {
      setError("upload");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать снова
    if (!file) return;
    if (mediaType === "video") handleVideo(file);
    else handlePhoto(file);
  }

  const hasMedia = mediaType === "video" ? !!videoUrl : !!imageUrl;
  const buttonLabel = mediaType === "video" ? (hasMedia ? t("changeVideo") : t("addVideo")) : hasMedia ? t("changePhoto") : t("addPhoto");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2" role="group" aria-label={t("typeLabel")}>
        <Chip label={t("photo")} active={mediaType === "image"} onClick={() => switchType("image")} />
        <Chip label={t("video")} active={mediaType === "video"} onClick={() => switchType("video")} />
      </div>

      <div className="relative rounded-xl overflow-hidden aspect-[16/11] bg-accent-soft">
        {mediaType === "video" && videoUrl ? (
          <video src={videoUrl} poster={imageUrl ?? undefined} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : mediaType === "image" && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <ImageOff className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-card/80 text-sm text-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("uploading")}
          </div>
        )}
      </div>

      <div>
        <label className={`${uploadClass} ${uploading ? "pointer-events-none opacity-50" : ""}`}>
          <Upload className="size-4" strokeWidth={2} aria-hidden />
          {buttonLabel}
          <input
            type="file"
            accept={mediaType === "video" ? VIDEO_TYPES.join(",") : "image/*"}
            className="sr-only"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {mediaType === "video" && <p className="text-xs text-muted mt-1.5">{t("hint")}</p>}
      </div>

      {error && (
        <p role="alert" className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-3 py-2">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
