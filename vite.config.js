import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // GSAP changes rarely; keep it cacheable separately from app code.
        manualChunks(id) {
          if (id.includes("node_modules/gsap")) return "gsap";
          if (id.includes("node_modules/react")) return "react";
        }
      }
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"]
  }
});
