import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beauty — красота начинается с правильного ухода",
    short_name: "Beauty",
    description: "Beauty помогает подобрать уход и косметику из ассортимента вашего магазина",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f5",
    theme_color: "#8f5730",
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
