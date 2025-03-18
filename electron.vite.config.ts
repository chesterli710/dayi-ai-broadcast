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
      },
      // 确保字体文件被正确复制到打包目录
      output: {
        assetFileNames: (assetInfo) => {
          // 对字体文件保持其在assets目录下的相对路径
          const name = assetInfo.name || '';
          if (/\.(woff2?|ttf|otf)$/.test(name)) {
            return 'assets/fonts/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // 添加对字体文件的复制配置
    assetsInlineLimit: 0, // 确保所有资源文件都不会被内联为base64
  }
}) 