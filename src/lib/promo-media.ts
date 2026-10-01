// Только для браузера: canvas, <video>, загрузка в Supabase Storage.
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Размер обложки баннера/слайда: 16:11, как HeroSlider.
export const COVER_W = 960;
export const COVER_H = 660;

const POSTER_TIMEOUT_MS = 15000;

// Обрезка «cover» до 960×660 и JPEG. w/h — исходные размеры source.
export function toCoverJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const srcRatio = w / h;
  const dstRatio = COVER_W / COVER_H;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (srcRatio > dstRatio) {
    sw = h * dstRatio;
    sx = (w - sw) / 2;
  } else {
    sh = w / dstRatio;
    sy = (h - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas"));
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85));
}

// Фото → JPEG 960×660.
export async function photoToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    return await toCoverJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

// Первый кадр видео → JPEG-обложка. Если браузер не может открыть видео — Error("unplayable").
// iOS Safari: не грузит кадры (loadeddata не приходит) у видео вне страницы и без play(),
// поэтому видео кладём в DOM невидимым, шагаем по loadedmetadata, а если кадр не пришёл — play() без звука.
export function videoPoster(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    let seeking = false;
    let nudge: ReturnType<typeof setTimeout> | null = null;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (nudge) clearTimeout(nudge);
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("unplayable"))), POSTER_TIMEOUT_MS);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.preload = "auto";
    video.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
    const seek = () => {
      if (seeking || done) return;
      seeking = true;
      video.currentTime = Math.min(0.1, (video.duration || 0.2) / 2);
      // кадр так и не декодировался (iOS) — запускаем воспроизведение без звука
      nudge = setTimeout(() => {
        if (!done) video.play().then(() => video.pause(), () => {});
      }, 2000);
    };
    video.addEventListener("loadedmetadata", seek);
    video.addEventListener("loadeddata", seek);
    let capturing = false;
    // снимаем кадр, когда он реально декодирован (после seeked или первого timeupdate от play)
    const capture = () => {
      if (capturing || done || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (!video.videoWidth || !video.videoHeight) {
        finish(() => reject(new Error("unplayable")));
        return;
      }
      capturing = true;
      toCoverJpeg(video, video.videoWidth, video.videoHeight).then(
        (blob) => finish(() => resolve(blob)),
        () => finish(() => reject(new Error("unplayable")))
      );
    };
    video.addEventListener("seeked", capture);
    video.addEventListener("timeupdate", () => {
      if (seeking) capture();
    });
    video.addEventListener("error", () => finish(() => reject(new Error("unplayable"))));
    document.body.appendChild(video);
    video.src = url;
    video.load();
  });
}

// Расширение файла для видео по MIME-типу.
export function videoExt(type: string): string {
  if (type === "video/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  return "mp4";
}

// Загрузка в бакет banners, папка {storeId}/ (так требует политика). Возвращает публичный URL.
export async function uploadPromoFile(blob: Blob, ext: string, contentType: string): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).single();
  const storeId = profile?.store_id as string | undefined;
  if (!storeId) throw new Error("store");
  const path = `${storeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("banners").upload(path, blob, { upsert: true, contentType, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("banners").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
