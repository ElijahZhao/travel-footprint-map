import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, Clock, BarChart3, User, Plus, type LucideIcon } from 'lucide-react'

const TABS_LEFT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: '地图', icon: MapPin },
  { to: '/timeline', label: '时间线', icon: Clock },
]
const TABS_RIGHT: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/me', label: '我的', icon: User },
]

/** 底部导航：左2 tab + 中间FAB + 右2 tab。心愿页从时间线页进入。 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const renderTab = (item: { to: string; label: string; icon: LucideIcon }) => {
    const active = pathname === item.to
    const Icon = item.icon
    return (
      <Link
        key={item.to}
        to={item.to}
        className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
        aria-current={active ? 'page' : undefined}
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
        {active && (
          <motion.span
            layoutId="nav-underline"
            className="absolute bottom-0 h-[2px] w-6 rounded-full"
            style={{ background: 'var(--primary)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
      </Link>
    )
  }

  return (
    <nav
      className="relative z-40 flex shrink-0 items-stretch border-t pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
      }}
    >
      {TABS_LEFT.map(renderTab)}

      {/* 中间 FAB */}
      <div className="relative flex w-16 items-start justify-center">
        <motion.button
          type="button"
          aria-label={t('记录打卡')}
          onClick={() => navigate('/checkin/new')}
          className="flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 2px 8px rgba(43,36,32,0.15)',
            marginTop: '-20px',
          }}
          whileTap={{ scale: 0.92 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </motion.button>
      </div>

      {TABS_RIGHT.map(renderTab)}
    </nav>
  )
}
