import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import { categoryMeta } from '@/lib/categories'
import type { Checkin } from '@/lib/types'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import { FadeIn } from '@/components/MotionPrimitives'
import { CategoryTag } from '@/components/Surface'
import { MapPin, Heart, LogIn, Search, X, Plane } from 'lucide-react'
import { Input } from '@/components/ui/input'

const ease = [0.25, 0.46, 0.45, 0.94] as const

/** 按「年-月」分组 */
function groupByMonth(items: Checkin[]) {
  const map = new Map<string, Checkin[]>()
  for (const it of items) {
    const key = (it.visit_date || '').slice(0, 7) || '未标注日期'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

function isMonthKey(key: string) {
  return /^\d{4}-\d{2}$/.test(key)
}

/** 单个时间线节点卡片 */
function TimelineItem({ item, index }: { item: Checkin; index: number }) {
  const navigate = useNavigate()
  const meta = categoryMeta(item.category)
  const Icon = meta.icon
  const isWish = item.status === 'wish'

  return (
    <motion.div
      className="relative pl-8"
      initial={{ opacity: 0, x: -18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease }}
    >
      {/* 时间轴节点 */}
      <motion.span
        className="absolute left-[7px] top-6 h-3 w-3 rounded-full ring-4"
        style={{ background: meta.hex, boxShadow: `0 0 0 3px color-mix(in oklab, ${meta.hex} 22%, transparent)` }}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: Math.min(index * 0.06, 0.4) }}
      />

      <button
        onClick={() => navigate(`/checkin/${item.id}`)}
        className="card-paper flex w-full items-stretch gap-3 overflow-hidden rounded-3xl p-2.5 text-left transition-transform active:scale-[0.985]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* 照片 / 分类占位 */}
        <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-2xl">
          {item.photos?.length > 0 ? (
            <img src={item.photos[0].url} alt={item.place_name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: `color-mix(in oklab, ${meta.hex} 18%, var(--secondary))`, color: meta.hex }}
            >
              <Icon className="h-7 w-7" />
            </div>
          )}
          {!isWish && item.rating > 0 && (
            <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1 text-[10px] font-semibold text-white">
              {item.rating}.0
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{item.place_name}</p>
            {isWish && (
              <Heart className="h-3 w-3 shrink-0" style={{ color: 'var(--family)' }} fill="currentColor" />
            )}
          </div>
          {item.address && (
            <p className="flex items-center gap-1 truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.address}</span>
            </p>
          )}
          {item.mood_text && (
            <p className="line-clamp-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {item.mood_text}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-2">
            <CategoryTag label={meta.label} icon={Icon} color={meta.hex} />
            {item.visit_date && (
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {item.visit_date.slice(5)}
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}

export default function Timeline() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [] } = useMyCheckins()
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  const kw = keyword.trim().toLowerCase()

  const visited = useMemo(() => {
    const base = checkins
      .filter((c) => c.status === 'visited')
      .sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''))
    if (!kw) return base
    return base.filter(
      (c) => c.place_name.toLowerCase().includes(kw) || (c.address ?? '').toLowerCase().includes(kw),
    )
  }, [checkins, kw])
  const wishes = useMemo(() => checkins.filter((c) => c.status === 'wish'), [checkins])
  const groups = useMemo(() => groupByMonth(visited), [visited])
  const searching = kw.length > 0

  if (!loading && !user && !guest) {
    return (
      <div className="page-bg paper-texture flex min-h-full items-center justify-center px-6">
        <EmptyState icon={LogIn} title="登录后查看时间线" description="按时间回顾你的每一次出发。" />
      </div>
    )
  }

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-6">
        <FadeIn>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
                时间线
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {searching ? `找到 ${visited.length} 段旅程` : `共 ${visited.length} 段旅程，慢慢回看`}
              </p>
            </div>
            <button
              type="button"
              aria-label="搜索足迹"
              onClick={() => {
                setSearchOpen((v) => !v)
                if (searchOpen) setKeyword('')
              }}
              className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95"
              style={{ color: 'var(--primary)' }}
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          </div>
        </FadeIn>

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="timeline-search"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease }}
              className="overflow-hidden"
            >
              <div className="relative pt-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <Input
                  ref={inputRef}
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索地点或地址，如「大理」"
                  className="rounded-full pl-9 pr-9"
                />
                {searching && (
                  <button
                    type="button"
                    aria-label="清空搜索"
                    onClick={() => {
                      setKeyword('')
                      inputRef.current?.focus()
                    }}
                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {searching && visited.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="empty" className="h-24 w-24" />}
            title="没有找到相关地点"
            description={`没有匹配「${keyword.trim()}」的旅程，换个关键词试试。`}
          />
        ) : visited.length === 0 && wishes.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="empty" className="h-24 w-24" />}
            title="还没有记录"
            description="去地图页新增你的第一个打卡吧。"
          />
        ) : (
          <>
            {groups.map(([month, items]) => (
              <section key={month} className="space-y-3">
                {/* 年月分组标题：衬线大字 + 滚动吸顶，编辑式节奏 */}
                <FadeIn duration={0.4} className="sticky top-1 z-20 -mx-4 px-4 pt-1">
                  <div
                    className="flex items-end justify-between rounded-2xl px-3 py-2 backdrop-blur-md"
                    style={{ background: 'color-mix(in oklab, var(--background) 80%, transparent)' }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-5xl font-black leading-none text-grad-vivid">
                        {isMonthKey(month) ? Number(month.split('-')[1]) : '—'}
                      </span>
                      {isMonthKey(month) && <span className="text-lg font-semibold">月</span>}
                      {isMonthKey(month) && (
                        <span className="ml-1.5 text-[11px] tracking-[0.2em]" style={{ color: 'var(--muted-foreground)' }}>
                          {month.split('-')[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {items.length} 段旅程
                    </span>
                  </div>
                </FadeIn>

                {/* 时间轴主线（虚线航线）+ 起点小飞机 */}
                <div className="relative space-y-3">
                  <span
                    className="absolute bottom-6 left-[12px] top-2 w-0.5 rounded-full"
                    style={{
                      background:
                        'repeating-linear-gradient(180deg, color-mix(in oklab, var(--primary) 55%, transparent) 0 5px, transparent 5px 11px)',
                    }}
                  />
                  <Plane
                    className="absolute left-[6px] top-0 z-10 h-4 w-4 -rotate-[18deg]"
                    style={{ color: 'var(--primary)' }}
                  />
                  {items.map((c, i) => (
                    <TimelineItem key={c.id} item={c} index={i} />
                  ))}
                </div>
              </section>
            ))}

            {wishes.length > 0 && (
              <section className="space-y-3">
                <FadeIn duration={0.4}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ background: 'var(--family)' }}
                    >
                      <Heart className="h-3 w-3" fill="currentColor" /> 心愿单
                    </span>
                    <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {wishes.length} 个
                    </span>
                  </div>
                </FadeIn>
                <div className="relative space-y-3">
                  <span
                    className="absolute bottom-6 left-[12px] top-2 w-0.5 rounded-full"
                    style={{
                      background:
                        'repeating-linear-gradient(180deg, color-mix(in oklab, var(--family) 50%, transparent) 0 5px, transparent 5px 11px)',
                    }}
                  />
                  {wishes.map((c, i) => (
                    <TimelineItem key={c.id} item={c} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
