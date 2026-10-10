import confetti from 'canvas-confetti'

/** 主题色系：苔绿 / 暖橙 / 麦金 / 浅苔 */
const COLORS = ['#2D5A3D', '#C46A3D', '#E3B23C', '#7FA88F', '#F4EFE4']

/**
 * 庆祝撒花 —— 用于打卡成功、点亮心愿等高光时刻。
 * 三连发：中间一炮 + 左右两翼，呈现包围感。
 */
export function celebrate() {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const base: confetti.Options = {
    colors: COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  }

  confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 38, origin: { x: 0.5, y: 0.65 } })
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 55, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } })
    confetti({ ...base, particleCount: 55, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } })
  }, 180)
}
