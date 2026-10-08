import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import type { Checkin } from '@/lib/types'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import { FadeIn } from '@/components/MotionPrimitives'
import { Surface, SectionTitle, ProgressBar, CategoryTag } from '@/components/Surface'
import { Heart, MapPin, Check, Sparkles, Compass, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

/** 中国大陆省级行政区（含直辖市/自治区/特别行政区，用于点亮） */
const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏',
  '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西',
  '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏',
  '新疆', '香港', '澳门', '台湾',
]

/** 从地址中粗略提取省级前缀 */
function provinceOf(address?: string | null): string | null {
  if (!address) return null
  for (const p of PROVINCES) {
    if (address.startsWith(p)) return p
  }
  return null
}

/** 单个心愿/足迹卡：未点亮=灰虚线 + 可「完成此心愿」，点亮=彩色发光 + 打勾 */
function WishCard({
  item,
  lit,
  index,
  onComplete,
}: {
  item: Checkin
  lit: boolean
  index: number
  onComplete?: () => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const meta = categoryMeta(item.category)
  const Icon = meta.icon

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.35), ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/checkin/${item.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/checkin/${item.id}`)
          }
        }}
        className={`flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-3xl p-2.5 text-left transition-transform active:scale-[0.985] ${lit ? 'lit-glow match-strike' : ''}`}
        style={{
          background: lit ? 'var(--card)' : 'color-mix(in oklab, var(--secondary) 70%, var(--card))',
          border: lit ? '1px solid var(--border)' : '1.5px dashed color-mix(in oklab, var(--muted-foreground) 32%, transparent)',
        }}
      >
        {/* 缩略图：点亮=彩色，未点亮=灰调 */}
        <div className="relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-2xl">
          {item.photos?.length > 0 ? (
            <img
              src={item.photos[0].url}
              alt={item.place_name}
              className="h-full w-full object-cover"
              style={{ filter: lit ? 'none' : 'grayscale(0.85) opacity(0.6)' }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: lit ? `color-mix(in oklab, ${meta.hex} 18%, var(--card))` : 'var(--secondary)',
                color: lit ? meta.hex : 'var(--muted-foreground)',
              }}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
          {/* 点亮打勾徽标 */}
          {lit && (
            <motion.span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
              style={{ background: 'var(--primary)' }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.15 }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          )}
          {/* 未点亮：想去邮戳，强化「尚未抵达」的缺席感 */}
          {!lit && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium"
                style={{
                  color: 'var(--muted-foreground)',
                  borderColor: 'color-mix(in oklab, var(--muted-foreground) 45%, transparent)',
                  transform: 'rotate(-8deg)',
                }}
              >
                {t('想去')}
              </span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" style={{ color: lit ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
            {item.place_name}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {item.address || '想去的地方'}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <CategoryTag label={t(meta.label)} icon={Icon} color={lit ? meta.hex : 'var(--muted-foreground)'} />
            {lit && item.visit_date && (
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {item.visit_date}
              </span>
            )}
          </div>
        </div>

        {!lit && <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />}
      </div>

      {/* 未点亮心愿：一键去完成 */}
      {!lit && onComplete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          className="mt-1.5 ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
          style={{
            background: 'color-mix(in oklab, var(--accent) 16%, var(--card))',
            color: 'var(--accent)',
            border: '1px solid color-mix(in oklab, var(--accent) 38%, transparent)',
          }}
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          {t('完成此心愿')}
        </button>
      )}
    </motion.div>
  )
}

export default function Wishlist() {
  const { t } = useTranslation()
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [] } = useMyCheckins()
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  const { litProvinces, wishes, visited } = useMemo(() => {
    const lit = new Set<string>()
    const vis = checkins.filter((c) => c.status === 'visited')
    vis.forEach((c) => {
      const p = provinceOf(c.address) || provinceOf(c.place_name)
      if (p) lit.add(p)
    })
    const w = checkins.filter((c) => c.status === 'wish')
    return { litProvinces: lit, wishes: w, visited: vis }
  }, [checkins])

  /** 6 大分类分区（每个分区含该分类的心愿 + 已点亮足迹） */
  const byCategory = useMemo(
    () =>
      CATEGORIES.map((cat) => {
        const wish = wishes.filter((c) => c.category === cat.key)
        const done = visited.filter((c) => c.category === cat.key)
        return { cat, wish, done, total: wish.length + done.length }
      }).filter((g) => g.total > 0),
    [wishes, visited],
  )

  const shownGroups = useMemo(
    () => (activeCat ? byCategory.filter((g) => g.cat.key === activeCat) : byCategory),
    [byCategory, activeCat],
  )

  if (!loading && !user && !guest) {
    return (
      <div className="page-bg paper-texture flex min-h-full items-center justify-center px-6">
        <EmptyState icon={Compass} title={t('登录后使用心愿清单')} description={t('列出想去的地方，并点亮你去过的省份。')} />
      </div>
    )
  }

  const totalLit = visited.length
  const totalAll = visited.length + wishes.length
  const litPct = totalAll ? (totalLit / totalAll) * 100 : 0

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-5">
        <FadeIn>
          <div className="space-y-3">
            <div>
              <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
                {t('心愿 & 点亮')}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('想去的地方，一个一个点亮')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-10 flex-1 gap-1.5 rounded-full"
                onClick={() => navigate('/checkin/new')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                <CalendarCheck className="h-4 w-4" /> {t('记录打卡')}
              </Button>
              <Button
                size="sm"
                className="h-10 flex-1 gap-1.5 rounded-full text-white"
                onClick={() => navigate('/wish/new')}
                style={{
                  background: 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.72 0.14 295))',
                }}
              >
                <Heart className="h-4 w-4" fill="currentColor" /> {t('添加心愿')}
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* 点亮总进度 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Sparkles}>{t('点亮进度')}</SectionTitle>
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {t('{{n}} / {{m}}', { n: totalLit, m: totalAll })}
              </span>
            </div>
            <p className="mb-2 mt-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              已点亮 {t('{{lit}} 个 · 还有 {{rest}} 个心愿等你出发', { lit: totalLit, rest: wishes.length })}
            </p>
            <ProgressBar value={litPct} />
            {/* 省份点亮 */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t('省份点亮')}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  {t('{{n}} / {{m}}', { n: litProvinces.size, m: PROVINCES.length })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROVINCES.map((p, i) => {
                  const lit = litProvinces.has(p)
                  return (
                    <motion.span
                      key={p}
                      title={p}
                      className="rounded-lg px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: lit ? 'var(--primary)' : 'var(--secondary)',
                        color: lit ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(i * 0.012, 0.3) }}
                    >
                      {p}
                    </motion.span>
                  )
                })}
              </div>
            </div>
          </Surface>
        </FadeIn>

        {/* 分类筛选 chip */}
        <FadeIn>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCat(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                activeCat === null ? '' : 'glass'
              }`}
              style={
                activeCat === null
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                  : { color: 'var(--foreground)' }
              }
            >
              {t('全部')}
            </button>
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              const active = activeCat === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(active ? null : c.key)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                    active ? '' : 'glass'
                  }`}
                  style={active ? { background: c.hex, color: 'white' } : { color: 'var(--foreground)' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(c.label)}
                </button>
              )
            })}
          </div>
        </FadeIn>

        {shownGroups.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="empty" className="h-24 w-24" />}
            title={wishes.length === 0 ? t('心愿单还是空的') : t('没有符合条件的心愿')}
            description={
              wishes.length === 0
                ? t('把想去的地方加进来，出发后点「完成此心愿」就能点亮它。')
                : t('试试切换分类筛选。')
            }
            action={
              wishes.length === 0 ? (
                <Button
                  onClick={() => navigate('/wish/new')}
                  className="text-white"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.72 0.14 295))',
                  }}
                >
                  {t('添加心愿')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          shownGroups.map(({ cat, wish, done }) => {
            const Icon = cat.icon
            const shown = wish.length > 0 ? wish : []
            return (
              <section key={cat.key} className="space-y-2.5">
                <FadeIn duration={0.4}>
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={Icon} color={cat.hex}>
                      {t(cat.label)}
                    </SectionTitle>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {t('心愿 {{wish}} · 已点亮 {{done}}', { wish: wish.length, done: done.length })}
                    </span>
                  </div>
                </FadeIn>

                {/* 已点亮（彩色发光） */}
                {done.map((c, i) => (
                  <WishCard key={c.id} item={c} lit index={i} />
                ))}
                {/* 未点亮心愿（灰虚线）—— 可直接「完成此心愿」 */}
                {shown.map((c, i) => (
                  <WishCard
                    key={c.id}
                    item={c}
                    lit={false}
                    index={done.length + i}
                    onComplete={() => navigate(`/checkin/${c.id}/edit?complete=1`)}
                  />
                ))}
                {wish.length === 0 && done.length === 0 && (
                  <p className="py-2 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t('这个分类还没有记录')}
                  </p>
                )}
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
