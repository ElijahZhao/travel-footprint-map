import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, Clock, Heart, BarChart3, User, type LucideIcon } from 'lucide-react'

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: '地图', icon: MapPin },
  { to: '/timeline', label: '时间线', icon: Clock },
  { to: '/wishlist', label: '心愿', icon: Heart },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/me', label: '我的', icon: User },
]

/** 底部 5 模块导航栏，激活项用 framer-motion 共享布局做滑动高亮。 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    // 作为 flex 子项参与布局（不再 absolute）：
    // 这样才能真实占据底部空间，让上方内容区正确避让，也不会被地图等全屏内容覆盖。
    <nav
      className="relative z-40 flex shrink-0 items-stretch justify-around border-t pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'color-mix(in oklab, var(--card) 92%, transparent)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 -4px 18px oklch(0.30 0.02 85 / 0.06)',
      }}
    >
      {TABS.map((item) => {
        const active = pathname === item.to
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-x-2.5 inset-y-1 rounded-2xl"
                style={{
                  background:
                    'linear-gradient(140deg, color-mix(in oklab, var(--primary) 20%, transparent), color-mix(in oklab, var(--accent) 16%, transparent))',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <motion.span
              className="relative z-10 flex flex-col items-center gap-1"
              animate={active ? { y: -1.5 } : { y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              <Icon
                className="h-5 w-5"
                style={{
                  color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                  strokeWidth: active ? 2.4 : 2,
                }}
              />
              <span
                className="text-[11px] leading-none"
                style={{
                  color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {t(item.label)}
              </span>
            </motion.span>
          </Link>
        )
      })}
    </nav>
  )
}
