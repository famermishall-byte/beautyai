import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// One family for everything (body, headings, prices, titles), by the client's choice.
const manrope = Manrope({
  variable: "--font-manrope",
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
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
