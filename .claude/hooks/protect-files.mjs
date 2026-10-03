// PreToolUse hook (Write|Edit): blocks Claude from editing secrets and the lock file.
// .env* holds Supabase/service keys; package-lock.json must only change through npm.
import { basename } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let filePath = "";
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path ?? "";
} catch {
  process.exit(0);
}

const name = basename(filePath);
let reason = "";

if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") {
  reason = `${name} хранит ключи и секреты — Claude его не редактирует. Попросите владельца изменить файл вручную (список переменных — в .env.example).`;
} else if (name === "package-lock.json") {
  reason = "package-lock.json меняется только через npm install / npm ci, а не правкой вручную.";
}

if (reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}
