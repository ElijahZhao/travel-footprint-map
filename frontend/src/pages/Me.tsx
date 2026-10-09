import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useUpdateCheckin } from '@/lib/hooks'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import CheckinCard from '@/components/CheckinCard'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  MapPin,
  Share2,
  UserRound,
  DoorOpen,
  Globe2,
  Award,
  Compass,
  Sparkles,
  Mountain,
  Camera,
  CalendarCheck,
  BadgeCheck,
  Languages,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { setLanguage, getLanguage } from '@/lib/i18n'

/** 设置列表行 */
function SettingRow({
  icon: Icon,
  title,
  desc,
  onClick,
  right,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  desc: string
  onClick?: () => void
  right?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`flex w-full items-center gap-3 p-3.5 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
      </div>
      {right ?? <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />}
    </div>
  )
}

export default function Me() {
  const { user, guest, loading, signOut, enterGuest } = useAuth()
  const { t } = useTranslation()
  const lang = getLanguage()
  const { data: checkins = [] } = useMyCheckins()
  const updateMut = useUpdateCheckin()
  const navigate = useNavigate()
  const [shareOn, setShareOn] = useState(false)

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  useEffect(() => {
    setShareOn(checkins.some((c) => c.is_public))
  }, [checkins])

  const publicCount = useMemo(() => checkins.filter((c) => c.is_public).length, [checkins])
  const visitedCount = useMemo(() => checkins.filter((c) => c.status === 'visited').length, [checkins])
  const photoCount = useMemo(() => checkins.reduce((a, c) => a + (c.photos?.length ?? 0), 0), [checkins])

  const badges = useMemo(
    () => [
      { key: 'first', label: t('初次出发'), icon: Sparkles, got: visitedCount >= 1 },
      { key: 'five', label: t('五处打卡'), icon: MapPin, got: visitedCount >= 5 },
      { key: 'photo', label: t('影像记录'), icon: Camera, got: photoCount >= 3 },
      { key: 'year', label: t('跨年旅行'), icon: CalendarCheck, got: new Set(checkins.map((c) => (c.visit_date || '').slice(0, 4)).filter(Boolean)).size >= 2 },
      { key: 'explorer', label: t('探索者'), icon: Mountain, got: visitedCount >= 10 },
      { key: 'curator', label: t('精选策展'), icon: BadgeCheck, got: publicCount >= 1 },
    ],
    [visitedCount, photoCount, checkins, publicCount, t],
  )

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <EmptyState
          icon={UserRound}
          title={t('请先登录')}
          description={t('登录后管理你的打卡与分享设置。')}
          action={
            <Button onClick={() => navigate('/login')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              {t('去登录')}
            </Button>
          }
        />
      </div>
    )
  }

  const toggleShare = async (on: boolean) => {
    setShareOn(on)
    try {
      const targets = checkins.filter((c) => c.is_public !== on)
      const results = await Promise.allSettled(
        targets.map((c) =>
          updateMut.mutateAsync({
            id: c.id,
            input: {
              place_name: c.place_name,
              address: c.address,
              category: c.category,
              status: c.status,
              visit_date: c.visit_date,
              mood_text: c.mood_text,
              tags: c.tags,
              photos: c.photos,
              rating: c.rating,
              is_public: on,
              lng: c.lng,
              lat: c.lat,
            },
          }),
        ),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        toast.error(t('{{n}} 条更新失败，请重试', { n: failed }))
      } else {
        toast.success(on ? t('已开启分享') : t('已关闭分享'))
      }
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const copyShareLink = () => {
    if (!user) return
    const url = `${window.location.origin}/share/${user.uid}`
    navigator.clipboard?.writeText(url)
    toast.success(t('分享链接已复制'))
  }

  const exitGuest = () => {
    signOut()
    navigate('/login')
  }

  const displayName = user?.name || user?.email?.split('@')[0] || (guest ? t('游客') : t('旅行者'))

  return (
    <div className="min-h-full px-4 pb-28 pt-6" style={{ background: 'var(--background)' }}>
      <main className="space-y-6">
        {/* 头像与身份 */}
        <FadeIn>
          <div className="overflow-hidden rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <motion.div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
                style={{ background: 'var(--primary)' }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {displayName.slice(0, 1).toUpperCase()}
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ background: guest ? 'var(--accent)' : 'var(--primary)', border: '2px solid var(--card)' }}
                >
                  {guest ? <UserRound className="h-3 w-3" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                </span>
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{displayName}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {guest ? t('游客模式 · 数据保存于本设备') : user?.email}
                </p>
                <div className="mt-1.5 flex gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  <span>{t('足迹 {{n}}', { n: visitedCount })}</span>
                  <span>{t('心愿 {{n}}', { n: checkins.length - visitedCount })}</span>
                  <span>{t('照片 {{n}}', { n: photoCount })}</span>
                </div>
              </div>
              <button
                onClick={guest ? exitGuest : () => signOut()}
                className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs"
                style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
              >
                <DoorOpen className="h-3.5 w-3.5" /> {t('退出')}
              </button>
            </div>
          </div>
        </FadeIn>

        {/* 游客升级提示 */}
        {guest && (
          <FadeIn>
            <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t('升级为正式账号')}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t('打卡数据现已保存到本设备，换设备或清除浏览器缓存会丢失。')}
                  </p>
                </div>
              </div>
              <Button
                className="mt-3 w-full rounded-lg"
                onClick={() => navigate('/login')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {t('立即升级')}
              </Button>
            </div>
          </FadeIn>
        )}

        {/* 成就徽章 */}
        <FadeIn>
          <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('成就徽章')}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t('{{got}} / {{total}}', { got: badges.filter((b) => b.got).length, total: badges.length })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {badges.map((b, i) => {
                const Icon = b.icon
                return (
                  <motion.div
                    key={b.key}
                    className="flex flex-col items-center gap-1.5"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: b.got ? 'var(--primary)' : 'transparent',
                        color: b.got ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        border: b.got ? 'none' : '1.5px dashed var(--border)',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: b.got ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                      {b.label}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* 设置菜单 */}
        <FadeIn>
          <div className="space-y-2">
            <SettingRow
              icon={Languages}
              title={t('语言')}
              desc={lang === 'zh' ? 'Switch to English' : '切换到中文'}
              onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}
            />
            {!guest && (
              <>
                <SettingRow
                  icon={Globe2}
                  title={t('公开分享页')}
                  desc={t('开启后精选打卡出现在分享页（已选 {{n}} 条）', { n: publicCount })}
                  right={<Switch checked={shareOn} onCheckedChange={toggleShare} />}
                />
                <SettingRow
                  icon={Share2}
                  title={t('复制分享链接')}
                  desc={t('发给朋友，无需登录即可查看')}
                  onClick={copyShareLink}
                />
              </>
            )}
            <SettingRow icon={Compass} title={t('回到地图')} desc={t('查看完整足迹分布')} onClick={() => navigate('/')} />
          </div>
        </FadeIn>

        {/* 我的打卡 */}
        <FadeIn>
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {t('我的打卡（{{n}}）', { n: checkins.length })}
              </span>
            </div>
            <Button
              size="sm"
              className="gap-1 rounded-lg"
              onClick={() => navigate('/checkin/new')}
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              <MapPin className="h-3.5 w-3.5" /> {t('新增')}
            </Button>
          </div>
        </FadeIn>

        {checkins.length === 0 ? (
          <EmptyState
            illustration={<TravelIllustration scene="me" className="h-24 w-24" />}
            title={t('还没有打卡')}
            description={t('去地图页记录你的第一个足迹吧。')}
          />
        ) : (
          <Stagger className="grid grid-cols-1 gap-4" stagger={0.06}>
            {checkins.map((c) => (
              <CheckinCard key={c.id} checkin={c} />
            ))}
          </Stagger>
        )}
      </main>
    </div>
  )
}
