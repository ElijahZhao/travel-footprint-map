import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { MapPin, Plus, Clock, BarChart3, Heart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '地图', icon: MapPin },
  { to: '/timeline', label: '时间线', icon: Clock },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/wishlist', label: '心愿', icon: Heart },
]

export default function Navbar() {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur"
      style={{
        background: 'color-mix(in oklab, var(--background) 80%, transparent)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold" style={{ color: 'var(--primary)' }}>
          <MapPin className="h-5 w-5" />
          <span style={{ fontSize: 'var(--font-size-title)' }}>脚印地图</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                )}
                style={{
                  color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  background: active ? 'var(--primary)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => navigate('/checkin/new')}
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <Plus className="h-4 w-4" /> 打卡
          </Button>

          {loading ? (
            <Skeleton className="h-9 w-20 rounded-full" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/me')}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-[var(--secondary)]"
              >
                <User className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                <span className="max-w-20 truncate text-sm">{user.name || user.email}</span>
              </button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                退出
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              登录
            </Button>
          )}
        </div>
      </div>

      {/* 移动端底部导航 */}
      <nav className="flex items-center justify-around border-t pb-1 pt-1 sm:hidden" style={{ borderColor: 'var(--border)' }}>
        {NAV.map((item) => {
          const active = location.pathname === item.to
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
              style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)' }}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={() => navigate(user ? '/me' : '/login')}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <User className="h-4 w-4" />
          我的
        </button>
      </nav>
    </header>
  )
}
