import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:web` で、どこでも開ける1枚のHTML（dist-web/index.html）を作る
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "web" ? [viteSingleFile()] : [])],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: mode === "web" ? { outDir: "dist-web", assetsInlineLimit: 100_000_000 } : {},
}));
