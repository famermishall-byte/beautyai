// Birth dates travel as "YYYY-MM-DD"; age is derived, never stored.
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

export function formatBirthDate(birthDate: string): string {
  const [y, m, d] = birthDate.split("-");
  return `${d}.${m}.${y}`;
}

// The word for "N years" comes from messages ("common.years", an ICU plural) — see QuestionnaireSummary.
