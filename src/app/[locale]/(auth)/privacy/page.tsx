import { getTranslations } from "next-intl/server";
import { LEGAL } from "@/lib/legal";

type Section = { title: string; body: string[] };

// Политика конфиденциальности: открыта без входа (ссылка из регистрации и из профиля).
export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as Section[];
  const missing = t("missing");
  const rows: [string, string][] = [
    [t("operator"), LEGAL.operatorName.trim() || missing],
    [t("address"), LEGAL.address.trim() || missing],
    [t("contact"), LEGAL.contact.trim() || missing],
  ];

  return (
    <article className="flex flex-col gap-5 text-sm leading-relaxed">
      <header>
        <h1 className="font-display text-2xl leading-snug">{t("title")}</h1>
        <p className="text-muted mt-1">{t("intro")}</p>
      </header>

      <section className="rounded-[var(--radius-card)] bg-card border border-border p-4">
        <h2 className="font-semibold mb-2">{t("whoTitle")}</h2>
        <dl className="flex flex-col gap-1.5">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className={value === missing ? "text-error font-medium" : ""}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="font-semibold mb-1.5">{s.title}</h2>
          <div className="flex flex-col gap-1.5 text-foreground/90">
            {s.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted">{t("changes")}</p>
    </article>
  );
}
