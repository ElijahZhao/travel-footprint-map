/**
 * 旅行主题 SVG 插画 —— 每个场景画不同主体，避免 5 个 tab 空状态长一样。
 *
 * scene 对应：
 *  - empty：通用空状态（山 + 图钉）
 *  - welcome：欢迎页（山 + 图钉，暖色）
 *  - guest：游客引导（山 + 图钉，橙色）
 *  - timeline：翻开的手帐 + 笔
 *  - wishlist：信封 + 机票
 *  - stats：罗盘
 *  - me：行李箱
 */

type Scene = 'welcome' | 'empty' | 'guest' | 'timeline' | 'wishlist' | 'stats' | 'me'

const PALETTES: Record<string, { bg: string; line: string; accent: string }> = {
  warm:   { bg: 'oklch(0.58 0.145 158 / 0.10)', line: 'oklch(0.58 0.145 158)', accent: 'oklch(0.72 0.185 48)' },
  muted:  { bg: 'oklch(0.55 0.04 85 / 0.10)',  line: 'oklch(0.55 0.05 85)', accent: 'oklch(0.62 0.10 85)' },
  orange: { bg: 'oklch(0.72 0.185 48 / 0.12)',  line: 'oklch(0.72 0.185 48)', accent: 'oklch(0.58 0.145 158)' },
}

function paletteFor(scene: Scene) {
  if (scene === 'welcome') return PALETTES.warm
  if (scene === 'guest') return PALETTES.orange
  return PALETTES.muted
}

/** 通用场景：远山 + 虚线航线 + 图钉（empty / welcome / guest 共用） */
function GenericJourney({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      <rect x="8" y="8" width="104" height="104" rx="26" fill="none" />
      <circle cx="88" cy="34" r="11" fill={accent} opacity="0.35" />
      <path d="M14 86 L38 58 L58 80 L74 64 L106 92" stroke={line} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" fill="none" />
      <path d="M22 92 C 44 70, 40 50, 64 52 S 92 40, 96 30" stroke={line} strokeWidth="2.2" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="92" r="4" fill={line} />
      <g transform="translate(96 30)">
        <path d="M0 -12 C 7 -12, 11 -7, 11 -1 C 11 6, 0 14, 0 14 C 0 14, -11 6, -11 -1 C -11 -7, -7 -12, 0 -12 Z" fill={accent} />
        <circle cx="0" cy="-1" r="3.5" fill="#fff" />
      </g>
    </>
  )
}

/** 时间线场景：一本翻开的手帐 + 一支笔 */
function JournalScene({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      {/* 翻开的本子 */}
      <rect x="20" y="32" width="80" height="60" rx="4" fill="none" stroke={line} strokeWidth="2.2" />
      <line x1="60" y1="32" x2="60" y2="92" stroke={line} strokeWidth="1.5" opacity="0.5" />
      {/* 纸上线条（文字行） */}
      <line x1="28" y1="46" x2="52" y2="46" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <line x1="28" y1="56" x2="50" y2="56" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <line x1="28" y1="66" x2="44" y2="66" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <line x1="68" y1="46" x2="92" y2="46" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <line x1="68" y1="56" x2="88" y2="56" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      {/* 笔 */}
      <g transform="translate(88 88) rotate(-30)">
        <rect x="-2" y="-14" width="4" height="20" rx="1" fill={accent} />
        <polygon points="-2,6 2,6 0,12" fill={line} />
      </g>
      {/* 小图钉装饰 */}
      <circle cx="30" cy="38" r="3" fill={accent} opacity="0.7" />
    </>
  )
}

/** 心愿场景：信封 + 露出的机票 */
function EnvelopeScene({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      {/* 信封 */}
      <rect x="22" y="44" width="76" height="52" rx="4" fill="none" stroke={line} strokeWidth="2.2" />
      <path d="M22 48 L60 76 L98 48" stroke={line} strokeWidth="2" fill="none" />
      {/* 露出的机票 */}
      <g transform="translate(60 30) rotate(6)">
        <rect x="-22" y="-8" width="44" height="22" rx="3" fill="none" stroke={accent} strokeWidth="2" />
        <line x1="-14" y1="-2" x2="10" y2="-2" stroke={accent} strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
        <circle cx="14" cy="3" r="2" fill={accent} />
      </g>
      {/* 小爱心 */}
      <path d="M36 80 c -2 -3 -7 -1 -7 2 c 0 3 5 6 7 8 c 2 -2 7 -5 7 -8 c 0 -3 -5 -5 -7 -2 Z" fill={accent} opacity="0.7" />
    </>
  )
}

/** 统计场景：罗盘 */
function CompassScene({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      {/* 外圆 */}
      <circle cx="60" cy="60" r="36" fill="none" stroke={line} strokeWidth="2.2" />
      <circle cx="60" cy="60" r="28" fill="none" stroke={line} strokeWidth="1" opacity="0.4" />
      {/* 指针 */}
      <polygon points="60,38 64,60 60,82 56,60" fill={accent} opacity="0.85" />
      <polygon points="60,38 64,60 60,60" fill={accent} />
      <circle cx="60" cy="60" r="3" fill={line} />
      {/* 方位标记 N */}
      <text x="60" y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill={line} fontFamily="serif">N</text>
      {/* 小山峰装饰 */}
      <path d="M30 88 L40 76 L48 86" stroke={line} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
    </>
  )
}

/** 我的场景：行李箱 */
function LuggageScene({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      {/* 箱子主体 */}
      <rect x="34" y="42" width="52" height="56" rx="6" fill="none" stroke={line} strokeWidth="2.2" />
      {/* 提手 */}
      <path d="M48 42 L48 34 L72 34 L72 42" stroke={line} strokeWidth="2.2" fill="none" />
      {/* 拉杆 */}
      <line x1="60" y1="34" x2="60" y2="26" stroke={line} strokeWidth="2" />
      {/* 箱子绑带 */}
      <line x1="60" y1="42" x2="60" y2="98" stroke={line} strokeWidth="1.5" opacity="0.4" />
      {/* 轮子 */}
      <circle cx="44" cy="102" r="3" fill={line} />
      <circle cx="76" cy="102" r="3" fill={line} />
      {/* 贴纸 */}
      <rect x="44" y="54" width="16" height="12" rx="2" fill={accent} opacity="0.3" />
      <circle cx="76" cy="60" r="5" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.6" />
    </>
  )
}

export default function TravelIllustration({
  scene = 'empty',
  className,
}: {
  scene?: Scene
  className?: string
}) {
  const p = paletteFor(scene)

  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="旅行插画">
      <rect x="8" y="8" width="104" height="104" rx="26" fill={p.bg} />
      {scene === 'timeline' && <JournalScene line={p.line} accent={p.accent} />}
      {scene === 'wishlist' && <EnvelopeScene line={p.line} accent={p.accent} />}
      {scene === 'stats' && <CompassScene line={p.line} accent={p.accent} />}
      {scene === 'me' && <LuggageScene line={p.line} accent={p.accent} />}
      {(scene === 'empty' || scene === 'welcome' || scene === 'guest') && (
        <GenericJourney line={p.line} accent={p.accent} />
      )}
    </svg>
  )
}
