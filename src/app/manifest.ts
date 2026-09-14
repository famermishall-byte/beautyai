import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeautyAI — консультант по красоте",
    short_name: "BeautyAI",
    description: "AI-помощник, который подбирает косметику из ассортимента вашего магазина",
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
