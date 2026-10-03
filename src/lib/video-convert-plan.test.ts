import { test } from "node:test";
import assert from "node:assert/strict";
import { VIDEO_MAX_BYTES } from "./home-slides";
import { AUDIO_KBPS, HEAVY_KBPS, MAX_VIDEO_KBPS, SOURCE_MAX_BYTES, TARGET_BYTES, classifyVideo, isHeavy, targetBitrates, parseDuration, ffmpegArgs, posterArgs } from "./video-convert-plan";

test("posterArgs: один кадр 960×660 cover", () => {
  const a = posterArgs("out.mp4", "poster.jpg");
  assert.equal(a[a.indexOf("-i") + 1], "out.mp4");
  assert.equal(a[a.length - 1], "poster.jpg");
  assert.equal(a[a.indexOf("-frames:v") + 1], "1");
  assert.equal(a[a.indexOf("-vf") + 1], "scale=960:660:force_original_aspect_ratio=increase,crop=960:660");
});

test("classifyVideo: все исходы", () => {
  assert.equal(classifyVideo({ type: "video/mp4", size: 1000 }, true), "upload");
  assert.equal(classifyVideo({ type: "video/quicktime", size: 1000 }, true), "convert-format");
  assert.equal(classifyVideo({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1 }, true), "convert-size");
  assert.equal(classifyVideo({ type: "video/mp4", size: 1000 }, false), "convert-unplayable");
  assert.equal(classifyVideo({ type: "video/mp4", size: SOURCE_MAX_BYTES + 1 }, true), "too-big");
});

test("classifyVideo: границы и приоритет", () => {
  assert.equal(classifyVideo({ type: "video/mp4", size: SOURCE_MAX_BYTES }, true), "convert-size");
  assert.equal(classifyVideo({ type: "video/quicktime", size: SOURCE_MAX_BYTES }, true), "convert-format");
  assert.equal(classifyVideo({ type: "video/mp4", size: VIDEO_MAX_BYTES }, true), "upload");
  assert.equal(classifyVideo({ type: "video/mp4", size: 31457280 }, true), "upload");
  // формат важнее playable, размер важнее playable
  assert.equal(classifyVideo({ type: "video/avi", size: 10 }, false), "convert-format");
  assert.equal(classifyVideo({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1 }, false), "convert-size");
  assert.equal(classifyVideo({ type: "video/avi", size: SOURCE_MAX_BYTES + 1 }, true), "too-big");
});

test("isHeavy: тяжёлый — поток выше порога; без длины ролика не судим", () => {
  // ролики владельца с главной (03.10): 2,79 МБ за 4,16 с и 2,48 МБ за 7,4 с
  assert.equal(isHeavy(2790003, 4.16), true);
  assert.equal(isHeavy(2482056, 7.405), true);
  assert.equal(isHeavy((HEAVY_KBPS * 1000 * 10) / 8, 10), false);
  assert.equal(isHeavy((HEAVY_KBPS * 1000 * 10) / 8 + 1, 10), true);
  assert.equal(isHeavy(5_000_000, null), false);
  assert.equal(isHeavy(5_000_000, 0), false);
  assert.equal(isHeavy(5_000_000, Infinity), false);
  assert.equal(isHeavy(5_000_000, NaN), false);
});

test("classifyVideo: тяжёлый MP4 сжимается, лёгкий загружается как есть", () => {
  assert.equal(classifyVideo({ type: "video/mp4", size: 2790003 }, true, 4.16), "compress");
  assert.equal(classifyVideo({ type: "video/mp4", size: 500_000 }, true, 4.16), "upload");
  assert.equal(classifyVideo({ type: "video/mp4", size: 2790003 }, true, null), "upload");
  // остальные причины важнее
  assert.equal(classifyVideo({ type: "video/quicktime", size: 2790003 }, true, 4.16), "convert-format");
  assert.equal(classifyVideo({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1 }, true, 4.16), "convert-size");
  assert.equal(classifyVideo({ type: "video/mp4", size: 2790003 }, false, 4.16), "convert-unplayable");
});

test("сжатый ролик не считается тяжёлым повторно", () => {
  const { videoKbps, audioKbps } = targetBitrates(10);
  assert.equal(isHeavy(((videoKbps + audioKbps) * 1000 * 10) / 8, 10), false);
});

test("targetBitrates", () => {
  assert.equal(targetBitrates(null).videoKbps, MAX_VIDEO_KBPS);
  assert.equal(targetBitrates(0).videoKbps, MAX_VIDEO_KBPS);
  assert.equal(targetBitrates(-5).videoKbps, MAX_VIDEO_KBPS);
  assert.equal(targetBitrates(1).videoKbps, MAX_VIDEO_KBPS);
  assert.equal(targetBitrates(600).videoKbps, 400);
  assert.equal(targetBitrates(120).audioKbps, AUDIO_KBPS);
  const v = targetBitrates(200).videoKbps;
  assert.equal(v, Math.floor((TARGET_BYTES * 8) / 1000 / 200) - AUDIO_KBPS);
  assert.ok(v > 400 && v < MAX_VIDEO_KBPS);
});

test("parseDuration", () => {
  assert.equal(parseDuration("  Duration: 00:01:02.50, start: 0.000000, bitrate: 1000 kb/s"), 62.5);
  assert.equal(parseDuration("Duration: 01:00:00.00, start"), 3600);
  assert.equal(parseDuration("Duration: N/A, bitrate: N/A"), null);
  assert.equal(parseDuration("nothing here"), null);
});

test("ffmpegArgs", () => {
  const a = ffmpegArgs("in.mov", "out.mp4", 120);
  const v = targetBitrates(120).videoKbps;
  assert.deepEqual(a.slice(0, 2), ["-i", "in.mov"]);
  assert.equal(a[a.length - 1], "out.mp4");
  assert.ok(a.includes("+faststart"));
  assert.ok(a.includes("libx264"));
  assert.ok(a.includes("aac"));
  assert.ok(a.includes("yuv420p"));
  assert.ok(!a.includes("-b:v"));
  assert.equal(a[a.indexOf("-crf") + 1], "26");
  assert.equal(a[a.indexOf("-maxrate") + 1], `${v}k`);
  assert.equal(a[a.indexOf("-bufsize") + 1], `${v * 2}k`);
  assert.equal(a[a.indexOf("-b:a") + 1], `${AUDIO_KBPS}k`);
  assert.ok(!a.includes("-map"));
  assert.equal(ffmpegArgs("i", "o", null)[ffmpegArgs("i", "o", null).indexOf("-maxrate") + 1], `${MAX_VIDEO_KBPS}k`);
});

test("ffmpegArgs: -vf с чётными размерами", () => {
  const a = ffmpegArgs("i", "o", 120);
  assert.equal(
    a[a.indexOf("-vf") + 1],
    "scale='if(gt(iw,ih),-2,trunc(min(720,iw)/2)*2)':'if(gt(iw,ih),trunc(min(720,ih)/2)*2,-2)'",
  );
});

test("ffmpegArgs: -fps_mode vfr сразу после -vf (без дублирования кадров у VFR-исходников)", () => {
  const a = ffmpegArgs("i", "o", 120);
  const i = a.indexOf("-fps_mode");
  assert.equal(a[i + 1], "vfr");
  assert.equal(i, a.indexOf("-vf") + 2);
});
