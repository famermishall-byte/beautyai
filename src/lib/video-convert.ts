// Конвертация видео в MP4 в браузере админа через ffmpeg.wasm.
// Пакеты @ffmpeg/* грузятся только динамически — в клиентские бандлы покупателей не попадают.
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { VIDEO_MAX_BYTES } from "./home-slides";
import { ffmpegArgs, parseDuration, posterArgs } from "./video-convert-plan";

export type ConvertStage = "preparing" | "converting" | "optimizing";
export class ConvertCancelled extends Error {}
export class ConvertTooBig extends Error {} // результат > VIDEO_MAX_BYTES
export class ConvertLoadFailed extends Error {} // FFmpeg не скачался

// однопоточное ядро: не требует COOP/COEP-заголовков. UMD, т.к. Turbopack запускает воркер
// @ffmpeg/ffmpeg как classic (убирает type:"module") и ядро грузится через importScripts.
const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
const OUTPUT = "output.mp4";
const POSTER = "poster.jpg";

export type ConvertResult = { file: File; poster: Blob | null };

// кэш экземпляра на время жизни вкладки
let cached: Promise<FFmpeg> | null = null;

async function loadFFmpeg(): Promise<FFmpeg> {
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ff = new FFmpeg();
  try {
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
  } catch (e) {
    ff.terminate();
    throw e;
  }
  return ff;
}

function getFFmpeg(): Promise<FFmpeg> {
  if (!cached) {
    cached = loadFFmpeg().catch((e: unknown) => {
      cached = null;
      throw new ConvertLoadFailed(e instanceof Error ? e.message : "FFmpeg не загрузился");
    });
  }
  return cached;
}

function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { base: name || "video", ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot + 1).toLowerCase() };
}

type ConvertOpts = { onStage: (s: ConvertStage) => void; onProgress: (p: number) => void; signal: AbortSignal };

// Очередь: вызовы выполняются строго по одному (общий экземпляр и фиксированные имена в FS).
let queue: Promise<void> = Promise.resolve();

// ждём своей очереди; отмена во время ожидания не трогает текущую конвертацию
function waitTurn(prev: Promise<void>, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => reject(new ConvertCancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    void prev.then(() => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) reject(new ConvertCancelled());
      else resolve();
    });
  });
}

export function convertToMp4(file: File, opts: ConvertOpts): Promise<ConvertResult> {
  if (opts.signal.aborted) return Promise.reject(new ConvertCancelled());
  const prev = queue;
  let release!: () => void;
  const mine = new Promise<void>((r) => { release = r; });
  queue = prev.then(() => mine);
  return waitTurn(prev, opts.signal)
    .then(() => runConvert(file, opts))
    .finally(() => release());
}

// сбросить экземпляр: следующий вызов (в т.ч. «Попробовать снова») начнёт со свежего FFmpeg
function dropInstance(ff: FFmpeg | null) {
  ff?.terminate();
  cached = null;
}

// хвост лога FFmpeg — в текст ошибки, чтобы по скриншоту было видно причину сбоя
function withLogTail(e: unknown, logs: string[]): Error {
  const msg = e instanceof Error ? e.message : String(e);
  const tail = logs.filter((l) => l.trim()).slice(-3).join(" | ");
  return new Error(tail ? `${msg} — ${tail}` : msg);
}

async function runConvert(file: File, opts: ConvertOpts): Promise<ConvertResult> {
  const { onStage, onProgress, signal } = opts;
  if (signal.aborted) throw new ConvertCancelled();

  const { base, ext } = splitName(file.name);
  const input = /^[a-z0-9]{1,8}$/.test(ext) ? `input.${ext}` : "input.mov";

  let ff: FFmpeg | null = null;
  let dead = false; // воркер убит — FS чистить не нужно
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => { logs.push(message); };
  const onProg = ({ progress }: { progress: number }) => {
    if (!Number.isFinite(progress) || progress < 0) return;
    onProgress(Math.min(1, progress));
  };
  // отмена: убиваем воркер, экземпляр больше не годится
  const onAbort = () => {
    dead = true;
    dropInstance(ff);
  };
  signal.addEventListener("abort", onAbort);

  try {
    onStage("preparing");
    ff = await getFFmpeg();
    if (signal.aborted) { onAbort(); throw new ConvertCancelled(); }

    await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));

    // пробный проход без выходного файла — код ≠ 0 ожидаем, нужен только лог с Duration
    ff.on("log", onLog);
    try {
      await ff.exec(["-i", input]);
    } finally {
      ff.off("log", onLog);
    }
    const duration = parseDuration(logs.join("\n"));

    onStage("converting");
    onProgress(0);
    logs.length = 0;
    ff.on("progress", onProg);
    ff.on("log", onLog);
    let code: number;
    try {
      code = await ff.exec(ffmpegArgs(input, OUTPUT, duration));
    } finally {
      ff.off("progress", onProg);
      ff.off("log", onLog);
    }
    if (code !== 0) throw new Error(`FFmpeg завершился с кодом ${code}`);

    onStage("optimizing");
    const data = await ff.readFile(OUTPUT);
    if (typeof data === "string") throw new Error("FFmpeg вернул текст вместо видео");
    if (data.byteLength > VIDEO_MAX_BYTES) throw new ConvertTooBig();
    const mp4 = new File([data as Uint8Array<ArrayBuffer>], `${base}.mp4`, { type: "video/mp4" });

    // обложку делает сам FFmpeg: в Safari на iPhone кадр из <video> снимается ненадёжно
    let poster: Blob | null = null;
    try {
      if ((await ff.exec(posterArgs(OUTPUT, POSTER))) === 0) {
        const jpg = await ff.readFile(POSTER);
        if (typeof jpg !== "string" && jpg.byteLength > 0) {
          poster = new Blob([jpg as Uint8Array<ArrayBuffer>], { type: "image/jpeg" });
        }
      }
    } catch {
      poster = null; // не критично — MediaPicker снимет обложку сам
    }
    return { file: mp4, poster };
  } catch (e) {
    if (signal.aborted) throw new ConvertCancelled();
    if (e instanceof ConvertTooBig || e instanceof ConvertLoadFailed) throw e;
    // сбой ffmpeg мог сломать рантайм wasm — не переиспользуем экземпляр
    dead = true;
    dropInstance(ff);
    throw withLogTail(e, logs);
  } finally {
    signal.removeEventListener("abort", onAbort);
    // чистим FS (после terminate воркера нет — ошибки игнорируем)
    if (ff && !dead) {
      await ff.deleteFile(input).catch(() => {});
      await ff.deleteFile(OUTPUT).catch(() => {});
      await ff.deleteFile(POSTER).catch(() => {});
    }
  }
}
