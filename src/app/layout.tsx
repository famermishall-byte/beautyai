import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "BeautyAI — ваш AI-консультант по красоте",
  description: "AI-помощник, который подбирает косметику именно из ассортимента вашего магазина",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BeautyAI",
  },
};

export const viewport: Viewport = {
  themeColor: "#8f5730",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
