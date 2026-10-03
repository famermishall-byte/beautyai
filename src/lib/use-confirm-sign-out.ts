"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-context";
import { useFeedback } from "@/components/ui/Feedback";

/** Выход из аккаунта только после вопроса «Остаться / Выйти» (просьба владельца 03.10) — раньше выходило сразу. */
export function useConfirmSignOut() {
  const { signOut } = useSession();
  const { confirm } = useFeedback();
  const t = useTranslations("common");
  return async () => {
    const leave = await confirm({ title: t("signOutConfirm"), description: t("signOutHint"), confirmLabel: t("signOut"), cancelLabel: t("stay") });
    if (leave) await signOut();
  };
}
