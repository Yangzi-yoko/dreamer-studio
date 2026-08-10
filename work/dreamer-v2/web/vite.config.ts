import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import px2viewport from 'postcss-px-to-viewport-8-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        px2viewport({
          unitToConvert: 'px', // 需要转换的单位
          viewportWidth: 375, // 设计稿宽度（Element Plus 按 375 设计）
          unitPrecision: 5, // 转换后保留小数位数
          propList: ['*'], // 所有属性都转换
          viewportUnit: 'vw', // 转换成的视口单位
          fontViewportUnit: 'vw', // 字体使用的视口单位
          selectorBlackList: ['.no-vw'], // 忽略带该类名的选择器
          minPixelValue: 1, // 小于等于 1px 不转换
          mediaQuery: true, // 媒体查询里也转换
          replace: true,
          landscape: false,
        }),
      ],
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3100', changeOrigin: true },
    },
  },
})