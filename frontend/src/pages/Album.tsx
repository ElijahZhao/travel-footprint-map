import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins } from '@/lib/hooks'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import WavyUnderline from '@/components/WavyUnderline'
import { FadeIn } from '@/components/MotionPrimitives'
import { LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Checkin } from '@/lib/types'

interface PhotoItem {
  url: string
  checkin: Checkin
}

/** 足迹相册：所有打卡照片按时间流排成瀑布照片墙，点开进详情 */
export default function Album() {
  const { user, guest, loading, enterGuest } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: checkins = [] } = useMyCheckins()

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
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {t('足迹相册')}
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
                className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl text-left"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.05)' }}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
              >
                <img src={ph.url} alt={ph.checkin.place_name} loading="lazy" className="w-full object-cover" />
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
