import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(process.cwd(), ".."))
  const appEnv = loadEnv(mode, process.cwd())
  const env = { ...rootEnv, ...appEnv }

  return {
    base: env.VITE_BASE_URL ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Tăng chunk size warning threshold
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Tách vendor chunks để cache hiệu quả hơn
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'motion': ['framer-motion'],
            'router': ['react-router'],
          },
        },
      },
    },
  }
})
