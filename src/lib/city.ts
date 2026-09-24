// The user's chosen city is a per-device preference (not account data),
// same pattern as the branch choice already saved in catalog/page.tsx.
const CITY_STORAGE_KEY = "beautyai-city";

export function getStoredCity(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredCity(city: string): void {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {
    // недоступно — выбор просто не сохранится между визитами
  }
}
