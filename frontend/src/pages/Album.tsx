import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import WavyUnderline from '@/components/WavyUnderline'
import { FadeIn } from '@/components/MotionPrimitives'
import { ArrowLeft, LogIn, Download, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Checkin } from '@/lib/types'

interface PhotoItem {
  url: string
  checkin: Checkin
}

/** 把「地名 · 日期 · 小徽标」烙进照片，再触发下载；跨域失败时退化为打开原图 */
async function downloadWatermarked(url: string, place: string, date: string, fallbackMsg: string) {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(img, 0, 0)
    // 尺寸随图片缩放（以 800px 宽为基准）
    const s = Math.max(0.7, canvas.width / 800)
    const pad = 14 * s
    const r = 9 * s // 圆形徽标半径
    ctx.font = `600 ${15 * s}px Inter, system-ui, sans-serif`
    const label = `${place}${date ? ` · ${date}` : ''}`
    const tw = ctx.measureText(label).width
    const barW = tw + pad * 2 + r * 2 + 6 * s
    const barH = r * 2 + pad * 0.9
    const x = pad
    const y = canvas.height - barH - pad
    // 半透明白底圆角条
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, barH / 2)
    ctx.fill()
    // 苹果绿小圆徽标 + 白色纸飞机（简化为三角）
    const cx = x + pad + r
    const cy = y + barH / 2
    ctx.fillStyle = '#38A05F'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.45, cy + r * 0.35)
    ctx.lineTo(cx + r * 0.55, cy - r * 0.05)
    ctx.lineTo(cx - r * 0.45, cy - r * 0.25)
    ctx.closePath()
    ctx.fill()
    // 文字
    ctx.fillStyle = '#2B2420'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx + r + 6 * s, cy + 1)
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${place}${date ? `-${date}` : ''}.png`
    a.click()
  } catch {
    // 画布被跨域污染等场景：退化为直接打开原图
    toast.error(fallbackMsg)
    window.open(url, '_blank')
  }
}

/** 足迹相册：所有打卡照片按时间流排成瀑布照片墙，点开进详情 */
export default function Album() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: checkins = [] } = useMyCheckins()

  // 能后退就后退，否则回到首页（避免直接打开相册页时返回失效）
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  const photos = useMemo<PhotoItem[]>(() => {
    return checkins
      .filter((c) => c.status === 'visited' && c.photos?.length)
      .sort((a, b) => String(b.visit_date).localeCompare(String(a.visit_date)))
      .flatMap((c) => c.photos.map((p) => ({ url: p.url, checkin: c })))
  }, [checkins])

  const tripCount = useMemo(() => new Set(photos.map((p) => p.checkin.id)).size, [photos])

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'transparent' }}>
        <EmptyState icon={LogIn} title={t('登录后查看相册')} description={t('你的每一张旅行照片都会收进这里。')} />
      </div>
    )
  }

  return (
    <div className="relative min-h-full px-4 pb-28 pt-6" style={{ background: 'transparent' }}>
      <main className="space-y-5">
        <FadeIn>
          <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-[var(--background)]/90 px-4 py-2 backdrop-blur" style={{ marginTop: '-0.5rem' }}>
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
              aria-label={t('返回')}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{t('足迹相册')}</span>
          </div>
          <div className="mt-2">
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {t('足迹相册')}
              <Star className="sticker-wiggle ml-2 inline h-5 w-5" style={{ color: 'var(--theme-gold, #EFC241)' }} />
            </h1>
            <WavyUnderline />
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {t('{{n}} 张照片，{{m}} 段旅程', { n: photos.length, m: tripCount })}
            </p>
          </div>
        </FadeIn>

        {photos.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="timeline" className="h-24 w-24" />}
            title={t('还没有照片')}
            description={t('打卡时添几张照片，这里就会长出一面照片墙。')}
          />
        ) : (
          <div className="columns-2 gap-3">
            {photos.map((ph, i) => (
              <motion.button
                key={`${ph.checkin.id}-${i}`}
                type="button"
                onClick={() => navigate(`/checkin/${ph.checkin.id}`)}
                className="relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl text-left"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.05)', transition: 'transform 0.25s ease' }}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
              >
                {/* 拍立得胶带角 */}
                <span
                  className="pointer-events-none absolute -top-1.5 left-1/2 h-4 w-12 -translate-x-1/2 rotate-[-5deg]"
                  style={{ background: 'rgba(242,151,85,0.55)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                />
                <img src={ph.url} alt={ph.checkin.place_name} loading="lazy" className="w-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                {/* 保存带水印的图片（地名+日期+小徽标） */}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t('保存图片')}
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadWatermarked(ph.url, ph.checkin.place_name, ph.checkin.visit_date ?? '', t('照片跨域受限，已打开原图'))
                  }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm"
                  style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--primary)' }}
                >
                  <Download className="h-4 w-4" />
                </span>
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                    {ph.checkin.place_name}
                  </p>
                  {ph.checkin.visit_date && (
                    <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {ph.checkin.visit_date}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
