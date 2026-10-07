/**
 * 旅行主题 SVG 插画资产 —— 用矢量插画替代 emoji / 纯图标占位，
 * 这是去「AI 简陋感」最立竿见影的一步（空状态、欢迎、引导场景）。
 *
 * scene 决定配色与构图：
 *  - welcome：欢迎页，旅人绿 + 暖橙路线
 *  - empty：空状态，柔和灰绿，弱化但仍精致
 *  - guest：游客引导，暖橙主调
 */
export default function TravelIllustration({
  scene = 'welcome',
  className,
}: {
  scene?: 'welcome' | 'empty' | 'guest'
  className?: string
}) {
  const palette = {
    welcome: { bg: 'oklch(0.58 0.145 158 / 0.10)', route: 'oklch(0.58 0.145 158)', pin: 'oklch(0.72 0.185 48)', sun: 'oklch(0.80 0.17 75)' },
    empty: { bg: 'oklch(0.55 0.04 85 / 0.10)', route: 'oklch(0.55 0.05 85)', pin: 'oklch(0.62 0.10 85)', sun: 'oklch(0.80 0.10 85)' },
    guest: { bg: 'oklch(0.72 0.185 48 / 0.12)', route: 'oklch(0.72 0.185 48)', pin: 'oklch(0.58 0.145 158)', sun: 'oklch(0.80 0.17 75)' },
  }[scene]

  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="旅行插画">
      {/* 圆角卡片底 */}
      <rect x="8" y="8" width="104" height="104" rx="26" fill={palette.bg} />

      {/* 太阳 / 暖光 */}
      <circle cx="88" cy="34" r="11" fill={palette.sun} opacity="0.85" />
      <circle cx="88" cy="34" r="17" fill={palette.sun} opacity="0.22" />

      {/* 远山 */}
      <path d="M14 86 L38 58 L58 80 L74 64 L106 92" stroke={palette.route} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />

      {/* 旅行路线（虚线） */}
      <path
        d="M22 92 C 44 70, 40 50, 64 52 S 92 40, 96 30"
        stroke={palette.route}
        strokeWidth="2.4"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />

      {/* 起点 */}
      <circle cx="22" cy="92" r="5" fill={palette.route} />

      {/* 终点图钉 */}
      <g transform="translate(96 30)">
        <path
          d="M0 -14 C 8 -14, 13 -9, 13 -2 C 13 6, 0 16, 0 16 C 0 16, -13 6, -13 -2 C -13 -9, -8 -14, 0 -14 Z"
          fill={palette.pin}
        />
        <circle cx="0" cy="-2" r="4.4" fill="#fff" />
      </g>

      {/* 小云 */}
      <path d="M30 34 C 30 28, 40 28, 42 33 C 48 31, 52 37, 47 40 L 30 40 C 25 40, 26 34, 30 34 Z" fill={palette.route} opacity="0.18" />
    </svg>
  )
}
