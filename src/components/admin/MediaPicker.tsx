"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ImageOff, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { photoToJpeg, uploadPromoFile, videoExt, videoPoster, videoPosterInfo } from "@/lib/promo-media";
import { classifyVideo, SOURCE_MAX_BYTES, type VideoDecision } from "@/lib/video-convert-plan";
import type { ConvertStage } from "@/lib/video-convert";

export type MediaValue = { mediaType: "image" | "video"; imageUrl: string | null; videoUrl: string | null };

type ErrorKey = "photoType" | "tooBig" | "load" | "convert" | "convertTooBig" | "upload";
type ConvertReason = Exclude<VideoDecision, "upload" | "compress" | "too-big">;
// «Попробовать снова»: с конвертации или (обычный MP4) сразу с загрузки
type Retry = { step: "convert"; file: File } | { step: "upload"; file: File; poster: Blob };

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "confirm"; file: File; reason: ConvertReason }
  | { kind: "convert"; stage: ConvertStage; progress: number }
  | { kind: "uploading" }
  | { kind: "done" }
  | { kind: "error"; error: ErrorKey; retry: Retry | null; detail?: string | null };

const CONFIRM_TEXT: Record<ConvertReason, "confirm.format" | "confirm.size" | "confirm.unplayable"> = {
  "convert-format": "confirm.format",
  "convert-size": "confirm.size",
  "convert-unplayable": "confirm.unplayable",
};

const DONE_MS = 3000;

const uploadClass =
  "inline-flex h-10 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-strong transition cursor-pointer hover:bg-accent hover:text-white focus-within:ring-2 focus-within:ring-accent";

/** Фото или видео для промо-слайда/баннера: загрузка в Storage, обложка видео — первый кадр.
 *  Не-MP4 и «проблемные» MP4 можно конвертировать в браузере (ffmpeg.wasm) перед загрузкой;
 *  тяжёлый MP4 сжимается под телефон сам, а если сжать не вышло — загружается как есть. */
export function MediaPicker({
  mediaType,
  imageUrl,
  videoUrl,
  onChange,
  onBusyChange,
}: MediaValue & { onChange: (v: MediaValue) => void; onBusyChange?: (busy: boolean) => void }) {
  const t = useTranslations("homeSlides.media");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // номер текущего запуска: результаты отменённых/устаревших запусков игнорируем
  const runRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // уход со страницы посреди обработки — останавливаем FFmpeg и таймер
  useEffect(() => {
    const run = runRef;
    const abort = abortRef;
    const timer = doneTimer;
    return () => {
      run.current++;
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const busy = phase.kind === "checking" || phase.kind === "convert" || phase.kind === "uploading";

  // форма блокирует «Сохранить», пока файл проверяется, конвертируется или загружается
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  function newRun(): number {
    if (doneTimer.current) {
      clearTimeout(doneTimer.current);
      doneTimer.current = null;
    }
    return ++runRef.current;
  }

  function switchType(next: "image" | "video") {
    if (next === mediaType || busy) return;
    newRun();
    setPhase({ kind: "idle" });
    // Обложка видео не подходит как фото — начинаем с чистого листа.
    onChange({ mediaType: next, imageUrl: null, videoUrl: null });
  }

  async function handlePhoto(file: File) {
    newRun();
    if (!file.type.startsWith("image/")) {
      setPhase({ kind: "error", error: "photoType", retry: null });
      return;
    }
    setPhase({ kind: "uploading" });
    try {
      const url = await uploadPromoFile(await photoToJpeg(file), "jpg", "image/jpeg");
      onChange({ mediaType: "image", imageUrl: url, videoUrl: null });
      setPhase({ kind: "idle" });
    } catch {
      setPhase({ kind: "error", error: "upload", retry: null });
    }
  }

  // обложка + видео в Storage → форма; бросает при ошибке загрузки
  async function uploadVideo(run: number, file: File, poster: Blob, ext: string) {
    setPhase({ kind: "uploading" });
    const posterUrl = await uploadPromoFile(poster, "jpg", "image/jpeg");
    const url = await uploadPromoFile(file, ext, file.type);
    if (run !== runRef.current) return;
    onChange({ mediaType: "video", imageUrl: posterUrl, videoUrl: url });
    setPhase({ kind: "done" });
    doneTimer.current = setTimeout(() => {
      doneTimer.current = null;
      setPhase((p) => (p.kind === "done" ? { kind: "idle" } : p));
    }, DONE_MS);
  }

  // обычный MP4 — как раньше, без конвертации
  async function uploadOriginal(file: File, poster: Blob) {
    const run = newRun();
    try {
      await uploadVideo(run, file, poster, videoExt(file.type));
    } catch {
      if (run === runRef.current) setPhase({ kind: "error", error: "upload", retry: { step: "upload", file, poster } });
    }
  }

  async function handleVideo(file: File) {
    const run = newRun();
    if (file.size > SOURCE_MAX_BYTES) {
      setPhase({ kind: "error", error: "tooBig", retry: null });
      return;
    }
    setPhase({ kind: "checking" });
    // открылось ли видео в браузере: обложка снялась — значит, играет
    let poster: Blob | null = null;
    let durationSec: number | null = null;
    try {
      ({ poster, durationSec } = await videoPosterInfo(file));
    } catch {
      poster = null;
    }
    if (run !== runRef.current) return;
    const decision = classifyVideo(file, poster !== null, durationSec);
    if (decision === "too-big") {
      setPhase({ kind: "error", error: "tooBig", retry: null });
    } else if (decision === "upload") {
      if (poster) void uploadOriginal(file, poster);
    } else if (decision === "compress") {
      if (poster) void convert(file, poster);
    } else {
      setPhase({ kind: "confirm", file, reason: decision });
    }
  }

  // originalPoster задан — это сжатие исправного MP4: при любой неудаче загружаем исходный файл
  async function convert(file: File, originalPoster?: Blob) {
    const run = newRun();
    const ac = new AbortController();
    abortRef.current = ac;
    const current = () => run === runRef.current && !ac.signal.aborted;
    setPhase({ kind: "convert", stage: "preparing", progress: 0 });
    let vc: typeof import("@/lib/video-convert") | null = null;
    let mp4: File;
    let poster: Blob;
    try {
      // модуль с ffmpeg грузим только по согласию админа
      vc = await import("@/lib/video-convert");
      const result = await vc.convertToMp4(file, {
        signal: ac.signal,
        onStage: (stage) => {
          if (current()) setPhase({ kind: "convert", stage, progress: 0 });
        },
        onProgress: (progress) => {
          if (current()) setPhase((p) => (p.kind === "convert" ? { ...p, progress } : p));
        },
      });
      mp4 = result.file;
      // обложку обычно делает FFmpeg; запасной путь — кадр из <video>
      poster = result.poster ?? (await videoPoster(mp4));
    } catch (e) {
      if (!current() || (vc && e instanceof vc.ConvertCancelled)) return;
      if (originalPoster) {
        void uploadOriginal(file, originalPoster);
        return;
      }
      // модуль не скачался (нет сети) — та же ошибка, что и для FFmpeg
      const error: ErrorKey =
        !vc || e instanceof vc.ConvertLoadFailed ? "load" : e instanceof vc.ConvertTooBig ? "convertTooBig" : "convert";
      const detail = e instanceof Error ? e.message.slice(0, 300) : null;
      setPhase({ kind: "error", error, retry: { step: "convert", file }, detail });
      return;
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
    if (!current()) return;
    // сжатие не уменьшило файл — оставляем исходный
    if (originalPoster && mp4.size >= file.size) {
      void uploadOriginal(file, originalPoster);
      return;
    }
    try {
      await uploadVideo(run, mp4, poster, "mp4");
    } catch {
      if (run === runRef.current) setPhase({ kind: "error", error: "upload", retry: { step: "convert", file } });
    }
  }

  // «Отменить»: останавливаем FFmpeg и сразу возвращаемся в исходное состояние
  function cancelConvert() {
    newRun();
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({ kind: "idle" });
  }

  function retry(r: Retry) {
    if (r.step === "upload") void uploadOriginal(r.file, r.poster);
    else void convert(r.file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать снова
    if (!file) return;
    if (mediaType === "video") void handleVideo(file);
    else void handlePhoto(file);
  }

  const hasMedia = mediaType === "video" ? !!videoUrl : !!imageUrl;
  const buttonLabel = mediaType === "video" ? (hasMedia ? t("changeVideo") : t("addVideo")) : hasMedia ? t("changePhoto") : t("addPhoto");

  let status: string | null = null;
  if (mediaType === "video") {
    if (phase.kind === "checking") status = t("status.checking");
    else if (phase.kind === "uploading") status = t("uploading");
    else if (phase.kind === "done") status = t("status.done");
    else if (phase.kind === "convert") {
      status =
        phase.stage === "converting"
          ? t("status.converting", { percent: Math.round(phase.progress * 100) })
          : t(phase.stage === "preparing" ? "status.preparing" : "status.optimizing");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex gap-2 min-w-0 disabled:opacity-50" aria-label={t("typeLabel")} disabled={busy}>
        <Chip label={t("photo")} active={mediaType === "image"} onClick={() => switchType("image")} />
        <Chip label={t("video")} active={mediaType === "video"} onClick={() => switchType("video")} />
      </fieldset>

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
        {mediaType === "image" && phase.kind === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-card/80 text-sm text-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("uploading")}
          </div>
        )}
      </div>

      <div>
        <label className={`${uploadClass} ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <Upload className="size-4" strokeWidth={2} aria-hidden />
          {buttonLabel}
          <input
            type="file"
            accept={mediaType === "video" ? "video/*" : "image/*"}
            className="sr-only"
            disabled={busy}
            onChange={handleFile}
          />
        </label>
        {mediaType === "video" && <p className="text-xs text-muted mt-1.5">{t("hint")}</p>}

        {/* статус обработки видео; регион живёт всегда, чтобы экранные дикторы озвучивали смену текста */}
        <div className={status ? "mt-2 flex items-center gap-2" : ""}>
          <p aria-live="polite" className="flex-1 min-w-0 flex items-center gap-2 text-sm text-foreground">
            {status && (
              <>
                {phase.kind === "done" ? (
                  <Check className="size-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Loader2 className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
                )}
                <span className={phase.kind === "done" ? "text-success font-medium" : ""}>{status}</span>
              </>
            )}
          </p>
          {mediaType === "video" && phase.kind === "convert" && (
            <Button type="button" variant="ghost" size="sm" className="shrink-0 h-10!" onClick={cancelConvert}>
              {t("cancelConvert")}
            </Button>
          )}
        </div>
      </div>

      {phase.kind === "confirm" && (
        <div className="rounded-[var(--radius-control)] border border-border-strong bg-card p-3.5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t(CONFIRM_TEXT[phase.reason])}</p>
            <p className="text-xs text-muted mt-1">{t("confirm.phoneHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setPhase({ kind: "idle" })}>
              {t("confirm.cancel")}
            </Button>
            <Button type="button" className="flex-1" onClick={() => void convert(phase.file)}>
              {t("confirm.yes")}
            </Button>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div role="alert" className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-3 py-2 flex flex-col gap-2">
          <p>{t(`errors.${phase.error}`)}</p>
          {/* техническая причина — чтобы по скриншоту понять, что сломалось */}
          {phase.detail && <p className="text-xs opacity-75 break-words">{phase.detail}</p>}
          {phase.retry && (
            <div>
              <Button type="button" variant="secondary" size="sm" className="h-10!" onClick={() => phase.retry && retry(phase.retry)}>
                {t("retry")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
