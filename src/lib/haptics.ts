// Лёгкая вибрация при нажатии кнопки (просьба владельца 03.10).
// Работает там, где это умеет браузер: Android (Chrome, оболочка приложения). В Safari на iPhone
// navigator.vibrate нет вовсе — там вибрация возможна только через модуль оболочки (@capacitor/haptics),
// его добавим при публикации в App Store.

const TAP_MS = 10;

export function tapFeedback() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(TAP_MS);
  } catch {
    // запрещено настройками телефона — нажатие работает и без вибрации
  }
}

/** Что считается «кнопкой»: сами кнопки, галочки, переключатели и вкладки нижнего меню. */
export const TAP_TARGETS = 'button, [role="button"], [role="checkbox"], [role="radio"], nav a';
