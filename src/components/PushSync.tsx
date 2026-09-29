"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { isNotifOn } from "@/lib/permissions";
import { enablePush } from "@/lib/push";

/**
 * Если уведомления в этом браузере включены — держит подписку за тем, кто сейчас вошёл (после входа, смены
 * аккаунта или если браузер сам обновил подписку). Ничего не показывает.
 */
export function PushSync() {
  const { session } = useSession();
  const account = session?.email ?? null;

  useEffect(() => {
    if (!account || !isNotifOn()) return;
    void enablePush();
  }, [account]);

  return null;
}
