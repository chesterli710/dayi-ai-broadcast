import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 构建配置
  build: {
    rollupOptions: {
      external: []
    }
  }
})
