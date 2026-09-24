import { PageHeader } from "@/components/ui/PageHeader";

// Shared frame of an admin section page (the admin home is an icon menu; each section opens on its own page).
export function AdminPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 px-4 pt-6 pb-24 max-w-4xl mx-auto w-full">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </main>
  );
}
