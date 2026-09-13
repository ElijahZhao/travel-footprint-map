import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useStats, computeStats } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import EmptyState from '@/components/EmptyState'
import CountUp from '@/components/CountUp'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import { Surface, SectionTitle, ProgressBar } from '@/components/Surface'
import { MapPin, Globe2, CheckCircle2, Heart, Sparkles, BarChart3, Compass, CalendarRange } from 'lucide-react'

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
        <EmptyState icon={Globe2} title="登录后查看统计" description="看看你走过多少城市、点亮多少分类。" />
      </div>
    )
  }

  if (visited.length === 0) {
    return (
      <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
        <main className="relative z-10 space-y-6">
          <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
            旅行统计
          </h1>
          <EmptyState icon={Compass} title="还没有已打卡记录" description="在地图页记录你去过的地方，这里会生成你的足迹报告。" />
        </main>
      </div>
    )
  }

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-5">
        <FadeIn>
          <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
            旅行统计
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            你的足迹数据报告
          </p>
        </FadeIn>

        {/* 核心数字看板 */}
        <Stagger className="grid grid-cols-2 gap-3" stagger={0.07}>
          <StatCard label="打卡总数" value={s.total} icon={MapPin} color="var(--primary)" />
          <StatCard label="已去" value={s.visited} icon={CheckCircle2} color="var(--success)" />
          <StatCard label="心愿" value={s.wish} icon={Heart} color="var(--family)" />
          <StatCard label="城市" value={s.cities} icon={Globe2} color="var(--accent)" />
        </Stagger>

        {/* 分类占比：环形图 + 图例 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
            <SectionTitle icon={Sparkles} className="mb-4">
              分类占比
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
                  <span className="font-bold leading-none" style={{ fontSize: 'var(--font-size-title)', color: 'var(--foreground)' }}>
                    <CountUp value={visited.length} />
                  </span>
                  <span className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    个足迹
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
                        <span className="truncate">{c.label}</span>
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
              分类分布
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
                        {c.label}
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
                年度足迹
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
                      className="w-full rounded-t-lg"
                      style={{
                        background: 'linear-gradient(var(--primary), color-mix(in oklab, var(--primary) 55%, var(--accent)))',
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
              <SectionTitle icon={Globe2}>省份点亮</SectionTitle>
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {litProvinces.size} / {PROVINCES.length}
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
                最近打卡
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
                          {c.address || meta.label}
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
}) {
  return (
    <motion.div
      className="card-paper relative overflow-hidden rounded-3xl p-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease }}
    >
      {/* 角落色晕 */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full"
        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)` }}
      />
      <span
        className="relative flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="relative mt-2 font-bold tabular-nums leading-none" style={{ fontSize: 'var(--font-size-headline)', color }}>
        <CountUp value={value} />
      </div>
      <p className="relative mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </p>
    </motion.div>
  )
}
