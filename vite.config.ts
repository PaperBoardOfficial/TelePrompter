import { defineConfig } from "vite"
import electron from "vite-plugin-electron"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  root: "./src/renderer",
  plugins: [
    react(),
    electron([
      {
        // main.ts
        entry: path.resolve(__dirname, "src/core/main.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron"),
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ["electron"]
            }
          },
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "./src")
            }
          }
        }
      },
      {
        // preload.ts
        entry: path.resolve(__dirname, "src/preload/preload.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron"),
            sourcemap: true,
            rollupOptions: {
              external: ["electron"]
            }
          },
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "./src")
            }
          }
        }
      }
    ])
  ],
  base: process.env.NODE_ENV === "production" ? "./" : "/",
  server: {
    port: 54321,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})
