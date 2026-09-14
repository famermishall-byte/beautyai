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
  title: "Beauty — красота начинается с правильного ухода",
  description: "Beauty помогает подобрать уход и косметику из ассортимента вашего магазина",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Beauty",
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
