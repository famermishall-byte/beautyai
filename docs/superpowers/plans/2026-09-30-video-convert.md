# Конвертация видео в MP4 в админке — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** админ выбирает любое видео; не-MP4 / «особый» MP4 по согласию конвертируется в браузере (ffmpeg.wasm) в
оптимизированный MP4 ≤ 30 МБ и загружается автоматически.

**Architecture:** чистая логика решений и параметров — `src/lib/video-convert-plan.ts` (тесты node:test); браузерный
сервис FFmpeg — `src/lib/video-convert.ts` (динамический импорт); UI — только общий `MediaPicker`.

**Tech Stack:** Next.js 16, next-intl (ru+ky), @ffmpeg/ffmpeg 0.12.15, @ffmpeg/util 0.12.2, ядро @ffmpeg/core 0.12.10 (CDN jsDelivr), tsx --test.

**Spec:** `docs/superpowers/specs/2026-09-30-video-convert-design.md`

## Global Constraints
- Меняется только загрузка видео в админке (`MediaPicker` + новые lib-файлы + зависимости + тексты). Клиентская часть,
  база, хранилище, API, права — без изменений.
- Исходник до 200 МБ (209715200 байт); результат ≤ 30 МБ (`VIDEO_MAX_BYTES` из `src/lib/home-slides.ts`, 31457280).
- Бюджет результата 28 МБ; видео ≤ 2500 и ≥ 400 кбит/с; звук AAC 128 кбит/с; короткая сторона ≤ 720 (без увеличения,
  чётные размеры); `libx264 -preset veryfast -pix_fmt yuv420p -movflags +faststart`.
- FFmpeg загружается только после «Да, конвертировать» (динамический `import()`), ядро с `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd`.
- Тексты — дословно из спеки, в ru и ky.

## Review Focus
- Обычный MP4 ≤ 30 МБ, который открывается, — путь загрузки байт-в-байт прежний (без диалога) → тест `classifyVideo`.
- Видео без звука не должно падать → аргументы не требуют аудиодорожки (без `-map 0:a`) → тест `ffmpegArgs`.
- Очень короткий ролик (1–2 с) → битрейт не выше потолка 2500 → тест `targetBitrates`.
- «Отменить» во время конвертации: состояние сбрасывается, следующий запуск работает (новый экземпляр) → ручная проверка.
- Длительность не определилась → безопасный битрейт по умолчанию (1500 кбит/с) → тест `targetBitrates(null)`.

---

### Task 1: Логика решений и параметров (+ тесты) и зависимости

**Files:** Create `src/lib/video-convert-plan.ts`, `src/lib/video-convert-plan.test.ts`; Modify `package.json` (test script; `npm install @ffmpeg/ffmpeg@0.12.15 @ffmpeg/util@0.12.2`).

```ts
export const SOURCE_MAX_BYTES = 209715200;
export const TARGET_BYTES = 28 * 1024 * 1024;
export type VideoDecision = "upload" | "convert-format" | "convert-size" | "convert-unplayable" | "too-big";
// playable: удалось ли браузеру открыть файл (снять обложку)
export function classifyVideo(f: { type: string; size: number }, playable: boolean): VideoDecision;
//  size > SOURCE_MAX_BYTES → too-big; type !== "video/mp4" → convert-format; size > VIDEO_MAX_BYTES → convert-size;
//  !playable → convert-unplayable; иначе upload
export function targetBitrates(durationSec: number | null): { videoKbps: number; audioKbps: 128 };
//  null/≤0 → 1500; иначе floor(TARGET_BYTES*8/1000/duration) - 128, зажать в [400, 2500]
export function parseDuration(log: string): number | null; // "Duration: 00:01:02.50" → 62.5; "N/A" → null
export function ffmpegArgs(input: string, output: string, durationSec: number | null): string[];
//  ["-i", input, "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
//   "-c:v","libx264","-preset","veryfast","-profile:v","high","-pix_fmt","yuv420p",
//   "-b:v",`${v}k`,"-maxrate",`${v}k`,"-bufsize",`${v*2}k`,"-c:a","aac","-b:a","128k","-movflags","+faststart", output]
```
- [ ] Тесты: classifyVideo для всех 5 исходов (+ граница 200 МБ ровно → не too-big, mp4 30 МБ ровно → upload);
  targetBitrates(null)=1500, (1)=2500, (600)=400, (60) между; parseDuration; ffmpegArgs содержит +faststart, libx264,
  aac, битрейт, нет `-map`.
- [ ] RED → GREEN; npm test, tsc, eslint. Commit.

### Task 2: Браузерный сервис FFmpeg

**Files:** Create `src/lib/video-convert.ts`.
```ts
export type ConvertStage = "preparing" | "converting" | "optimizing";
export class ConvertCancelled extends Error {}
export class ConvertTooBig extends Error {}   // результат > VIDEO_MAX_BYTES
export class ConvertLoadFailed extends Error {} // FFmpeg не скачался
export function convertToMp4(file: File, opts: { onStage: (s: ConvertStage) => void; onProgress: (p: number) => void; signal: AbortSignal }): Promise<File>;
```
- [ ] Динамический `import("@ffmpeg/ffmpeg")` / `@ffmpeg/util`; модульный кэш экземпляра; load через `toBlobURL`
  (core js + wasm); `preparing` → writeFile(input с расширением исходника) → первый проход `exec(["-i", in])` с
  логом → `parseDuration` → `converting` + progress (0..1, зажать) → `exec(ffmpegArgs)` → `optimizing` → readFile →
  размер > VIDEO_MAX_BYTES → ConvertTooBig; удалить файлы из FS; вернуть `new File([data], base + ".mp4", {type:"video/mp4"})`.
- [ ] `signal` abort → `terminate()`, сброс кэша, reject ConvertCancelled. Ошибки load → ConvertLoadFailed.
- [ ] tsc, eslint (unit-тест не нужен — обёртка над браузерным API; логика в Task 1). Commit.

### Task 3: MediaPicker — диалог, статусы, отмена, повтор

**Files:** Modify `src/components/admin/MediaPicker.tsx`, `messages/ru.json`, `messages/ky.json` (`homeSlides.media.*`).
- [ ] `accept="video/*"`; видео-поток: `too-big` → ошибка; иначе попытка `videoPoster(file)` → `playable`;
  `classifyVideo` → `upload` = прежний путь; convert-* → карточка-диалог в форме (не модалка) с текстом по причине,
  подсказкой про 1–3 минуты, [Отмена] [Да, конвертировать].
- [ ] Процесс: статус-строка со спиннером и % для converting, кнопка «Отменить» (AbortController); после
  конвертации — «Загружаем…» (обложка `videoPoster(mp4)` + `uploadPromoFile(mp4,"mp4","video/mp4")`) → «Видео загружено ✓»
  3 с. Ошибки (load/convert/too-big/upload) — текст + «Попробовать снова» (тот же файл, с шага конвертации).
- [ ] Переключатель Фото/Видео и кнопка выбора файла заблокированы во время обработки.
- [ ] tsc, eslint, npm test, build. Commit.

### Task 4: Проверка (контроллер)
- [ ] Playwright на тестовом админе: MP4 (сгенерированный) грузится без диалога; «MOV» (webm/другой контейнер,
  переименованный в .mov с type video/quicktime) → диалог → Отмена; → Да → статусы → MP4 загружен и играет;
  Отменить во время конвертации; ошибка конвертации (битый файл); > 200 МБ (синтетический File); у клиента нет
  загрузки видео (grep + UI профиля); права (branch_manager → 403 на admin API). Удалить тестовые данные. Docs, память.
