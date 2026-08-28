import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**"],
      exclude: ["src/main.jsx", "src/test/**"],
      thresholds: {
        lines: 80,
      },
    },
  },
});
