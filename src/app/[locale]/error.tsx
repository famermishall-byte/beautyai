"use client";

import { useEffect } from "react";
import { LoadError } from "@/components/ui/LoadError";

// Страховочный экран: страница упала — вместо белого экрана сообщение и «Повторить».
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <LoadError kind="crash" onRetry={retry} />
    </main>
  );
}
