import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
import vueJsx from '@vitejs/plugin-vue-jsx'
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          // 主进程入口
          index: resolve(__dirname, 'src/main/index.ts'),
          // Worker 入口（单独声明，避免被合并）
          worker: resolve(__dirname, 'src/main/worker.ts'),
          middleware_worker: resolve(__dirname, 'src/main/middleware_worker.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      vue(),
      vueJsx(),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), 'src/renderer/src/assets/icons')],
        symbolId: 'icon-[dir]-[name]'
      })
    ]
  }
})
