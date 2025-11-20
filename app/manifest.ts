import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NNH AI Studio - Business Management Platform",
    short_name: "NNH AI Studio",
    description:
      "AI-powered business management platform for automating reviews and managing multiple locations",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#FF6B35",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/nnh-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
