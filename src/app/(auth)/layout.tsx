export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-accent-soft/60 via-background to-background">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
