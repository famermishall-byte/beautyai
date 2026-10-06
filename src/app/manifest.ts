import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Магазин Косметики и не только",
    short_name: "Магазин",
    description: "Каталог и заказ товаров — Магазин Косметики и не только",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f8",
    theme_color: "#c8135f",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
