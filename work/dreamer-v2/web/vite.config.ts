import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 内联 px -> rem 转换插件（设计稿宽度 375，根字号 16px）。
 * 与 src/utils/flexible.ts 配合：移动端根字号随视口缩放，桌面端封顶为 16px，
 * 避免桌面浏览器里控件被 vw 放大。
 * 大写 PX（如 #app 的 640PX 固定宽度、媒体查询 480PX）保持原样不转换。
 */
function pxToRem(): any {
  return {
    postcssPlugin: 'px-to-rem',
    Declaration(decl: any) {
      const value = decl.value
      if (!value || !value.includes('px')) return
      // 跳过 url() 中的内容，避免误改图片路径
      if (value.includes('url(')) return
      const next = value.replace(
        /(\d+(?:\.\d+)?)px\b/g,
        (_match: string, num: string) => `${Number(parseFloat(num) / 16).toFixed(5)}rem`,
      )
      if (next !== value) decl.value = next
    },
  }
}

export default defineConfig({
  plugins: [vue()],
  build: {
    sourcemap: false,
  },
  css: {
    postcss: {
      plugins: [pxToRem()],
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3100', changeOrigin: true },
    },
  },
})
