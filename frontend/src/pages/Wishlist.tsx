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
import { CategoryTag } from '@/components/Surface'
import { Heart, MapPin, Check, Sparkles, Compass, CalendarCheck, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏',
  '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西',
  '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏',
  '新疆', '香港', '澳门', '台湾',
]

function provinceOf(address?: string | null): string | null {
  if (!address) return null
  for (const p of PROVINCES) if (address.startsWith(p)) return p
  return null
}

function WishCard({ item, lit, index, onComplete }: { item: Checkin; lit: boolean; index: number; onComplete?: () => void }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const meta = categoryMeta(item.category)
  const Icon = meta.icon

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
    >
      {/* 未点亮的愿望：贴一颗手绘星星贴纸，「总有一天要去」的期待感 */}
      {!lit && (
        <span
          className="absolute -top-1.5 right-3 z-10 flex h-6 w-6 rotate-12 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in oklab, var(--theme-gold, #d9b25f) 22%, white)', color: 'var(--theme-gold, #d9b25f)', boxShadow: '0 1px 3px rgba(43,36,32,0.15)' }}
          aria-hidden="true"
        >
          <Star className="h-3.5 w-3.5" fill="currentColor" />
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/checkin/${item.id}`)}
        className="flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl p-3 text-left"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(43,36,32,0.04)',
          opacity: lit ? 1 : 0.85,
        }}
      >
        {/* 缩略图 */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
          {item.photos?.length > 0 ? (
            <img
              src={item.photos[0].url}
              alt={item.place_name}
              loading="lazy"
              className="h-full w-full object-cover"
              style={{ filter: lit ? 'none' : 'grayscale(0.7) opacity(0.7)' }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
          {lit && (
            <span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
              style={{ background: 'var(--primary)' }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm" style={{ color: lit ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
            {item.place_name}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {lit ? (item.address || item.place_name || t('已去过')) : (item.address || t('想去的地方'))}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <CategoryTag label={t(meta.label)} icon={Icon} color="var(--muted-foreground)" />
            {lit && item.visit_date && (
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {item.visit_date}
              </span>
            )}
          </div>
        </div>
        {!lit && <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />}
      </div>
      {!lit && onComplete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onComplete() }}
          className="mt-1.5 ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
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
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'transparent' }}>
        <EmptyState icon={Compass} title={t('登录后使用心愿清单')} description={t('列出想去的地方，并点亮你去过的省份。')} />
      </div>
    )
  }

  const totalLit = visited.length
  const totalAll = visited.length + wishes.length
  const litPct = totalAll ? (totalLit / totalAll) * 100 : 0

  return (
    <div className="relative min-h-full px-4 pb-28 pt-6" style={{ background: 'transparent' }}>
      <main className="space-y-6">
        {/* 标题 + 按钮 */}
        <FadeIn>
          <div className="space-y-3">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                {t('心愿 & 点亮')}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('想去的地方，一个一个点亮')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-10 flex-1 gap-1.5 rounded-lg"
                onClick={() => navigate('/checkin/new')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                <CalendarCheck className="h-4 w-4" /> {t('记录打卡')}
              </Button>
              <Button
                size="sm"
                className="h-10 flex-1 gap-1.5 rounded-lg"
                onClick={() => navigate('/wish/new')}
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                <Heart className="h-4 w-4" fill="currentColor" /> {t('添加心愿')}
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* 点亮进度 + 省份 */}
        <FadeIn>
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.04)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-semibold text-sm">{t('点亮进度')}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                {t('{{n}} / {{m}}', { n: totalLit, m: totalAll })}
              </span>
            </div>
            <p className="mb-2 mt-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {t('已点亮 {{lit}} 个 · 还有 {{rest}} 个心愿等你出发', { lit: totalLit, rest: wishes.length })}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 50%, var(--accent)))' }}
                initial={{ width: 0 }}
                whileInView={{ width: `${litPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            {/* 省份点亮——只显示已点亮的 */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t('省份点亮')}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  {t('{{n}} / {{m}}', { n: litProvinces.size, m: PROVINCES.length })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROVINCES.filter(p => litProvinces.has(p)).map((p) => (
                  <span
                    key={p}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    {p}
                  </span>
                ))}
                {litProvinces.size === 0 && (
                  <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{t('还没有点亮省份')}</span>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* 分类筛选 */}
        <FadeIn>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCat(null)}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium"
              style={
                activeCat === null
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                  : { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium"
                  style={
                    active
                      ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                      : { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(c.label)}
                </button>
              )
            })}
          </div>
        </FadeIn>

        {/* 心愿列表 */}
        {shownGroups.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="wishlist" className="h-24 w-24" />}
            title={wishes.length === 0 ? t('心愿单还是空的') : t('没有符合条件的心愿')}
            description={wishes.length === 0 ? t('把想去的地方加进来，出发后点「完成此心愿」就能点亮它。') : t('试试切换分类筛选。')}
            action={
              wishes.length === 0 ? (
                <Button onClick={() => navigate('/wish/new')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                  <Plus className="h-4 w-4" /> {t('添加心愿')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          shownGroups.map(({ cat, wish, done }) => {
            const Icon = cat.icon
            const shown = wish.length > 0 ? wish : []
            return (
              <section key={cat.key} className="space-y-3">
                <FadeIn duration={0.4}>
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                      <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t(cat.label)}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {t('心愿 {{wish}} · 已点亮 {{done}}', { wish: wish.length, done: done.length })}
                    </span>
                  </div>
                </FadeIn>
                {done.map((c, i) => (
                  <WishCard key={c.id} item={c} lit index={i} />
                ))}
                {shown.map((c, i) => (
                  <WishCard
                    key={c.id}
                    item={c}
                    lit={false}
                    index={done.length + i}
                    onComplete={() => navigate(`/checkin/${c.id}/edit?complete=1`)}
                  />
                ))}
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
