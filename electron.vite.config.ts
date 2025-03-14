import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

/**
 * Electron的Vite配置
 * 配置Electron主进程和渲染进程的构建
 */
export default defineConfig({
  plugins: [
    vue(),
    electron({
      // 主进程入口文件
      entry: [
        'electron/main.ts',
        'electron/preload.ts'
      ],
      // 开发模式配置
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron'],
            output: {
              format: 'cjs' // 使用CommonJS格式输出
            }
          }
        }
      }
    })
  ],
  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 服务器配置
  server: {
    host: '0.0.0.0',
  },
  // 构建配置
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
}) 