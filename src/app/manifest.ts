import type { MetadataRoute } from "next";

// Necessário para `output: "export"` (site estático no GitHub Pages).
export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FUEL — dieta, água e déficit",
    short_name: "FUEL",
    description: "Refeições, água, compras, peso e déficit calórico.",
    lang: "pt-BR",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
