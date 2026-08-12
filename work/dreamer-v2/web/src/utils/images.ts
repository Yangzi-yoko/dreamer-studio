/** 把后端逗号分隔的图片字段解析为 URL 数组 */
export function parseImages(images?: string | null): string[] {
  if (!images) return []
  return images
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
}

/** 取第一张图片，无图时返回空串 */
export function firstImage(images?: string | null): string {
  const list = parseImages(images)
  return list.length ? list[0] : ''
}
