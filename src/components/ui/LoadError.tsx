"use client";

import { useTranslations } from "next-intl";
import { RefreshCw, WifiOff, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Сообщение о сбое с кнопкой «Повторить».
 * `load` — не пришли данные (сеть, сервер); `crash` — упала сама страница.
 */
export function LoadError({ onRetry, kind = "load", title }: { onRetry: () => void; kind?: "load" | "crash"; title?: string }) {
  const t = useTranslations("common");
  return (
    <EmptyState
      icon={kind === "crash" ? TriangleAlert : WifiOff}
      title={title ?? t(kind === "crash" ? "crashTitle" : "loadFailedTitle")}
      description={t(kind === "crash" ? "crashHint" : "loadFailedHint")}
      tone="error"
      action={
        <Button onClick={onRetry}>
          <RefreshCw className="size-4" strokeWidth={2} aria-hidden />
          {t("retry")}
        </Button>
      }
    />
  );
}
