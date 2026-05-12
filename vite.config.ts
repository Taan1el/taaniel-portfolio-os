import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler"))
            return "vendor-react";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils"))
            return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("zustand")) return "vendor-zustand";
          if (id.includes("html-to-image")) return "vendor-html2image";
          if (id.includes("react-rnd") || id.includes("re-resizable")) return "vendor-rnd";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    exclude: [
      "node_modules/**",
      ".claude/**",
    ],
  },
});
