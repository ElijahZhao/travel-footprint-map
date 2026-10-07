import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import FilterBar, { type FilterValue } from '@/components/FilterBar'
import TravelMap from '@/components/TravelMap'
import CheckinCard from '@/components/CheckinCard'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import BottomSheet from '@/components/BottomSheet'
import { MapPin, Plus, UserRound, List, SlidersHorizontal, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 英雄数据条中的单格指标 */
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-xl font-extrabold leading-none" style={{ color: 'var(--primary)' }}>{n}</span>
      <span className="mt-1 text-[11px] font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
    </div>
  )
}

export default function Index() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [], isLoading } = useMyCheckins()
  const [filter, setFilter] = useState<FilterValue>({ category: null, status: null })
  const [listOpen, setListOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
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

  // 顶部英雄条的总览数据（不受筛选影响，展示用户完整足迹画像）
  const stats = useMemo(() => {
    const visited = checkins.filter((c) => c.status !== 'wish').length
    const wish = checkins.filter((c) => c.status === 'wish').length
    const city = new Set(
      checkins
        .map((c) => (c.address ?? c.place_name ?? '').split(/[·•·.]/)[0]?.trim())
        .filter(Boolean),
    ).size
    return { visited, wish, city }
  }, [checkins])

  const activeFilterCount = (filter.category ? 1 : 0) + (filter.status ? 1 : 0)

  // 筛选面板 / 快捷入口的纵向起点：要让出顶部浮层区（标题行 + 英雄条 + 可能的游客条）
  const panelTop = guest ? 'top-[162px]' : 'top-[126px]'

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState
          illustration={<TravelIllustration scene="welcome" className="h-28 w-28" />}
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
    // 高度交给父级 flex 容器：本页占满「底部导航以上」的全部空间，
    // 地图铺满整块区域，浮层用相对定位贴在四周，不再依赖 100dvh 与硬编码像素。
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <TravelMap checkins={filtered} fill />

        {/* 顶部浮层区：标题行 + 英雄数据条 + （游客）提示条，整体不拦截手势，仅控件本身可点 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3">
          <div className="flex items-start gap-2">
            <div className="grad-vivid pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white shadow-lg">
              <MapPin className="h-3.5 w-3.5" /> 我的旅行地图
            </div>
            {guest && (
              <span
                className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-white shadow"
                style={{ background: 'color-mix(in oklab, var(--accent) 72%, transparent)' }}
              >
                <UserRound className="h-3 w-3" /> 游客体验
              </span>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="筛选足迹"
              aria-expanded={filterOpen}
              className="glass pointer-events-auto relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow transition active:scale-95"
              style={{ color: activeFilterCount > 0 ? 'var(--primary)' : 'var(--foreground)' }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              筛选
              {activeFilterCount > 0 && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* 英雄数据条：第一眼记忆点，毛玻璃通透层压在地图上 */}
          <div className="glass pointer-events-auto flex items-center justify-around rounded-2xl px-2 py-2.5">
            <Stat n={stats.visited} label="足迹" />
            <span className="h-8 w-px" style={{ background: 'color-mix(in oklab, var(--foreground) 10%, transparent)' }} />
            <Stat n={stats.wish} label="心愿" />
            <span className="h-8 w-px" style={{ background: 'color-mix(in oklab, var(--foreground) 10%, transparent)' }} />
            <Stat n={stats.city} label="城市" />
          </div>

          {guest && (
            <div className="pointer-events-none flex justify-center">
              <div
                className="pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] shadow"
                style={{ background: 'color-mix(in oklab, var(--accent) 16%, white)', color: 'var(--foreground)' }}
              >
                <Sparkles className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                示例数据 · 登录后保存自己的足迹
                <button onClick={() => navigate('/login')} className="font-semibold underline">升级</button>
              </div>
            </div>
          )}
        </div>

        {/* 筛选面板：让出顶部浮层区后向下铺开 */}
        {filterOpen && (
          <div
            className={`absolute inset-x-3 ${panelTop} z-30 max-h-[min(46dvh,300px)] overflow-y-auto overscroll-contain rounded-2xl p-3 shadow-xl glass-strong`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">筛选足迹</span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="收起筛选"
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in oklab, var(--foreground) 8%, transparent)', color: 'var(--muted-foreground)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <FilterBar value={filter} onChange={setFilter} />
          </div>
        )}

        {/* 收起状态下的快捷入口：点开筛选面板，避免筛选能力被隐藏后无从发现 */}
        {!filterOpen && activeFilterCount === 0 && (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`glass absolute left-3 ${panelTop} z-20 rounded-full px-3 py-1.5 text-[11px] font-medium shadow transition active:scale-95`}
            style={{ color: 'var(--muted-foreground)' }}
          >
            全部 · 全部
          </button>
        )}

        {/* 底部：查看足迹抽屉入口，毛玻璃卡压在内容区底部（pb-6 让开地图左下角署名条） */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-6">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="glass pointer-events-auto flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left shadow-lg transition active:scale-[0.99]"
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
              illustration={<TravelIllustration scene="empty" className="h-24 w-24" />}
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
    </div>
  )
}
