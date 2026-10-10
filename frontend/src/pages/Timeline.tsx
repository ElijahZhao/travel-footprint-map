import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import type { Checkin } from '@/lib/types'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import { FadeIn } from '@/components/MotionPrimitives'
import { CategoryTag } from '@/components/Surface'
import { MapPin, Heart, LogIn, Search, X, Star, Send, TrainFront, Footprints, Compass, Flag, Images } from 'lucide-react'
import WavyUnderline from '@/components/WavyUnderline'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

const ease = [0.25, 0.46, 0.45, 0.94] as const

/** 按「年 → 月」分组，年份之间可标注空白期 */
function groupByYear(items: Checkin[]) {
  const byYear = new Map<string, Checkin[]>()
  for (const it of items) {
    const y = (it.visit_date || '').slice(0, 4) || '未标注年份'
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push(it)
  }
  return Array.from(byYear.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, list]) => {
      const months = new Map<string, Checkin[]>()
      for (const it of list) {
        const m = (it.visit_date || '').slice(0, 7) || '未标注日期'
        if (!months.has(m)) months.set(m, [])
        months.get(m)!.push(it)
      }
      const monthGroups = Array.from(months.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
      return { year, monthGroups }
    })
}

function isMonthKey(key: string) {
  return /^\d{4}-\d{2}$/.test(key)
}

function Stars({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="h-3 w-3" fill="currentColor" />
      ))}
    </span>
  )
}

/** 童趣装饰：时间线节点轮换的小徽章（纸飞机 / 小火车 / 小脚印 / 指南针） */
const JOURNEY_ICONS = [Send, TrainFront, Footprints, Compass]

/** 单个时间线节点 — 大照片 + 文字 */
function TimelineItem({ item, index }: { item: Checkin; index: number }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const meta = categoryMeta(item.category)
  const Icon = meta.icon
  const isWish = item.status === 'wish'

  return (
    <motion.div
      className="relative flex gap-3"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease }}
    >
      {/* 时间轴节点：轮换的童趣小徽章 + 虚线航线 */}
      <div className="flex w-7 shrink-0 flex-col items-center pt-4">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
          style={{
            borderColor: isWish ? 'var(--accent)' : 'var(--primary)',
            background: 'var(--card)',
            color: isWish ? 'var(--accent)' : 'var(--primary)',
            transform: `rotate(${(index % 2 === 0 ? -1 : 1) * 8}deg)`,
          }}
        >
          {(() => {
            const Deco = JOURNEY_ICONS[index % JOURNEY_ICONS.length]
            return <Deco className="h-3.5 w-3.5" />
          })()}
        </span>
        <span className="mt-1 w-0 flex-1 border-l-2 border-dashed" style={{ borderColor: 'var(--border)' }} />
      </div>
      <button
        onClick={() => navigate(`/checkin/${item.id}`)}
        className="min-w-0 flex-1 overflow-hidden rounded-2xl text-left"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.04)' }}
      >
        {/* 大照片 — 占满宽度；无照片时直接文字卡片 */}
        {item.photos?.length > 0 ? (
          <div className="relative">
            <img
              src={item.photos[0].url}
              alt={item.place_name}
              loading="lazy"
              className="h-48 w-full object-cover"
            />
            {isWish && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                <Heart className="h-3 w-3" fill="currentColor" /> {t('心愿')}
              </span>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {!item.photos?.length && (
                <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              )}
              <p className="truncate font-semibold text-base">{item.place_name}</p>
            </div>
            <Stars n={item.rating} />
          </div>

          {item.address && (
            <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.address}</span>
            </p>
          )}

          {item.mood_text && (
            <p className="line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {item.mood_text}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <CategoryTag label={t(meta.label)} icon={Icon} color={meta.color} />
            {item.visit_date && (
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {item.visit_date}
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}

export default function Timeline() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [] } = useMyCheckins()
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set())
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  const kw = keyword.trim().toLowerCase()
  const visitedAll = useMemo(
    () => checkins.filter((c) => c.status === 'visited').sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || '')),
    [checkins],
  )
  const allTags = useMemo(
    () => Array.from(new Set(visitedAll.flatMap((c) => c.tags ?? []))).slice(0, 14),
    [visitedAll],
  )
  const visited = useMemo(() => {
    let base = visitedAll
    if (activeCats.size) base = base.filter((c) => activeCats.has(c.category))
    if (activeTags.size) base = base.filter((c) => (c.tags ?? []).some((tg) => activeTags.has(tg)))
    if (!kw) return base
    return base.filter(
      (c) => c.place_name.toLowerCase().includes(kw) || (c.address ?? '').toLowerCase().includes(kw),
    )
  }, [visitedAll, activeCats, activeTags, kw])

  const wishes = useMemo(() => checkins.filter((c) => c.status === 'wish'), [checkins])
  const yearGroups = useMemo(() => groupByYear(visited), [visited])
  const searching = kw.length > 0

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'transparent' }}>
        <EmptyState icon={LogIn} title={t('登录后查看时间线')} description={t('按时间回顾你的每一次出发。')} />
      </div>
    )
  }

  return (
    <div className="relative min-h-full px-4 pb-32 pt-6" style={{ background: 'transparent' }}>
      <main className="space-y-8">
        {/* 页面标题 */}
        <FadeIn>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                {t('时间线')}
              </h1>
              <WavyUnderline />
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {searching ? t('找到 {{n}} 段旅程', { n: visited.length }) : t('共 {{n}} 段旅程，慢慢回看', { n: visited.length })}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={t('足迹相册')}
                onClick={() => navigate('/album')}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--theme-gold, #EFC241)' }}
              >
                <Images className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t('心愿清单')}
                onClick={() => navigate('/wishlist')}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--accent)' }}
              >
                <Heart className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t('搜索足迹')}
                onClick={() => {
                  setSearchOpen((v) => !v)
                  if (searchOpen) setKeyword('')
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--primary)' }}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </FadeIn>

        {/* 搜索框 */}
        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="timeline-search"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <Input
                  ref={inputRef}
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t('搜索地点或地址，如「大理」')}
                  className="rounded-full pl-9 pr-9"
                />
                {searching && (
                  <button
                    type="button"
                    aria-label={t('清空搜索')}
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

        {/* 筛选：分类 + 标签 */}
        {(CATEGORIES.length > 0 || allTags.length > 0) && (
          <FadeIn>
            <div className="space-y-2">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((c) => {
                  const active = activeCats.has(c.key)
                  const Icon = c.icon
                  return (
                    <button
                      key={c.key}
                      onClick={() => setActiveCats((prev) => { const n = new Set(prev); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n })}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium"
                      style={active ? { background: 'var(--primary)', color: 'var(--primary-foreground)' } : { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t(c.label)}
                    </button>
                  )
                })}
              </div>
              {allTags.length > 0 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {allTags.map((tg) => {
                    const active = activeTags.has(tg)
                    return (
                      <button
                        key={tg}
                        onClick={() => setActiveTags((prev) => { const n = new Set(prev); n.has(tg) ? n.delete(tg) : n.add(tg); return n })}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
                        style={active ? { background: 'var(--accent)', color: 'var(--accent-foreground)' } : { background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                      >
                        #{tg}
                      </button>
                    )
                  })}
                </div>
              )}
              {(activeCats.size > 0 || activeTags.size > 0) && (
                <button
                  onClick={() => { setActiveCats(new Set()); setActiveTags(new Set()) }}
                  className="text-xs font-medium"
                  style={{ color: 'var(--primary)' }}
                >
                  {t('清除筛选')}
                </button>
              )}
            </div>
          </FadeIn>
        )}

        {/* 空状态 */}
        {searching && visited.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="timeline" className="h-24 w-24" />}
            title={t('没有找到相关地点')}
            description={t('没有匹配「{{kw}}」的旅程，换个关键词试试。', { kw: keyword.trim() })}
          />
        ) : visited.length === 0 && wishes.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="timeline" className="h-24 w-24" />}
            title={t('还没有记录')}
            description={t('去地图页新增你的第一个打卡吧。')}
          />
        ) : (
          <>
            {/* 按年份 → 月份分组，年份之间标注空白期 */}
            {yearGroups.map(({ year, monthGroups }, gi) => {
              const prevYear = gi > 0 ? yearGroups[gi - 1].year : null
              const gap = prevYear && /^\d{4}$/.test(prevYear) && /^\d{4}$/.test(year) ? Number(year) - Number(prevYear) : 0
              return (
                <Fragment key={year}>
                  {gap > 1 && (
                    <div className="py-1 text-center text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                      {t('— 中间 {{n}} 年暂无记录 —', { n: gap - 1 })}
                    </div>
                  )}
                  <section className="space-y-6">
                    {/* 年份大标题 */}
                    <FadeIn duration={0.4}>
                      <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2">
                          {/* 邮戳徽章：像护照章一样斜盖在年份旁 */}
                          <span
                            className="flex h-7 w-7 -rotate-12 items-center justify-center rounded-full border-2 border-dashed"
                            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                            aria-hidden="true"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-display text-3xl font-black tracking-tight" style={{ color: 'var(--primary)' }}>
                            {year}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {t('{{n}} 段旅程', { n: monthGroups.reduce((a, [, its]) => a + its.length, 0) })}
                        </span>
                      </div>
                    </FadeIn>
                    {monthGroups.map(([month, items]) => (
                      <section key={month} className="space-y-4">
                        {/* 月份小标题 — 杂志期号感 */}
                        <FadeIn duration={0.4}>
                          <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-baseline gap-2">
                              <span className="font-display text-5xl font-black leading-none" style={{ color: 'var(--primary)' }}>
                                {isMonthKey(month) ? Number(month.split('-')[1]) : '—'}
                              </span>
                              {isMonthKey(month) && <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('月')}</span>}
                              {/* 月度小旗：这一月立了一面小旗 */}
                              <Flag className="ml-0.5 h-3.5 w-3.5 -rotate-6" style={{ color: 'var(--theme-gold, #d9b25f)' }} fill="currentColor" />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {t('{{n}} 段旅程', { n: items.length })}
                            </span>
                          </div>
                        </FadeIn>
                        <div className="space-y-4">
                          {items.map((c, i) => (
                            <TimelineItem key={c.id} item={c} index={i} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </section>
                </Fragment>
              )
            })}

            {/* 心愿单 */}
            {wishes.length > 0 && (
              <section className="space-y-4">
                <FadeIn duration={0.4}>
                  <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <Heart className="h-4 w-4" style={{ color: 'var(--accent)' }} fill="currentColor" />
                    <span className="font-display text-xl font-bold" style={{ color: 'var(--foreground)' }}>{t('心愿单')}</span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {t('{{n}} 个', { n: wishes.length })}
                    </span>
                  </div>
                </FadeIn>
                <div className="space-y-4">
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
