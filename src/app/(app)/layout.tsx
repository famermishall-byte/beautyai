import { AppProviders } from "@/components/AppProviders";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
