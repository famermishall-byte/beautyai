import type { CapacitorConfig } from "@capacitor/cli";

// This wraps the live Beauty web app (Next.js on Vercel) in a native shell —
// it loads the real deployed site over HTTPS rather than bundling a static
// copy, so server features (auth cookies, API routes, Supabase) keep working
// exactly as they do in a mobile browser. Change `server.url` if the
// production domain ever changes.
const config: CapacitorConfig = {
  appId: "com.beauty.app",
  appName: "Beauty",
  webDir: "public",
  server: {
    url: "https://beautyai-famermishall-3772.vercel.app",
    cleartext: false,
  },
};

export default config;
