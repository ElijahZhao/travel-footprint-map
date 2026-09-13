import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import FilterBar, { type FilterValue } from '@/components/FilterBar'
import TravelMap from '@/components/TravelMap'
import CheckinCard from '@/components/CheckinCard'
import EmptyState from '@/components/EmptyState'
import BottomSheet from '@/components/BottomSheet'
import { MapPin, Plus, UserRound, Compass, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Index() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [], isLoading } = useMyCheckins()
  const [filter, setFilter] = useState<FilterValue>({ category: null, status: null })
  const [listOpen, setListOpen] = useState(false)
  const navigate = useNavigate()

  // 未登录且未进入游客模式时，自动进入游客模式，让用户一进来就能看到示例地图
  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  const filtered = useMemo(() => {
    return checkins.filter((c) => {
      if (filter.category && c.category !== filter.category) return false
      if (filter.status && c.status !== filter.status) return false
      return true
    })
  }, [checkins, filter])

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState
          icon={Compass}
          title="欢迎来到旅行打卡地图"
          description="在这里记录你去过的风景、美食与城市，点亮专属的旅行足迹。"
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate('/login')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                登录 / 注册
              </Button>
              <Button variant="outline" className="gap-1" onClick={() => enterGuest()}>
                <UserRound className="h-4 w-4" /> 游客体验
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <TravelMap checkins={filtered} fill />

      {/* 顶部：标题 + 分类筛选 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 p-3">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div
            className="grad-vivid rounded-full px-3.5 py-1.5 text-sm font-semibold text-white shadow-md"
          >
            我的旅行地图
          </div>
          {guest && (
            <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white shadow">游客体验</span>
          )}
        </div>
        <div className="pointer-events-auto -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterBar value={filter} onChange={setFilter} />
        </div>
      </div>

      {/* 游客提示条 */}
      {guest && (
        <div className="pointer-events-none absolute inset-x-0 top-[104px] z-10 flex justify-center px-3">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] shadow"
            style={{ background: 'color-mix(in oklab, var(--accent) 16%, white)', color: 'var(--foreground)' }}
          >
            <span>示例数据 · 登录后保存自己的足迹</span>
            <button onClick={() => navigate('/login')} className="font-semibold underline">升级</button>
          </div>
        </div>
      )}

      {/* 底部：查看足迹抽屉入口 */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3 pb-[88px]">
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-left shadow-lg backdrop-blur"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <List className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            {filtered.length} 个足迹
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>查看列表 →</span>
        </button>
      </div>

      <BottomSheet open={listOpen} onClose={() => setListOpen(false)} title="我的足迹">
        {isLoading ? (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={checkins.length === 0 ? '还没有打卡记录' : '没有符合条件的地点'}
            description={checkins.length === 0 ? '点击下方按钮记录你的第一个足迹吧。' : '试着切换分类或状态筛选。'}
            action={
              checkins.length === 0 ? (
                <Button onClick={() => navigate('/checkin/new')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                  <Plus className="h-4 w-4" /> 新增打卡
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((c) => (
              <CheckinCard key={c.id} checkin={c} />
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
