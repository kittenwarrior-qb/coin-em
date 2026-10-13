import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { publicGuidePwa } from './pwa/build'
import { optimizedBrandBuild } from './pwa/optimizedBrandBuild'

export default defineConfig(({ mode }) => {
  const native = process.env.VITE_NATIVE_APP === 'true'
  const rootEnv = native ? {} : loadEnv(mode, path.resolve(process.cwd(), ".."))
  const appEnv = native ? {} : loadEnv(mode, process.cwd())
  const env = { ...rootEnv, ...appEnv }

  return {
    base: native ? '/' : env.VITE_BASE_URL ?? "/",
    envDir: native ? false : undefined,
    plugins: [react(), tailwindcss(), ...(native ? [] : [publicGuidePwa()]), optimizedBrandBuild()],
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
