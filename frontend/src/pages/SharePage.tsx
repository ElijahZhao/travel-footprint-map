import { useNavigate, useParams } from 'react-router-dom'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import { usePublicCheckins } from '@/lib/hooks'
import TravelMap from '@/components/TravelMap'
import CheckinCard from '@/components/CheckinCard'
import EmptyState from '@/components/EmptyState'
import Postcard from '@/components/Postcard'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import AmbientBackground from '@/components/AmbientBackground'
import { Surface } from '@/components/Surface'
import { useTranslation } from 'react-i18next'
import { MapPin, Globe2, ArrowRight, UserRound, Download, ImageIcon, X } from 'lucide-react'

export default function SharePage() {
  const { t } = useTranslation()
  const { publicId } = useParams()
  const { data: checkins = [], isLoading } = usePublicCheckins(publicId ?? '')
  const navigate = useNavigate()

  const [exportOpen, setExportOpen] = useState(false)
  const [variant, setVariant] = useState<'postcard' | 'yearbook'>('postcard')
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
      })
      const a = document.createElement('a')
      a.download = `travel-${variant === 'postcard' ? 'postcard' : 'yearbook'}.png`
      a.href = dataUrl
      a.click()
    } catch {
      // 导出失败时静默回退，避免打断用户
    } finally {
      setBusy(false)
    }
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 460
  const scale = Math.min(
    1,
    (Math.min(vw, 460) - 48) / (variant === 'postcard' ? 1000 : 540),
  )

  return (
    <div className="page-bg paper-texture relative min-h-full px-4 pb-28 pt-5">
      <AmbientBackground />
      <main className="relative z-10 space-y-5">
        {/* 分享者信息 */}
        <FadeIn>
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <motion.div
              className="flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--ds-shadow-lg)' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            >
              <UserRound className="h-9 w-9" />
            </motion.div>
              <h1 className="font-display font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)', color: 'var(--foreground)' }}>
                {t('旅行精选')}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('来自一位旅行者的公开足迹 · 共 {{n}} 个精选地点', { n: checkins.length })}
              </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
            >
              <Globe2 className="h-3 w-3" /> {t('公开分享页')}
            </span>
            {checkins.length > 0 && (
              <button
                onClick={() => setExportOpen(true)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
                style={{ background: 'var(--primary)' }}
              >
                <ImageIcon className="h-4 w-4" /> {t('导出分享图')}
              </button>
            )}
          </div>
        </FadeIn>

        {/* 导出分享图浮层 */}
        {exportOpen && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onClick={() => setExportOpen(false)}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold">{t('导出分享图')}</p>
                <button onClick={() => setExportOpen(false)} className="rounded-full p-1.5" style={{ background: 'var(--muted)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-2 px-4 pt-3">
                {(['postcard', 'yearbook'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-medium transition"
                    style={{
                      background: variant === v ? 'var(--primary)' : 'var(--muted)',
                      color: variant === v ? 'var(--primary-foreground)' : 'var(--foreground)',
                    }}
                  >
                    {v === 'postcard' ? t('明信片') : t('年鉴')}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto px-4 py-4">
                <div
                  style={{
                    width: variant === 'postcard' ? 1000 * scale : 540 * scale,
                    height: variant === 'postcard' ? 560 * scale : 920 * scale,
                    margin: '0 auto',
                  }}
                >
                  <div
                    style={{
                      width: variant === 'postcard' ? 1000 : 540,
                      height: variant === 'postcard' ? 560 : 920,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <Postcard ref={cardRef} checkins={checkins} ownerName={t('旅行者')} variant={variant} />
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={handleDownload}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-60"
                  style={{ background: 'var(--primary)' }}
                >
                  <Download className="h-4 w-4" /> {busy ? t('生成中…') : t('下载图片')}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('加载中…')}
          </p>
        ) : checkins.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={t('还没有公开的精选')}
            description={t('这位旅行者尚未开启公开分享，或暂未标记精选打卡。')}
          />
        ) : (
          <>
            <FadeIn>
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)', boxShadow: 'var(--ds-shadow-md)' }}>
                <TravelMap
                  checkins={checkins}
                  height={260}
                  linkPrefix={`/checkin/`}
                  showUserLocation={false}
                />
              </div>
            </FadeIn>

            <Stagger className="grid grid-cols-1 gap-4" stagger={0.06}>
              {checkins.map((c) => (
                <CheckinCard key={c.id} checkin={c} />
              ))}
            </Stagger>
          </>
        )}

        {/* 底部引流条 */}
        <FadeIn>
          <Surface
            pad="none"
            interactive
            onClick={() => navigate('/')}
            className="card-paper flex items-center gap-3 p-4"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('在 App 中查看')}</p>
              <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t('记录你自己的旅行足迹，点亮想去的地方')}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />
          </Surface>
        </FadeIn>
      </main>
    </div>
  )
}
