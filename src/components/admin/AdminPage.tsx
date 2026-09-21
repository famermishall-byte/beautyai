// Shared frame of an admin section page (the admin home is an icon menu; each section opens on its own page).
export function AdminPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-4xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-muted mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </main>
  );
}
