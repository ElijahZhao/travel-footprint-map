import { type ReactNode, type CSSProperties } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * 手帐风卡片表面 —— 圆角 + 柔影 + 极淡纸纹，全站统一质感基线。
 * 与概念图对齐：更舒展的留白、16~20px 圆角、暖调阴影。
 */
interface SurfaceProps {
  children: ReactNode
  className?: string
  /** 内边距级别 */
  pad?: 'none' | 'sm' | 'md' | 'lg'
  /** 点击态（可交互卡片） */
  interactive?: boolean
  style?: CSSProperties
  onClick?: () => void
}

const PAD = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const

export function Surface({ children, className, pad = 'md', interactive, style, onClick }: SurfaceProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-3xl',
        interactive && 'cursor-pointer transition-transform active:scale-[0.985]',
        PAD[pad],
        className,
      )}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--ds-shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** 带入场动画 + 悬浮抬升的卡片包装 */
export function MotionSurface({
  children,
  className,
  style,
  ...props
}: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div
      className={cn('relative overflow-hidden rounded-3xl', className)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--ds-shadow-sm)',
        ...style,
      }}
      whileHover={{ y: -3, boxShadow: 'var(--ds-shadow-md)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** 区块小标题（左侧色条 + 标题 + 右侧操作） */
export function SectionTitle({
  children,
  icon: Icon,
  color = 'var(--primary)',
  right,
  className,
}: {
  children: ReactNode
  icon?: React.ComponentType<{ className?: string; style?: CSSProperties }>
  color?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h2 className="flex items-center gap-2 font-semibold">
        {Icon && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        {children}
      </h2>
      {right}
    </div>
  )
}

/** 分类小徽标（图标 + 文案，按分类着色） */
export function CategoryTag({
  label,
  icon: Icon,
  color,
  className,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', className)}
      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

/** 进度条（可动画） */
export function ProgressBar({
  value,
  color = 'var(--primary)',
  className,
  animate = true,
  delay = 0,
}: {
  value: number
  color?: string
  className?: string
  animate?: boolean
  delay?: number
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full', className)} style={{ background: 'var(--secondary)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={animate ? { width: 0 } : false}
        whileInView={animate ? { width: `${pct}%` } : undefined}
        animate={animate ? undefined : { width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
  )
}
