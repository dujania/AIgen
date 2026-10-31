import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative asset paths keep the build portable: it works at a domain root,
  // on GitHub Pages under /AIgen/, or opened from any static host.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // The sandbox preview is served from a dynamic *.e2b.app host.
    allowedHosts: true,
  },
});
