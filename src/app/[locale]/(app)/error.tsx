"use client";

import RouteError from "../error";

// Тот же экран, но внутри оболочки приложения: шапка и нижнее меню остаются на месте.
export default function AppRouteError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} />;
}
