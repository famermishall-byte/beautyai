// Чистая логика решений и параметров конвертации видео (без DOM и ffmpeg).
import { VIDEO_MAX_BYTES } from "./home-slides";

export const SOURCE_MAX_BYTES = 209715200; // 200 МБ — предел исходника
export const TARGET_BYTES = 28 * 1024 * 1024; // бюджет результата (< 30 МБ)

export type VideoDecision = "upload" | "convert-format" | "convert-size" | "convert-unplayable" | "too-big";

// playable: удалось ли браузеру открыть файл (снять обложку)
export function classifyVideo(f: { type: string; size: number }, playable: boolean): VideoDecision {
  if (f.size > SOURCE_MAX_BYTES) return "too-big";
  if (f.type !== "video/mp4") return "convert-format";
  if (f.size > VIDEO_MAX_BYTES) return "convert-size";
  if (!playable) return "convert-unplayable";
  return "upload";
}

export function targetBitrates(durationSec: number | null): { videoKbps: number; audioKbps: 128 } {
  if (durationSec == null || !(durationSec > 0)) return { videoKbps: 1500, audioKbps: 128 };
  const v = Math.floor((TARGET_BYTES * 8) / 1000 / durationSec) - 128;
  return { videoKbps: Math.min(2500, Math.max(400, v)), audioKbps: 128 };
}

// "Duration: 00:01:02.50" → 62.5; "N/A" → null
export function parseDuration(log: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// обложка 960×660 («cover», как toCoverJpeg) из кадра на 0.1 с
export function posterArgs(input: string, output: string): string[] {
  return [
    "-ss", "0.1", "-i", input,
    "-frames:v", "1",
    "-vf", "scale=960:660:force_original_aspect_ratio=increase,crop=960:660",
    "-q:v", "4",
    output,
  ];
}

export function ffmpegArgs(input: string, output: string, durationSec: number | null): string[] {
  const v = targetBitrates(durationSec).videoKbps;
  return [
    "-i", input,
    // короткая сторона ≤ 720, без увеличения, чётные размеры
    "-vf", "scale='if(gt(iw,ih),-2,trunc(min(720,iw)/2)*2)':'if(gt(iw,ih),trunc(min(720,ih)/2)*2,-2)'",
    // не дублировать кадры у VFR-исходников (webm из MediaRecorder, таймбейз 1k)
    "-fps_mode", "vfr",
    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-b:v", `${v}k`, "-maxrate", `${v}k`, "-bufsize", `${v * 2}k`,
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    output,
  ];
}
