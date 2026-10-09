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
import { MapPin, Heart, LogIn, Search, X, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

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

/** 单个时间线节点 — 大照片 + 文字 */
function TimelineItem({ item, index }: { item: Checkin; index: number }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const meta = categoryMeta(item.category)
  const Icon = meta.icon
  const isWish = item.status === 'wish'

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease }}
    >
      <button
        onClick={() => navigate(`/checkin/${item.id}`)}
        className="block w-full overflow-hidden rounded-2xl text-left"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.04)' }}
      >
        {/* 大照片 — 占满宽度 */}
        {item.photos?.length > 0 ? (
          <div className="relative">
            <img
              src={item.photos[0].url}
              alt={item.place_name}
              className="h-48 w-full object-cover"
            />
            {isWish && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                <Heart className="h-3 w-3" fill="currentColor" /> {t('心愿')}
              </span>
            )}
          </div>
        ) : (
          <div
            className="flex h-32 w-full items-center justify-center"
            style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
          >
            <Icon className="h-12 w-12" />
          </div>
        )}

        <div className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-base">{item.place_name}</p>
            <Stars n={item.rating} />
          </div>

          {item.address && (
            <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.address}</span>
            </p>
          )}

          {item.mood_text && (
            <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {item.mood_text}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <CategoryTag label={t(meta.label)} icon={Icon} color="var(--muted-foreground)" />
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
  const { t } = useTranslation()
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
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState icon={LogIn} title={t('登录后查看时间线')} description={t('按时间回顾你的每一次出发。')} />
      </div>
    )
  }

  return (
    <div className="min-h-full px-4 pb-28 pt-6" style={{ background: 'var(--background)' }}>
      <main className="space-y-8">
        {/* 页面标题 */}
        <FadeIn>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                {t('时间线')}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {searching ? t('找到 {{n}} 段旅程', { n: visited.length }) : t('共 {{n}} 段旅程，慢慢回看', { n: visited.length })}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('搜索足迹')}
              onClick={() => {
                setSearchOpen((v) => !v)
                if (searchOpen) setKeyword('')
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--primary)' }}
            >
              <Search className="h-4 w-4" />
            </button>
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
            {/* 按月份分组 */}
            {groups.map(([month, items]) => (
              <section key={month} className="space-y-4">
                {/* 月份大标题 — 杂志期号感 */}
                <FadeIn duration={0.4}>
                  <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-black leading-none" style={{ color: 'var(--primary)' }}>
                        {isMonthKey(month) ? Number(month.split('-')[1]) : '—'}
                      </span>
                      {isMonthKey(month) && <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('月')}</span>}
                      {isMonthKey(month) && (
                        <span className="ml-2 text-xs tracking-[0.15em]" style={{ color: 'var(--muted-foreground)' }}>
                          {month.split('-')[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {t('{{n}} 段旅程', { n: items.length })}
                    </span>
                  </div>
                </FadeIn>

                {/* 打卡列表 — 大照片卡片 */}
                <div className="space-y-4">
                  {items.map((c, i) => (
                    <TimelineItem key={c.id} item={c} index={i} />
                  ))}
                </div>
              </section>
            ))}

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
