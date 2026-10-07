/**
 * 照片处理：本地压缩后转为 base64 dataURL，直接嵌入打卡记录。
 * - 游客模式：随打卡数据存 localStorage（刷新后照片仍在，替代旧的临时 blob 地址）
 * - 登录用户：随打卡数据存云端数据库（不依赖云存储服务开通与权限）
 *
 * 压缩策略：最长边 1280px、JPEG 质量 0.72，单张约 60-150KB，
 * 兼顾清晰度与 localStorage 容量（约 5MB，可存数十张）。
 */

const MAX_EDGE = 1280
const QUALITY = 0.72

export async function uploadPhoto(file: File, _uid?: string): Promise<string> {
  const img = await loadImage(file)
  const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, MAX_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片处理')
  // PNG 透明底统一转白底，避免 JPEG 压缩后变黑
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', QUALITY)
}

/** 通过 objectURL 加载图片，拿到像素尺寸后立即释放。 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败，请换一张试试'))
    }
    img.src = url
  })
}

/** 等比缩放到最长边不超过 max（小图保持原尺寸）。 */
function fitSize(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}
