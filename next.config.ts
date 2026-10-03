import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Защитные заголовки для всех страниц и ответов сервера.
const SECURITY_HEADERS = [
  // сайт нельзя встроить в чужую страницу (защита от обмана «нажми сюда» поверх наших кнопок)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // браузер не угадывает тип файла сам — загруженная картинка не выполнится как программа
  { key: "X-Content-Type-Options", value: "nosniff" },
  // на чужие сайты уходит только адрес нашего сайта, без пути страницы (в пути бывают коды ссылок на заказ)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // камера и микрофон приложению не нужны; геолокация — только нашему сайту
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
