import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useStats, computeStats } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import CountUp from '@/components/CountUp'
import { FadeIn } from '@/components/MotionPrimitives'
import { useTranslation } from 'react-i18next'
import { MapPin, Globe2, Sparkles, BarChart3, CalendarRange } from 'lucide-react'

/** 两点间距离（km） */
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

  /** 走得最远的一次 */
  const furthest = useMemo(() => {
    const pts = visited.filter((c) => c.lng && c.lat && c.visit_date)
    if (pts.length < 2) return null
    const cx = pts.reduce((a, c) => a + c.lng, 0) / pts.length
    const cy = pts.reduce((a, c) => a + c.lat, 0) / pts.length
    let best = pts[0]
    let bestD = -1
    for (const p of pts) {
      const d = haversineKm({ lng: cx, lat: cy }, { lng: p.lng, lat: p.lat })
      if (d > bestD) { bestD = d; best = p }
    }
    if (bestD < 30) return null
    const [y, m] = (best.visit_date || '').split('-')
    return { place: best.place_name, year: y, month: Number(m), km: Math.round(bestD) }
  }, [visited])

  const heroSentence = furthest
    ? t('这一年走得最远的一次，是 {{year}} 年 {{month}} 月的 {{place}}。', { year: furthest.year, month: furthest.month, place: furthest.place })
    : t('你已在 {{cities}} 座城市，留下 {{visited}} 段旅程。', { cities: s.cities, visited: s.visited })

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count))
  const maxYear = Math.max(1, ...byYear.map(([, n]) => n))

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState icon={Globe2} title={t('登录后查看统计')} description={t('看看你走过多少城市、点亮多少分类。')} />
      </div>
    )
  }

  if (visited.length === 0) {
    return (
      <div className="min-h-full px-4 pb-28 pt-6" style={{ background: 'var(--background)' }}>
        <main className="space-y-6">
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {t('旅行年鉴')}
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
    <div className="min-h-full px-4 pb-28 pt-6" style={{ background: 'var(--background)' }}>
      <main className="space-y-8">
        {/* 标题 + 引导语 */}
        <FadeIn>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {t('旅行年鉴')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {t('你的足迹数据报告')}
            </p>
          </div>
        </FadeIn>

        {/* 引导句 — 杂志式导语 */}
        <FadeIn>
          <p className="font-display text-lg leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {heroSentence}
          </p>
        </FadeIn>

        {/* 核心数字 — 大数字横排，不用卡片 */}
        <FadeIn>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {[
              { n: s.visited, label: t('段足迹') },
              { n: s.cities, label: t('座城市') },
              { n: litProvinces.size, label: t('个省份') },
              { n: furthest ? furthest.km : s.visited, label: furthest ? t('公里外的远方') : t('段足迹') },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-5xl font-black leading-none tabular-nums" style={{ color: 'var(--primary)' }}>
                  <CountUp value={stat.n} />
                </div>
                <div className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 分类分布 — 横条图，不用环形图 */}
        <FadeIn>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <BarChart3 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('分类分布')}</span>
            </div>
            <div className="space-y-3">
              {byCategory.map((c, i) => {
                const Icon = c.icon
                const pct = Math.round((c.count / maxCat) * 100)
                return (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--muted-foreground)' }} />
                        {t(c.label)}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {c.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--primary)' }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* 年度足迹 — 柱状图 */}
        {byYear.length > 0 && (
          <FadeIn>
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <CalendarRange className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('年度足迹')}</span>
              </div>
              <div className="flex h-32 items-end justify-between gap-3">
                {byYear.map(([year, n], i) => (
                  <div key={year} className="flex flex-1 flex-col items-center gap-2">
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
                      className="w-full rounded-t-sm"
                      style={{ background: 'var(--accent)' }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(n / maxYear) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                    />
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* 省份点亮 */}
        <FadeIn>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('省份点亮')}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                {t('{{n}} / {{m}}', { n: litProvinces.size, m: PROVINCES.length })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--primary)' }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(litProvinces.size / PROVINCES.length) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROVINCES.map((p) => {
                const lit = litProvinces.has(p)
                return (
                  <span
                    key={p}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
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
          </div>
        </FadeIn>

        {/* 最近打卡 — 大照片 */}
        {recent.length > 0 && (
          <FadeIn>
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <MapPin className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('最近打卡')}</span>
              </div>
              <div className="space-y-4">
                {recent.map((c, i) => {
                  const meta = categoryMeta(c.category)
                  const Icon = meta.icon
                  return (
                    <motion.div
                      key={c.id}
                      className="overflow-hidden rounded-2xl"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                    >
                      {c.photos?.length > 0 && (
                        <img src={c.photos[0].url} alt={c.place_name} className="h-36 w-full object-cover" />
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-semibold text-sm">{c.place_name}</p>
                          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                            {c.visit_date}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          <Icon className="h-3 w-3" />
                          {t(meta.label)}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  )
}
