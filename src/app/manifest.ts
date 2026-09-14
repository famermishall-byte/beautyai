import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ОПТОВЫЕ ЦЕНЫ 01",
    short_name: "ОПТОВЫЕ ЦЕНЫ 01",
    description: "Каталог и заказ товаров ОПТОВЫЕ ЦЕНЫ 01",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f8",
    theme_color: "#c8135f",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
