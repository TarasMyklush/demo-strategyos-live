import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "pages"),
  publicDir: resolve(__dirname, "public"),
  base: "/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "gh-pages"),
    emptyOutDir: true,
  },
});
