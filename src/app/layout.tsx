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
  title: "ОПТОВЫЕ ЦЕНЫ 01",
  description: "Каталог и заказ товаров ОПТОВЫЕ ЦЕНЫ 01",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ОПТОВЫЕ ЦЕНЫ 01",
  },
};

export const viewport: Viewport = {
  themeColor: "#c8135f",
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
