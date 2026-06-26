import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  build: {
    assetsInlineLimit: 1024 * 500, // 内网部署时将字体等静态资源打包为base64，避免由于路径或MIME类型问题导致图标(如bold, italic)加载失败
  }
})
