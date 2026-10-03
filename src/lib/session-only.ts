// «Чужое устройство — не запоминать вход» (просьба владельца 03.10).
//
// Обычно вход запоминается надолго. С этой галочкой вход живёт, пока открыта вкладка: метка в куке говорит
// «этот вход — временный», а отметка в sessionStorage — «вкладка, в которой вошли, ещё открыта». Вкладку или
// браузер закрыли — отметка исчезла, и при следующем открытии приложение само выходит из аккаунта
// (SessionProvider). На «сессионные куки» не полагаемся: мобильные браузеры их часто восстанавливают.

const COOKIE = "beautyai-session-only";
const TAB_FLAG = "beautyai-session-alive";
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function hasMarker(): boolean {
  return document.cookie.split("; ").some((c) => c === `${COOKIE}=1`);
}

function tabIsAlive(): boolean {
  try {
    return sessionStorage.getItem(TAB_FLAG) === "1";
  } catch {
    return false; // хранилище недоступно — считаем вкладку новой: временный вход не продлеваем
  }
}

/** После успешного входа: запомнить выбор человека. */
export function setSessionOnly(sessionOnly: boolean) {
  if (!sessionOnly) return clearSessionOnly();
  document.cookie = `${COOKIE}=1; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  try {
    sessionStorage.setItem(TAB_FLAG, "1");
  } catch {
    // недоступно — при следующей загрузке вход закончится, что для чужого устройства безопаснее
  }
}

export function clearSessionOnly() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  try {
    sessionStorage.removeItem(TAB_FLAG);
  } catch {
    // недоступно — нечего убирать
  }
}

/** Вход был временным, а вкладку, в которой входили, уже закрыли — пора выйти из аккаунта. */
export function sessionOnlyExpired(): boolean {
  return hasMarker() && !tabIsAlive();
}
