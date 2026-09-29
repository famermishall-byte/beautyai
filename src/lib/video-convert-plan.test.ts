import { test } from "node:test";
import assert from "node:assert/strict";
import { VIDEO_MAX_BYTES } from "./home-slides";
import { SOURCE_MAX_BYTES, TARGET_BYTES, classifyVideo, targetBitrates, parseDuration, ffmpegArgs } from "./video-convert-plan";

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

test("targetBitrates", () => {
  assert.equal(targetBitrates(null).videoKbps, 1500);
  assert.equal(targetBitrates(0).videoKbps, 1500);
  assert.equal(targetBitrates(-5).videoKbps, 1500);
  assert.equal(targetBitrates(1).videoKbps, 2500);
  assert.equal(targetBitrates(600).videoKbps, 400);
  assert.equal(targetBitrates(120).audioKbps, 128);
  const v = targetBitrates(120).videoKbps;
  assert.equal(v, Math.floor((TARGET_BYTES * 8) / 1000 / 120) - 128);
  assert.ok(v > 400 && v < 2500);
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
  assert.equal(a[a.indexOf("-b:v") + 1], `${v}k`);
  assert.equal(a[a.indexOf("-maxrate") + 1], `${v}k`);
  assert.equal(a[a.indexOf("-bufsize") + 1], `${v * 2}k`);
  assert.equal(a[a.indexOf("-b:a") + 1], "128k");
  assert.ok(!a.includes("-map"));
  assert.equal(ffmpegArgs("i", "o", null)[ffmpegArgs("i", "o", null).indexOf("-b:v") + 1], "1500k");
});
