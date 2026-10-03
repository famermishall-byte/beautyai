import { Skeleton } from "@/components/ui/Skeleton";

// Заготовка следующего экрана: показывается сразу по нажатию, пока сервер отвечает (docs/perf.md).
// Нейтральная — подходит любому экрану приложения; дальше экран рисует свои заготовки сам.
export default function AppLoading() {
  return (
    <main className="flex-1 px-4 pt-3 max-w-2xl mx-auto w-full flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-28 rounded-[var(--radius-card)]" />
      <Skeleton className="h-28 rounded-[var(--radius-card)]" />
    </main>
  );
}
