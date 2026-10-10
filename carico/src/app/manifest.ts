import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carico — schede di allenamento",
    short_name: "Carico",
    description: "Crea, salva ed esegui le tue schede di allenamento in palestra.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f1ec",
    theme_color: "#c2410c",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Schede", url: "/schede", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Storico", url: "/storico", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
