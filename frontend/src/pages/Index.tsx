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
import { Plus, UserRound, List, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export default function Index() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { t } = useTranslation()
  const { data: checkins = [], isLoading } = useMyCheckins()
  const [filter, setFilter] = useState<FilterValue>({ category: null, status: null })
  const [listOpen, setListOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const navigate = useNavigate()

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

  const activeFilterCount = (filter.category ? 1 : 0) + (filter.status ? 1 : 0)
  const visitedCount = filtered.filter((c) => c.status === 'visited').length
  const wishCount = filtered.filter((c) => c.status === 'wish').length
  const panelTop = guest ? 'top-[60px]' : 'top-[60px]'

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState
          illustration={<TravelIllustration scene="welcome" className="h-28 w-28" />}
          title={t('欢迎来到旅行打卡地图')}
          description={t('在这里记录你去过的风景、美食与城市，点亮专属的旅行足迹。')}
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate('/login')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                {t('登录 / 注册')}
              </Button>
              <Button variant="outline" className="gap-1" onClick={() => enterGuest()}>
                <UserRound className="h-4 w-4" /> {t('游客体验')}
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <TravelMap checkins={filtered} fill />

        {/* 顶部浮层：只保留筛选按钮 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end p-3">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label={t('筛选足迹')}
            aria-expanded={filterOpen}
            className="pointer-events-auto relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.92)', color: activeFilterCount > 0 ? 'var(--primary)' : 'var(--foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('筛选')}
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

        {/* 筛选面板 */}
        {filterOpen && (
          <div
            className={`absolute inset-x-3 ${panelTop} z-30 max-h-[min(46dvh,300px)] overflow-y-auto overscroll-contain rounded-xl p-3`}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{t('筛选足迹')}</span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label={t('收起筛选')}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <FilterBar value={filter} onChange={setFilter} />
          </div>
        )}

        {/* 底部：查看足迹抽屉入口 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-6">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="glass-strong pointer-events-auto flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <List className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              {t('{{visited}} 个足迹·{{wish}} 个心愿', { visited: visitedCount, wish: wishCount })}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{t('查看列表 →')}</span>
          </button>
        </div>

        <BottomSheet open={listOpen} onClose={() => setListOpen(false)} title="我的足迹">
          {isLoading ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('加载中…')}</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration={<TravelIllustration scene="empty" className="h-24 w-24" />}
              title={checkins.length === 0 ? t('还没有打卡记录') : t('没有符合条件的地点')}
              description={checkins.length === 0 ? t('点击下方按钮记录你的第一个足迹吧。') : t('试着切换分类或状态筛选。')}
              action={
                checkins.length === 0 ? (
                  <Button onClick={() => navigate('/checkin/new')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                    <Plus className="h-4 w-4" /> {t('新增打卡')}
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
