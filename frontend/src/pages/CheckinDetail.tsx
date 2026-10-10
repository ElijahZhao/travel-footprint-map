import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useCheckin, useDeleteCheckin } from '@/lib/hooks'
import { categoryMeta } from '@/lib/categories'
import TravelMap from '@/components/TravelMap'
import { FadeIn } from '@/components/MotionPrimitives'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Star, MapPin, Pencil, Trash2, Heart, CheckCircle2, Share2, CalendarDays, Repeat2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export default function CheckinDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, guest } = useAuth()
  const { data: checkin, isLoading } = useCheckin(id ? Number(id) : null)
  const delMut = useDeleteCheckin()
  const [delOpen, setDelOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-full" style={{ background: 'transparent' }}>
        <p className="py-20 text-center" style={{ color: 'var(--muted-foreground)' }}>{t('加载中…')}</p>
      </div>
    )
  }

  if (!checkin) {
    return (
      <div className="min-h-full" style={{ background: 'transparent' }}>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p style={{ color: 'var(--muted-foreground)' }}>{t('未找到该打卡记录')}</p>
          <Button className="mt-4" onClick={() => navigate('/')}>{t('返回地图')}</Button>
        </div>
      </div>
    )
  }

  const meta = categoryMeta(checkin.category)
  const Icon = meta.icon
  const isWish = checkin.status === 'wish'
  const isOwner = guest || (user?.uid && checkin.user_id === user.uid)

  const onDelete = async () => {
    try {
      await delMut.mutateAsync(checkin.id)
      toast.success(t('已删除'))
      navigate('/')
    } catch (e: any) {
      toast.error(e?.message || t('删除失败'))
    }
  }

  const onShare = () => {
    if (!user) return
    const url = `${window.location.origin}/share/${user.uid}`
    navigator.clipboard?.writeText(url)
    toast.success(t('分享链接已复制'))
  }

  return (
    <div className="page-bg paper-texture relative min-h-full px-4 pb-10 pt-3">
      <main className="relative z-10 space-y-5">
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-[var(--background)]/90 px-4 py-2 backdrop-blur">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
            aria-label="返回"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{t('打卡详情')}</span>
        </div>
        <FadeIn>
          {checkin.photos?.length > 0 && (
            <div
              className="relative"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--ds-shadow-md)',
                borderRadius: '1rem',
                padding: '10px 10px 18px',
              }}
            >
              {/* 拍立得胶带贴角 */}
              <span className="photo-tape photo-tape--l" aria-hidden="true" />
              <span className="photo-tape photo-tape--r" aria-hidden="true" />
              {/* 相册：多图横向滑动，单图直接展示 */}
              <div className="overflow-hidden rounded-lg">
                <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {checkin.photos.map((p, i) => (
                    <img
                      key={i}
                      src={p.url}
                      alt={`${checkin.place_name} ${i + 1}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      onClick={() => setLightbox(i)}
                      className="max-h-80 w-full shrink-0 snap-center cursor-zoom-in object-cover"
                    />
                  ))}
                </div>
                {checkin.photos.length > 1 && (
                  <span className="absolute right-5 top-5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                    {t('{{n}} 张', { n: checkin.photos.length })}
                  </span>
                )}
                <div className="pointer-events-none absolute inset-x-3 bottom-14 h-16" style={{ background: 'linear-gradient(transparent, oklch(0.2 0.02 80 / 0.4))' }} />
                <div className="absolute bottom-5 left-5 flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: meta.color, color: 'white' }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                    {t(meta.label)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-bold leading-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
                {checkin.place_name}
              </h1>
              {checkin.address && (
                <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{checkin.address}</span>
                </p>
              )}
            </div>
            {isWish ? (
              <Badge variant="outline" className="shrink-0 gap-1" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                <Heart className="h-3 w-3" fill="currentColor" /> {t('心愿单')}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 gap-1" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                <CheckCircle2 className="h-3 w-3" /> {t('已打卡')}
              </Badge>
            )}
          </div>
        </FadeIn>

        <FadeIn>
          <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)' }}>
            <TravelMap checkins={[checkin]} height={220} showUserLocation={false} />
          </div>
        </FadeIn>

        <FadeIn>
          <Card className="card-paper rounded-2xl" style={{ borderColor: 'var(--border)' }}>
            <CardContent className="space-y-4 p-5">
              {!isWish && checkin.visit_date && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in oklab, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t('到访日期')}</p>
                      <p className="font-medium">{checkin.visit_date}</p>
                    </div>
                  </div>
                </div>
              )}
              {checkin.rating > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: checkin.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4" style={{ color: 'var(--accent)' }} fill="currentColor" />
                  ))}
                </div>
              )}
              {checkin.mood_text && (
                <>
                  <Separator />
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{checkin.mood_text}</p>
                </>
              )}
              {checkin.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {checkin.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full">#{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {isOwner && (
          <div className="flex gap-2 pb-2">
            <Button
              className="h-11 flex-1 gap-1 rounded-full"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              onClick={() => navigate(`/checkin/new?from=${checkin.id}`)}
            >
              <Repeat2 className="h-4 w-4" /> {t('又来了')}
            </Button>
            {checkin.is_public && (
              <Button variant="outline" className="h-11 flex-1 gap-1 rounded-full" onClick={onShare}>
                <Share2 className="h-4 w-4" /> {t('分享')}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 flex-1 gap-1 rounded-full"
              onClick={() => navigate(`/checkin/${checkin.id}/edit`)}
            >
              <Pencil className="h-4 w-4" /> {t('编辑')}
            </Button>
            <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 flex-1 gap-1 rounded-full"
                  style={{ color: 'var(--destructive)' }}
                >
                  <Trash2 className="h-4 w-4" /> {t('删除')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="card-paper" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('删除打卡')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('确定删除这条打卡记录吗？')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    style={{ background: 'var(--destructive)', color: 'white' }}
                  >
                    {t('删除')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </main>

      {/* 大图查看（lightbox） */}
      {lightbox !== null && checkin.photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={t('关闭')}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <img
            src={checkin.photos[lightbox].url}
            alt={`${checkin.place_name} ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
          />
          {checkin.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i !== null ? (i - 1 + checkin.photos.length) % checkin.photos.length : 0)) }}
                aria-label="上一张"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i !== null ? (i + 1) % checkin.photos.length : 0)) }}
                aria-label="下一张"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {lightbox + 1} / {checkin.photos.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
