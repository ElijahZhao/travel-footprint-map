import { Link } from 'react-router-dom'
import { MapPin, Star, Heart, CheckCircle2 } from 'lucide-react'
import type { Checkin } from '@/lib/types'
import { categoryMeta } from '@/lib/categories'
import { HoverLift } from '@/components/MotionPrimitives'
import { CategoryTag } from '@/components/Surface'
import { useTranslation } from 'react-i18next'

function Stars({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="h-3 w-3" fill="currentColor" />
      ))}
    </span>
  )
}

export default function CheckinCard({ checkin, to }: { checkin: Checkin; to?: string }) {
  const meta = categoryMeta(checkin.category)
  const Icon = meta.icon
  const { t } = useTranslation()
  const isWish = checkin.status === 'wish'

  return (
    <HoverLift>
      <Link to={to ?? `/checkin/${checkin.id}`}>
        <div
          className="card-paper relative overflow-hidden rounded-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* 封面 / 分类色块 */}
          {checkin.photos?.length > 0 ? (
            <div className="relative bg-white p-2 pb-8" style={{ transform: 'rotate(-0.6deg)' }}>
              <img src={checkin.photos[0].url} alt={checkin.place_name} className="h-40 w-full object-cover" />
              <span className="absolute right-3 top-3">
                {isWish ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium shadow" style={{ color: 'var(--family)' }}>
                    <Heart className="h-3 w-3" fill="currentColor" /> {t('心愿')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium shadow" style={{ color: 'var(--success)' }}>
                    <CheckCircle2 className="h-3 w-3" /> {t('已去')}
                  </span>
                )}
              </span>
              <span className="absolute bottom-2 left-3">
                <CategoryTag label={t(meta.label)} icon={Icon} color="var(--muted-foreground)" />
              </span>
            </div>
          ) : (
            <div
              className="flex h-24 w-full items-center justify-center"
              style={{ background: `color-mix(in oklab, ${meta.hex} 16%, var(--secondary))`, color: meta.hex }}
            >
              <Icon className="h-9 w-9" />
            </div>
          )}

          <div className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {!checkin.photos?.length && (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: meta.color, color: 'white' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="truncate font-semibold">{checkin.place_name}</span>
              </div>
              {!checkin.photos?.length &&
                (isWish ? (
                  <span className="shrink-0 text-[11px] font-medium" style={{ color: 'var(--family)' }}>
                    {t('心愿')}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium" style={{ color: 'var(--success)' }}>
                    {t('已去')}
                  </span>
                ))}
            </div>

            {checkin.address && (
              <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{checkin.address}</span>
              </p>
            )}

            {checkin.mood_text && (
              <p className="line-clamp-2 text-sm" style={{ color: 'var(--foreground)' }}>
                {checkin.mood_text}
              </p>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {checkin.visit_date && !isWish && <span>{checkin.visit_date}</span>}
                {checkin.photos?.length > 0 && <span>· {t(meta.label)}</span>}
              </span>
              <Stars n={checkin.rating} />
            </div>
          </div>
        </div>
      </Link>
    </HoverLift>
  )
}
