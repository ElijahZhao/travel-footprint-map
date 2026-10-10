import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import type { Checkin } from '@/lib/types'
import FilterBar, { type FilterValue } from '@/components/FilterBar'
import TravelMap from '@/components/TravelMap'
import CheckinCard from '@/components/CheckinCard'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import BottomSheet from '@/components/BottomSheet'
import { Plus, UserRound, List, SlidersHorizontal, X, Sparkles, Search, MapPin, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

  /** 纪念日：往年同月同日的打卡（每天最多冒一次，可关掉） */
  const anniversary = useMemo(() => {
    const now = new Date()
    const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const thisYear = now.getFullYear()
    const hits = checkins.filter(
      (c) => c.status === 'visited' && (c.visit_date || '').endsWith(mmdd) && Number((c.visit_date || '').slice(0, 4)) < thisYear,
    )
    if (!hits.length) return null
    return hits.sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''))[0]
  }, [checkins])
  const [annivDismissed, setAnnivDismissed] = useState(() => {
    try {
      return localStorage.getItem('anniv-dismissed') === new Date().toDateString()
    } catch {
      return false
    }
  })
  const dismissAnniv = () => {
    setAnnivDismissed(true)
    try {
      localStorage.setItem('anniv-dismissed', new Date().toDateString())
    } catch {}
  }
  const annivYears = anniversary ? new Date().getFullYear() - Number((anniversary.visit_date || '').slice(0, 4)) : 0

  /** 搜索直达打卡 */
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [searchHit, setSearchHit] = useState<Checkin | null>(null)
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const kw = keyword.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!kw) return []
    return filtered
      .filter(
        (c) =>
          c.place_name.toLowerCase().includes(kw) ||
          (c.address ?? '').toLowerCase().includes(kw) ||
          (c.tags ?? []).some((tg) => tg.toLowerCase().includes(kw)),
      )
      .slice(0, 8)
  }, [filtered, kw])
  const goHit = (c: Checkin) => {
    setSearchHit(c)
    setSearchOpen(false)
    setKeyword('')
    setFocus({ lat: c.lat, lng: c.lng, nonce: Date.now() })
  }

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6" style={{ background: 'transparent' }}>
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
        <TravelMap checkins={filtered} fill focus={focus} />

        {/* 顶部浮层：搜索 + 筛选 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-2 p-3">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={t('搜索打卡')}
            aria-expanded={searchOpen}
            className="pointer-events-auto relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.92)', color: searchOpen ? 'var(--primary)' : 'var(--foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <Search className="h-3.5 w-3.5" />
            {t('搜索')}
          </button>
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

        {/* 搜索面板：输入即搜，点结果地图直达 */}
        {searchOpen && (
          <div
            className={`absolute inset-x-3 ${panelTop} z-30 max-h-[min(46dvh,300px)] overflow-y-auto overscroll-contain rounded-xl p-3`}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('搜索地点、地址或标签')}
                className="rounded-full pl-9 pr-9"
              />
              {kw && (
                <button
                  type="button"
                  aria-label={t('清空搜索')}
                  onClick={() => setKeyword('')}
                  className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {kw && searchResults.length === 0 && (
              <p className="py-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t('没有匹配的打卡')}
              </p>
            )}
            {searchResults.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goHit(c)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--secondary)]"
              >
                <MapPin className="h-4 w-4 shrink-0" style={{ color: c.status === 'wish' ? 'var(--accent)' : 'var(--primary)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {c.place_name}
                  </span>
                  {c.visit_date && (
                    <span className="block text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                      {c.visit_date}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            ))}
          </div>
        )}

        {/* 搜索直达的结果卡：地图已平移到该点 */}
        {searchHit && !searchOpen && (
          <div className="pointer-events-none absolute inset-x-3 top-14 z-[1005] flex justify-center">
            <div className="glass-strong pointer-events-auto flex w-full max-w-[340px] items-center gap-3 rounded-2xl p-3">
              {searchHit.photos?.length > 0 ? (
                <img src={searchHit.photos[0].url} alt={searchHit.place_name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
                >
                  <MapPin className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {searchHit.place_name}
                </p>
                {searchHit.visit_date && (
                  <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                    {searchHit.visit_date}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/checkin/${searchHit.id}`)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                {t('查看详情')}
              </button>
              <button
                type="button"
                onClick={() => setSearchHit(null)}
                aria-label={t('关闭')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

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

        {/* 纪念日小卡片：一年前的今天，你在哪里 */}
        {anniversary && !annivDismissed && (
          <div className="pointer-events-none absolute inset-x-3 top-14 z-[1005] flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="glass-strong pointer-events-auto flex w-full max-w-[340px] items-center gap-3 rounded-2xl p-3 text-left"
            >
              <button
                type="button"
                onClick={() => navigate(`/checkin/${anniversary.id}`)}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                {anniversary.photos?.length > 0 ? (
                  <img src={anniversary.photos[0].url} alt={anniversary.place_name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'color-mix(in oklab, var(--theme-gold, #EFC241) 25%, white)', color: 'var(--theme-gold, #EFC241)' }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-bold" style={{ color: 'var(--theme-gold, #B8860B)' }}>
                    {t('{{n}} 年前的今天', { n: annivYears })}
                  </span>
                  <span className="block truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {t('你在 {{place}}', { place: anniversary.place_name })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={dismissAnniv}
                aria-label={t('关闭')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
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
