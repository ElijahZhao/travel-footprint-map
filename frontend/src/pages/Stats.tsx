import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useStats, computeStats } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import CountUp from '@/components/CountUp'
import { FadeIn } from '@/components/MotionPrimitives'
import { Surface, SectionTitle, ProgressBar } from '@/components/Surface'
import { useTranslation } from 'react-i18next'
import { MapPin, Globe2, Sparkles, BarChart3, CalendarRange } from 'lucide-react'

/** 两点间距离（km），用于找出「走得最远的一次」 */
function haversineKm(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

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

const ease = [0.25, 0.46, 0.45, 0.94] as const

export default function Stats() {
  const { t } = useTranslation()
  const { user, guest, loading, enterGuest } = useAuth()
  const { data: checkins = [] } = useMyCheckins()
  const { data: stats } = useStats(user?.uid ?? '')
  const visited = checkins.filter((c) => c.status === 'visited')
  const localStats = useMemo(() => computeStats(checkins), [checkins])
  const s = guest ? localStats : (stats ?? localStats)

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of visited) map[c.category] = (map[c.category] || 0) + 1
    return CATEGORIES.map((cat) => ({ ...cat, count: map[cat.key] || 0 }))
  }, [visited])

  const byYear = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of visited) {
      const y = (c.visit_date || '').slice(0, 4)
      if (y) map[y] = (map[y] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }, [visited])

  const litProvinces = useMemo(() => {
    const set = new Set<string>()
    visited.forEach((c) => {
      const p = provinceOf(c.address) || provinceOf(c.place_name)
      if (p) set.add(p)
    })
    return set
  }, [visited])

  const recent = useMemo(
    () =>
      [...visited]
        .filter((c) => c.visit_date)
        .sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''))
        .slice(0, 3),
    [visited],
  )

  /** 找出离「足迹重心」最远的一次出行，作为编辑式英雄句的素材 */
  const furthest = useMemo(() => {
    const pts = visited.filter((c) => c.lng && c.lat && c.visit_date)
    if (pts.length < 2) return null
    const cx = pts.reduce((a, c) => a + c.lng, 0) / pts.length
    const cy = pts.reduce((a, c) => a + c.lat, 0) / pts.length
    let best = pts[0]
    let bestD = -1
    for (const p of pts) {
      const d = haversineKm({ lng: cx, lat: cy }, { lng: p.lng, lat: p.lat })
      if (d > bestD) {
        bestD = d
        best = p
      }
    }
    if (bestD < 30) return null
    const [y, m] = (best.visit_date || '').split('-')
    return { place: best.place_name, year: y, month: Number(m), km: Math.round(bestD) }
  }, [visited])

  const heroNum = furthest ? furthest.km : s.visited
  const heroUnit = furthest ? t('公里外的远方') : t('段足迹')
  const heroSentence = furthest
    ? t('这一年走得最远的一次，是 {{year}} 年 {{month}} 月的 {{place}}。', { year: furthest.year, month: furthest.month, place: furthest.place })
    : t('你已在 {{cities}} 座城市，留下 {{visited}} 段旅程。', { cities: s.cities, visited: s.visited })

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count))
  const maxYear = Math.max(1, ...byYear.map(([, n]) => n))

  const donutSegments = useMemo(() => {
    const total = byCategory.reduce((a, c) => a + c.count, 0)
    if (!total) return ''
    let acc = 0
    return byCategory
      .filter((c) => c.count > 0)
      .map((c) => {
        const start = (acc / total) * 360
        acc += c.count
        const end = (acc / total) * 360
        return `${c.hex} ${start}deg ${end}deg`
      })
      .join(', ')
  }, [byCategory])

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  if (!loading && !user && !guest) {
    return (
      <div className="page-bg paper-texture flex min-h-full items-center justify-center px-6">
        <EmptyState icon={Globe2} title={t('登录后查看统计')} description={t('看看你走过多少城市、点亮多少分类。')} />
      </div>
    )
  }

  if (visited.length === 0) {
    return (
      <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
        <main className="relative z-10 space-y-6">
          <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
            {t('旅行统计')}
          </h1>
          <EmptyState
            illustration={<TravelIllustration scene="stats" className="h-24 w-24" />}
            title={t('还没有已打卡记录')}
            description={t('在地图页记录你去过的地方，这里会生成你的足迹报告。')}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-5">
        <FadeIn>
          <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
            {t('旅行统计')}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('你的足迹数据报告')}
          </p>
        </FadeIn>

        {/* 引导句：一句有人的话，宋体，不做渐变背景 */}
        <FadeIn>
          <p className="font-display text-lg leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {heroSentence}
          </p>
        </FadeIn>

        {/* 4 个数据小卡横排：白底、大宋体数字，不做渐变 hero */}
        <FadeIn>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { n: s.visited, label: t('段足迹') },
              { n: s.cities, label: t('座城市') },
              { n: litProvinces.size, label: t('个省份') },
              { n: heroNum, label: heroUnit },
            ].map((stat, i) => (
              <div
                key={i}
                className="card-paper rounded-2xl p-4 text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="font-display text-3xl font-black leading-none tabular-nums" style={{ color: 'var(--primary)' }}>
                  <CountUp value={stat.n} />
                </div>
                <div className="mt-1.5 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 分类占比：环形图 + 图例 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
          <SectionTitle icon={Sparkles} className="mb-4">
            {t('分类占比')}
          </SectionTitle>
            <div className="flex items-center gap-5">
              <motion.div
                className="relative h-36 w-36 shrink-0 rounded-full"
                style={{ background: donutSegments || 'var(--secondary)' }}
                initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
                whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div
                  className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full"
                  style={{ background: 'var(--card)' }}
                >
                  <span className="font-display font-black leading-none" style={{ fontSize: 'var(--font-size-title)', color: 'var(--foreground)' }}>
                    <CountUp value={visited.length} />
                  </span>
                  <span className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t('个足迹')}
                  </span>
                </div>
              </motion.div>
              <div className="min-w-0 flex-1 space-y-2">
                {byCategory.map((c, i) => {
                  const pct = visited.length ? Math.round((c.count / visited.length) * 100) : 0
                  return (
                    <motion.div
                      key={c.key}
                      className="flex items-center justify-between text-sm"
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.hex }} />
                        <span className="truncate">{t(c.label)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {c.count}
                        <span className="ml-1 text-[11px] opacity-70">{pct}%</span>
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </Surface>
        </FadeIn>

        {/* 分类分布条 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
          <SectionTitle icon={BarChart3} className="mb-4">
            {t('分类分布')}
          </SectionTitle>
            <div className="space-y-3.5">
              {byCategory.map((c, i) => {
                const Icon = c.icon
                const pct = Math.round((c.count / maxCat) * 100)
                return (
                  <div key={c.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" style={{ color: c.hex }} />
                        {t(c.label)}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {c.count}
                      </span>
                    </div>
                    <ProgressBar value={pct} color={c.hex} delay={i * 0.06} />
                  </div>
                )
              })}
            </div>
          </Surface>
        </FadeIn>

        {/* 年度足迹柱状图 */}
        {byYear.length > 0 && (
          <FadeIn>
            <Surface pad="lg" className="card-paper">
          <SectionTitle icon={CalendarRange} className="mb-4">
            {t('年度足迹')}
          </SectionTitle>
              <div className="flex h-36 items-end justify-between gap-2">
                {byYear.map(([year, n], i) => (
                  <div key={year} className="flex flex-1 flex-col items-center gap-1">
                    <motion.span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: 'var(--primary)' }}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {n}
                    </motion.span>
                    <motion.div
                      className="w-full rounded-t-md"
                      style={{
                        background: 'var(--accent)',
                      }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(n / maxYear) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.65, delay: i * 0.05, ease: 'easeOut' }}
                    />
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {year}
                    </span>
                  </div>
                ))}
              </div>
            </Surface>
          </FadeIn>
        )}

        {/* 省份点亮 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle icon={Globe2}>{t('省份点亮')}</SectionTitle>
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {t('{{n}} / {{m}}', { n: litProvinces.size, m: PROVINCES.length })}
              </span>
            </div>
            <ProgressBar value={(litProvinces.size / PROVINCES.length) * 100} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PROVINCES.map((p) => {
                const lit = litProvinces.has(p)
                return (
                  <span
                    key={p}
                    title={p}
                    className="rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{
                      background: lit ? 'var(--primary)' : 'var(--secondary)',
                      color: lit ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    {p}
                  </span>
                )
              })}
            </div>
          </Surface>
        </FadeIn>

        {/* 最近打卡 */}
        {recent.length > 0 && (
          <FadeIn>
            <Surface pad="lg" className="card-paper">
          <SectionTitle icon={MapPin} className="mb-3">
            {t('最近打卡')}
          </SectionTitle>
              <div className="space-y-2">
                {recent.map((c, i) => {
                  const meta = categoryMeta(c.category)
                  const Icon = meta.icon
                  return (
                    <motion.div
                      key={c.id}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `color-mix(in oklab, ${meta.hex} 18%, transparent)`, color: meta.hex }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.place_name}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {c.address || t(meta.label)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {c.visit_date}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </Surface>
          </FadeIn>
        )}
      </main>
    </div>
  )
}
