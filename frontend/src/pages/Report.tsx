import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import { categoryMeta } from '@/lib/categories'
import Postcard from '@/components/Postcard'
import { X, ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Checkin } from '@/lib/types'

const ease = [0.25, 0.46, 0.45, 0.94] as const

function cityOf(c: Checkin): string {
  const addr = c.address || c.place_name || ''
  const p = addr.match(/^(北京|天津|上海|重庆|河北|山西|内蒙古|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|香港|澳门|台湾)/)
  if (p) return p[1]
  return addr.split(/[市区县]/)[0] || c.place_name || '—'
}

function haversineKm(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 年度旅行报告：一页页翻的故事册，最后一页可保存总结长图 */
export default function Report() {
  const { user, guest, loading } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: checkins = [] } = useMyCheckins()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const years = useMemo(() => {
    const set = new Set<string>()
    checkins
      .filter((c) => c.status === 'visited' && c.visit_date)
      .forEach((c) => set.add((c.visit_date || '').slice(0, 4)))
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [checkins])

  const [year, setYear] = useState<string>(() => '')

  const activeYear = year || years[0] || ''

  const data = useMemo(() => {
    const list = checkins.filter((c) => c.status === 'visited' && (c.visit_date || '').startsWith(activeYear))
    const cities = new Set(list.map(cityOf))
    // 最偏爱分类
    const catCount: Record<string, number> = {}
    list.forEach((c) => (catCount[c.category] = (catCount[c.category] || 0) + 1))
    const topCatKey = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    // 最远一次
    let furthest: { place: string; month: string; km: number } | null = null
    if (list.length >= 2) {
      const cx = list.reduce((a, c) => a + c.lng, 0) / list.length
      const cy = list.reduce((a, c) => a + c.lat, 0) / list.length
      let best = list[0]
      let bestD = -1
      for (const p of list) {
        const d = haversineKm({ lng: cx, lat: cy }, { lng: p.lng, lat: p.lat })
        if (d > bestD) { bestD = d; best = p }
      }
      if (bestD >= 30) {
        furthest = { place: best.place_name, month: String(Number((best.visit_date || '').slice(5, 7)) || 1), km: Math.round(bestD) }
      }
    }
    // 最忙的月份
    const monthCount: Record<string, number> = {}
    list.forEach((c) => {
      const m = (c.visit_date || '').slice(5, 7)
      if (m) monthCount[m] = (monthCount[m] || 0) + 1
    })
    const topMonth = Object.entries(monthCount).sort((a, b) => b[1] - a[1])[0] ?? null
    // 高光地点（评分优先）
    const topPlaces = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3)
    return { list, cities: cities.size, topCatKey, topCatCount: topCatKey ? catCount[topCatKey] : 0, furthest, topMonth, topPlaces }
  }, [checkins, activeYear])

  const topCatMeta = data.topCatKey ? categoryMeta(data.topCatKey) : null

  const steps = useMemo(() => {
    if (!activeYear || data.list.length === 0) return []
    const s: number[] = []
    for (let i = 0; i < 6; i++) s.push(i)
    return s
  }, [activeYear, data.list.length])

  const saveCard = async () => {
    if (!cardRef.current || busy) return
    setBusy(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `travel-report-${activeYear}.png`
      a.click()
    } catch (e) {
      console.warn('export failed', e)
    } finally {
      setBusy(false)
    }
  }

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'transparent' }}>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('登录后查看年度报告')}</p>
      </div>
    )
  }

  if (!activeYear || steps.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8 text-center" style={{ background: 'transparent' }}>
        <Sparkles className="h-8 w-8" style={{ color: 'var(--theme-gold, #EFC241)' }} />
        <p className="font-display text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          {t('报告还在等着被写满')}
        </p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {t('先去打卡几个地方，年底这里会生成你的专属报告。')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-2 rounded-full px-5 py-2 text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {t('去打卡')}
        </button>
      </div>
    )
  }

  const total = steps.length
  const progress = step / (total - 1)

  return (
    <div className="relative flex min-h-full flex-col px-5 pb-24 pt-5" style={{ background: 'transparent' }}>
      {/* 顶部：年份切换 + 退出 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setYear(y)
                setStep(0)
              }}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
              style={
                y === activeYear
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                  : { background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
              }
            >
              {y}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate('/stats')}
          aria-label={t('退出报告')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 故事主体 */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeYear}-${step}`}
            initial={{ opacity: 0, x: 40, rotate: 1 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40, rotate: -1 }}
            transition={{ duration: 0.35, ease }}
            className="w-full"
          >
            {step === 0 && (
              <div className="text-center">
                <Sparkles className="mx-auto h-7 w-7" style={{ color: 'var(--theme-gold, #EFC241)' }} />
                <p className="mt-4 font-display text-lg" style={{ color: 'var(--muted-foreground)' }}>
                  {t('翻开这本手帐，是')}
                </p>
                <p className="mt-1 font-display text-7xl font-black" style={{ color: 'var(--primary)' }}>
                  {activeYear}
                </p>
                <p className="mt-2 font-display text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {t('你的年度旅行报告')}
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="text-center">
                <p className="font-display text-3xl font-black leading-snug" style={{ color: 'var(--foreground)' }}>
                  {t('这一年，你出发了 {{n}} 次，', { n: data.list.length })}
                  <br />
                  {t('走进了 {{m}} 座城市', { m: data.cities })}
                </p>
              </div>
            )}

            {step === 2 && topCatMeta && (
              <div className="text-center">
                <span
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: topCatMeta.color }}
                >
                  {(() => {
                    const Icon = topCatMeta.icon
                    return <Icon className="h-7 w-7" />
                  })()}
                </span>
                <p className="mt-4 font-display text-3xl font-black leading-snug" style={{ color: 'var(--foreground)' }}>
                  {t('你最偏爱「{{cat}}」，', { cat: t(topCatMeta.label) })}
                  <br />
                  {t('{{count}} 次为它停留', { count: data.topCatCount })}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                {data.furthest ? (
                  <p className="font-display text-3xl font-black leading-snug" style={{ color: 'var(--foreground)' }}>
                    {t('走得最远的一次，是 {{month}} 月的 {{place}}，', { month: data.furthest.month, place: data.furthest.place })}
                    <br />
                    <span style={{ color: 'var(--accent)' }}>{t('距 {{km}} 公里', { km: data.furthest.km })}</span>
                  </p>
                ) : (
                  <p className="font-display text-2xl font-black leading-snug" style={{ color: 'var(--foreground)' }}>
                    {t('每一步都算数，下一次会更远。')}
                  </p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="text-center">
                {data.topMonth ? (
                  <p className="font-display text-3xl font-black leading-snug" style={{ color: 'var(--foreground)' }}>
                    {t('{{month}} 月是你的旅行月，', { month: Number(data.topMonth[0]) })}
                    <br />
                    {t('一口气去了 {{n}} 个地方', { n: data.topMonth[1] })}
                  </p>
                ) : (
                  <p className="font-display text-2xl font-black" style={{ color: 'var(--foreground)' }}>
                    {t('每一段旅程都值得被记住。')}
                  </p>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div ref={cardRef} className="mx-auto w-full max-w-[360px]">
                  <Postcard checkins={data.list} variant="yearbook" />
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={saveCard}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 2px 8px rgba(43,36,32,0.15)' }}
                  >
                    <Download className="h-4 w-4" />
                    {busy ? t('生成中…') : t('保存总结长图')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部翻页控制 */}
      <div className="space-y-3">
        {/* 进度线 */}
        <div className="mx-auto h-1 w-40 overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(8, progress * 100)}%`, background: 'var(--primary)' }} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label={t('上一页')}
            className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => (step < total - 1 ? setStep((s) => s + 1) : setStep(0))}
            className="flex min-w-32 items-center justify-center gap-1 rounded-full px-6 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {step < total - 1 ? t('下一页') : t('再翻一遍')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
