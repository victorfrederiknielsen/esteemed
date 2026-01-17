import { execSync } from "node:child_process";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function getVersion(): string {
  // CI passes version via env var (Docker build)
  if (process.env.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION;
  }
  // Local dev: read from git
  try {
    return execSync("git describe --tags --always").toString().trim();
  } catch {
    return "dev";
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    watch: {
      usePolling: true, // Required for Docker/WSL
    },
    proxy: {
      "/esteemed.v1": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
