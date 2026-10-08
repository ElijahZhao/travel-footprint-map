import { type ReactNode } from 'react'
import { Plane } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** 邮戳：把日期做成印章质感（轻微旋转 + 虚线环 + 褪色墨色），是「旅行手帐」的签名细节之一。 */
export function Postmark({ date, className = '' }: { date?: string | null; className?: string }) {
  const { t } = useTranslation()
  const text = date ? date.replace(/-/g, '·') : t('未标注')
  return (
    <span
      className={`inline-flex select-none items-center justify-center rounded-full border border-dashed px-2.5 py-0.5 text-[10px] font-medium tracking-wider ${className}`}
      style={{
        color: 'var(--muted-foreground)',
        borderColor: 'color-mix(in oklab, var(--muted-foreground) 42%, transparent)',
        transform: 'rotate(-5deg)',
      }}
    >
      {text}
    </span>
  )
}

/** 邮票外框：齿孔虚线边 + 轻微旋转，用于成就徽章「邮票集」隐喻。 */
export function Stamp({
  children,
  got = true,
  rotation = 0,
  className = '',
  title,
}: {
  children: ReactNode
  got?: boolean
  rotation?: number
  className?: string
  title?: string
}) {
  return (
    <div
      title={title}
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 ${className}`}
      style={{
        background: got ? 'color-mix(in oklab, var(--primary) 9%, var(--card))' : 'var(--secondary)',
        border: `1.5px dashed ${got ? 'color-mix(in oklab, var(--primary) 40%, transparent)' : 'var(--border)'}`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: got ? '0 5px 16px oklch(0.45 0.05 85 / 0.10)' : 'none',
      }}
    >
      {children}
    </div>
  )
}

/** 装饰性航线：虚线路径 + 起点圆点 + 尾端小飞机，用于时间线主线与空状态点缀。 */
export function FlightRoute({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <svg viewBox="0 0 220 70" className="h-full w-full" fill="none">
        <path
          d="M10 56 C 58 26, 86 52, 126 32 S 186 12, 210 22"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeDasharray="1 7"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="10" cy="56" r="3" fill="var(--primary)" opacity="0.6" />
      </svg>
      <Plane
        className="absolute right-0 top-0.5 h-4 w-4 -rotate-[22deg]"
        style={{ color: 'var(--primary)', opacity: 0.7 }}
      />
    </div>
  )
}
