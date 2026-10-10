import { Link } from 'react-router-dom'
import { MapPin, Star, Heart, CheckCircle2 } from 'lucide-react'
import type { Checkin } from '@/lib/types'
import { categoryMeta } from '@/lib/categories'
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
    <Link to={to ?? `/checkin/${checkin.id}`} className="block">
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(43,36,32,0.04)' }}
      >
        {/* 封面照片 — 占满宽度，无白边 */}
        {checkin.photos?.length > 0 ? (
          <div className="relative">
            <img
              src={checkin.photos[0].url}
              alt={checkin.place_name}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
            {/* 照片底部氛围渐变 */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
              style={{ background: 'linear-gradient(transparent, rgba(30,24,20,0.32))' }}
            />
            {checkin.photos.length > 1 && (
              <span className="absolute bottom-2.5 right-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {t('{{n}} 张', { n: checkin.photos.length })}
              </span>
            )}
            <span className="absolute right-3 top-3">
              {isWish ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                  <Heart className="h-3 w-3" fill="currentColor" /> {t('心愿')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium" style={{ color: 'var(--primary)' }}>
                  <CheckCircle2 className="h-3 w-3" /> {t('已去')}
                </span>
              )}
            </span>
          </div>
        ) : (
          <div
            className="flex h-28 w-full items-center justify-center"
            style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
          >
            <Icon className="h-10 w-10" />
          </div>
        )}

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-base">{checkin.place_name}</span>
            </div>
            {!checkin.photos?.length &&
              (isWish ? (
                <span className="shrink-0 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                  {t('心愿')}
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-medium" style={{ color: 'var(--primary)' }}>
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
            <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {checkin.mood_text}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
              {checkin.visit_date && !isWish && <span>{checkin.visit_date}</span>}
              {checkin.photos?.length > 0 && (
                <CategoryTag label={t(meta.label)} icon={Icon} color="var(--muted-foreground)" />
              )}
            </span>
            <Stars n={checkin.rating} />
          </div>
        </div>
      </div>
    </Link>
  )
}
