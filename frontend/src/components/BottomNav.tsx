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

/** 底部导航：5 tab，无 FAB。选中图标 Q 弹一下 + 小脚印指示点。 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <nav
      className="relative z-40 flex shrink-0 items-stretch border-t pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
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
            {/* key=pathname 让切换时图标重新播放 Q 弹动画 */}
            <motion.span
              key={`icon-${pathname}`}
              animate={active ? { scale: [1, 1.35, 0.92, 1.12, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex"
            >
              <Icon
                className="h-5 w-5"
                style={{
                  color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                  strokeWidth: active ? 2.4 : 2,
                }}
              />
            </motion.span>
            <span
              className="text-[11px] leading-none"
              style={{
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                fontWeight: active ? 700 : 500,
              }}
            >
              {t(item.label)}
            </span>
            {active && (
              <motion.span
                layoutId="nav-underline"
                className="absolute bottom-0 flex h-[6px] w-7 items-center justify-center"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              >
                {/* 一前一后两只小脚印，代替呆板的下划线 */}
                <span className="nav-footprint" />
                <span className="nav-footprint nav-footprint--2" />
              </motion.span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
