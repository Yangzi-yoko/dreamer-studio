/**
 * H5 rem 适配：
 * - 设计稿宽度 375，根字号 = 视口宽度 / 375 × 16px；
 * - 视口宽度超过 375（平板/桌面）时根字号封顶为 16px，
 *   配合 #app 的 max-width 限制，桌面端呈现正常的页面尺寸，
 *   而不是把移动端控件放大数倍。
 */
const DESIGN_WIDTH = 375
const BASE_FONT_SIZE = 16

function setupFlexible() {
  const docEl = document.documentElement

  const recalc = () => {
    const width = docEl.clientWidth || window.innerWidth
    if (!width) return
    const scale = Math.min(width / DESIGN_WIDTH, 1)
    docEl.style.fontSize = `${(scale * BASE_FONT_SIZE).toFixed(2)}px`
  }

  recalc()
  window.addEventListener('resize', recalc)
  window.addEventListener('orientationchange', recalc)
}

setupFlexible()
