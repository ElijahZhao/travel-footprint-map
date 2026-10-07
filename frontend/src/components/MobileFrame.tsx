import { type ReactNode } from 'react'

/**
 * 移动端外壳：在桌面端居中显示一个带手机边框的"真机"视图，
 * 在手机端则铺满全屏。所有页面内容都限制在这个框内滚动。
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] w-full justify-center"
      style={{ background: 'linear-gradient(160deg, oklch(0.92 0.02 85), oklch(0.95 0.015 85))' }}
    >
      {/* shrink-0 防止在 flex 父级中被压缩，保证真机视图高度稳定 */}
      <div className="relative h-[100dvh] w-full max-w-[440px] shrink-0 overflow-hidden bg-[var(--background)] md:my-6 md:h-[860px] md:rounded-[2.6rem] md:border-[10px] md:border-zinc-900/90 md:shadow-2xl">
        {children}
      </div>
    </div>
  )
}
