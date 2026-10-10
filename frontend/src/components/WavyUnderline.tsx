/**
 * 蜡笔感波浪下划线：页面标题下的一笔手绘波浪，载入时描边画出。
 */
export default function WavyUnderline({ color = 'var(--theme-gold, #d9b25f)' }: { color?: string }) {
  return (
    <svg
      className="mt-1 block h-[8px] w-[72px]"
      viewBox="0 0 72 8"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="squiggle-path"
        d="M2 5 Q 8 1, 14 5 T 26 5 T 38 5 T 50 5 T 62 5 T 74 5"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
