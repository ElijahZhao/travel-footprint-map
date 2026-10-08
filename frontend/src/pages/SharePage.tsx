import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePublicCheckins } from '@/lib/hooks'
import TravelMap from '@/components/TravelMap'
import CheckinCard from '@/components/CheckinCard'
import EmptyState from '@/components/EmptyState'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import { Surface } from '@/components/Surface'
import { useTranslation } from 'react-i18next'
import { MapPin, Globe2, ArrowRight, UserRound } from 'lucide-react'

export default function SharePage() {
  const { t } = useTranslation()
  const { publicId } = useParams()
  const { data: checkins = [], isLoading } = usePublicCheckins(publicId ?? '')
  const navigate = useNavigate()

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
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
            <div>
              <h1 className="font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
                {t('旅行精选')}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('来自一位旅行者的公开足迹 · 共 {{n}} 个精选地点', { n: checkins.length })}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
            >
              <Globe2 className="h-3 w-3" /> {t('公开分享页')}
            </span>
          </div>
        </FadeIn>

        {isLoading ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            加载中…
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
