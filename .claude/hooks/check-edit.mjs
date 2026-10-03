// PostToolUse hook (Write|Edit): after Claude edits a TypeScript file, type-check the
// project and lint that file. Errors go back to Claude (exit code 2) so they are fixed
// right away instead of surfacing at `next build` / on Vercel.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let filePath = "";
try {
  const input = JSON.parse(raw);
  filePath = input?.tool_response?.filePath ?? input?.tool_input?.file_path ?? "";
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = relative(root, resolve(root, filePath)).replaceAll("\\", "/");

const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const eslint = resolve(root, "node_modules/eslint/bin/eslint.js");

const skip =
  !/\.(ts|tsx|mts)$/.test(rel) ||
  rel.startsWith("..") || // outside the project
  rel.startsWith(".claude/") || // worktrees have their own checkout
  rel.startsWith("node_modules/") ||
  rel.startsWith(".next/") ||
  rel.startsWith("supabase/functions/") || // Deno code, excluded from tsconfig
  !existsSync(tsc) ||
  !existsSync(eslint);
if (skip) process.exit(0);

function run(args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, args, { cwd: root });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => done({ code, out: out.trim() }));
    child.on("error", (err) => done({ code: 1, out: String(err) }));
  });
}

const [types, lint] = await Promise.all([run([tsc, "--noEmit"]), run([eslint, rel])]);

const MAX_LINES = 60;
const clip = (text) => {
  const lines = text.split("\n");
  return lines.length > MAX_LINES
    ? [...lines.slice(0, MAX_LINES), `… ещё ${lines.length - MAX_LINES} строк`].join("\n")
    : text;
};

const problems = [];
if (types.code !== 0) problems.push(`tsc --noEmit:\n${clip(types.out)}`);
if (lint.code !== 0) problems.push(`eslint ${rel}:\n${clip(lint.out)}`);

if (problems.length) {
  process.stderr.write(`Проверка после правки ${rel} нашла ошибки — исправьте их:\n\n${problems.join("\n\n")}\n`);
  process.exit(2);
}
