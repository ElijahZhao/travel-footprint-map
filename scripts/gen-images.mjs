// 用 Node 内置 zlib 生成项目所需栅格图（PWA 图标 + OG 封面），无需任何原生依赖。
// 运行：node scripts/gen-images.mjs  （产物写入 frontend/public）
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('frontend/public')

// ---------- PNG 编码（RGBA, 8bit） ----------
function crc32(buf) {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/** paint(x, y) -> [r,g,b,a]（a: 0-255） */
function encodePNG(w, h, paint) {
  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0 // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = paint(x, y)
      const o = y * (1 + w * 4) + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

// ---------- 绘图工具 ----------
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))

/** 把 src 颜色按 alpha 混合到 base（base 已含当前 RGB） */
function blend(base, src) {
  const a = src[3] / 255
  return [
    clamp(base[0] * (1 - a) + src[0] * a),
    clamp(base[1] * (1 - a) + src[1] * a),
    clamp(base[2] * (1 - a) + src[2] * a),
    clamp(Math.max(base[3], src[3])),
  ]
}

/** 圆形测试 */
function inCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** 地图大头针（水滴形）：上半圆 + 向下尖角；返回是否命中 */
function inPin(x, y, cx, cy, scale) {
  const circleR = scale * 0.30
  const circleCy = cy - scale * 0.18
  const top = circleCy - circleR
  const bottom = cy + scale * 0.42
  if (inCircle(x, y, cx, circleCy, circleR)) return true
  // 三角形：左肩、右肩、尖端
  const lx = cx - circleR * 0.92
  const rx = cx + circleR * 0.92
  const lsy = circleCy + circleR * 0.55
  const rsy = lsy
  // 重心坐标判断点在三角形内
  const d = (rx - lx) * (bottom - lsy) - (rx - bottom) * (bottom - rsy)
  if (d === 0) return false
  const a = ((x - lx) * (bottom - lsy) - (bottom - lx) * (y - lsy)) / d
  const b = ((rx - lx) * (y - lsy) - (x - lx) * (rsy - lsy)) / d
  const c = 1 - a - b
  return a >= 0 && b >= 0 && c >= 0
}

// ---------- PWA 图标：圆角绿底 + 白色大头针 ----------
function makeIcon(size) {
  const radius = size * 0.22
  const pad = size * 0.06
  return encodePNG(size, size, (x, y) => {
    // 圆角：四角外区域透明
    const inRound =
      (x >= pad + radius || y >= pad + radius) &&
      (x <= size - pad - radius || y >= pad + radius) &&
      (x >= pad + radius || y <= size - pad - radius) &&
      (x <= size - pad - radius || y <= size - pad - radius)
    if (!inRound) return [0, 0, 0, 0]
    // 绿底
    let base = [31, 81, 63, 255]
    // 轻微高光
    const hi = Math.max(0, 1 - Math.hypot((x - size * 0.4) / (size * 0.5), (y - size * 0.35) / (size * 0.5))) * 26
    base = [clamp(base[0] + hi), clamp(base[1] + hi), clamp(base[2] + hi), 255]
    // 白色大头针
    if (inPin(x, y, size / 2, size / 2, size * 0.5)) {
      base = blend(base, [255, 255, 255, 255])
      // 内部品牌绿小圆点
      if (inCircle(x, y, size / 2, size / 2 - size * 0.09, size * 0.105)) {
        base = blend(base, [31, 81, 63, 255])
      }
    }
    return base
  })
}

// ---------- OG 封面：1200x630 品牌渐变 + 居中大头针 + 边缘暗角 ----------
function makeCover(w = 1200, h = 630) {
  const cx = w / 2
  const cy = h / 2 + 20
  return encodePNG(w, h, (x, y) => {
    const ty = y / h
    let base = [lerp(31, 42, ty), lerp(81, 125, ty), lerp(63, 95, ty), 255]
    // 中心柔光
    const dx = (x - w * 0.5) / (w * 0.5)
    const dy = (y - h * 0.42) / (h * 0.5)
    const d = Math.sqrt(dx * dx + dy * dy)
    const hi = Math.max(0, 1 - d) * 34
    base = [clamp(base[0] + hi), clamp(base[1] + hi), clamp(base[2] + hi), 255]
    // 边缘暗角
    const vig = Math.min(1, d) * 30
    base = [clamp(base[0] - vig), clamp(base[1] - vig), clamp(base[2] - vig), 255]
    // 居中白色大头针（比图标更大、更舒展）
    if (inPin(x, y, cx, cy, h * 0.62)) {
      base = blend(base, [255, 255, 255, 255])
      if (inCircle(x, y, cx, cy - h * 0.11, h * 0.075)) {
        base = blend(base, [31, 81, 63, 255])
      }
    }
    return base
  })
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'icon-192.png'), makeIcon(192))
fs.writeFileSync(path.join(OUT, 'icon-512.png'), makeIcon(512))
fs.writeFileSync(path.join(OUT, 'og-cover.png'), makeCover())
console.log('Generated icon-192.png, icon-512.png, og-cover.png in', OUT)
