import type { NextConfig } from "next";

// Publicação no GitHub Pages: site 100% estático (o app roda todo no navegador).
//   STATIC_EXPORT=1            gera a pasta `out/` (HTML/JS/CSS)
//   NEXT_PUBLIC_BASE_PATH=/repo  o Pages serve em usuario.github.io/<repo>/
// Sem essas variáveis (npm run dev / build local), nada muda.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.STATIC_EXPORT === "1" && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  ...(basePath && { basePath, assetPrefix: basePath }),
  // Só no `npm run dev`: deixa o celular (na mesma rede) abrir http://<IP-do-PC>:3000.
  // Ajuste o IP se o seu PC mudar de endereço. Não afeta o build de produção.
  allowedDevOrigins: ["192.168.1.4"],
};
export default nextConfig;
