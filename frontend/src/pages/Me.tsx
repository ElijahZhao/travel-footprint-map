import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useUpdateCheckin } from '@/lib/hooks'
import EmptyState from '@/components/EmptyState'
import TravelIllustration from '@/components/TravelIllustration'
import CheckinCard from '@/components/CheckinCard'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import { SectionTitle } from '@/components/Surface'
import { Stamp } from '@/components/TravelDecor'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { setLanguage, getLanguage } from '@/lib/i18n'

/** 行李牌行：左侧打孔 + 虚线分隔，用于设置列表 */
function LuggageRow({
  icon: Icon,
  title,
  desc,
  onClick,
  color,
  disabled,
  right,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  desc: string
  onClick?: () => void
  color: string
  disabled?: boolean
  right?: React.ReactNode
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`luggage-tag flex w-full items-center gap-3 p-3.5 pl-11 text-left ${
        onClick && !disabled ? 'cursor-pointer' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {desc}
        </p>
      </div>
      {right ?? <span style={{ color: 'var(--muted-foreground)' }}>→</span>}
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

  // 数据到达后再同步分享开关初值，避免首帧空数组导致的误判
  useEffect(() => {
    setShareOn(checkins.some((c) => c.is_public))
  }, [checkins])

  const publicCount = useMemo(() => checkins.filter((c) => c.is_public).length, [checkins])
  const visitedCount = useMemo(() => checkins.filter((c) => c.status === 'visited').length, [checkins])
  const photoCount = useMemo(() => checkins.reduce((a, c) => a + (c.photos?.length ?? 0), 0), [checkins])

  /** 成就徽章：按数据达成情况自动点亮 */
      const badges = useMemo(
    () => [
      { key: 'first', label: t('初次出发'), icon: Sparkles, got: visitedCount >= 1, hint: t('记录第 1 个足迹') },
      { key: 'five', label: t('五处打卡'), icon: MapPin, got: visitedCount >= 5, hint: t('累计 5 个足迹') },
      { key: 'photo', label: t('影像记录'), icon: Camera, got: photoCount >= 3, hint: t('上传 3 张照片') },
      { key: 'year', label: t('跨年旅行'), icon: CalendarCheck, got: new Set(checkins.map((c) => (c.visit_date || '').slice(0, 4)).filter(Boolean)).size >= 2, hint: t('跨越 2 个年度') },
      { key: 'explorer', label: t('探索者'), icon: Mountain, got: visitedCount >= 10, hint: t('累计 10 个足迹') },
      { key: 'curator', label: t('精选策展'), icon: BadgeCheck, got: publicCount >= 1, hint: t('公开 1 条精选') },
    ],
    [visitedCount, photoCount, checkins, publicCount, t],
  )

  if (!loading && !user && !guest) {
    return (
      <div className="page-bg paper-texture flex min-h-full items-center justify-center px-6">
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
      // 并发更新；任一失败则回滚 UI 并刷新数据，避免与服务端状态不一致
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
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-5">
        {/* 头像与身份：渐变英雄卡，建立「我的」页面的第一眼锚点 */}
        <FadeIn>
          <div className="card-paper relative overflow-hidden rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full" style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)' }} />
            <span className="pointer-events-none absolute -bottom-10 -left-8 h-20 w-20 rounded-full" style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)' }} />
            <div className="relative flex items-center gap-4">
              <motion.div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
                style={{ background: 'var(--primary)' }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {displayName.slice(0, 1).toUpperCase()}
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{
                    background: guest ? 'var(--accent)' : 'var(--primary)',
                    border: '2px solid var(--card)',
                  }}
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
              {guest ? (
                <button
                  onClick={exitGuest}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                >
                  <DoorOpen className="h-3.5 w-3.5" /> {t('退出')}
                </button>
              ) : (
                <button
                  onClick={() => signOut()}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                >
                  {t('退出')}
                </button>
              )}
            </div>
          </div>
        </FadeIn>

        {/* 游客升级提示条 */}
        {guest && (
          <FadeIn>
            <div
              className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background: 'linear-gradient(120deg, color-mix(in oklab, var(--accent) 22%, var(--card)), color-mix(in oklab, var(--accent) 8%, var(--card)))',
                border: '1px solid color-mix(in oklab, var(--accent) 34%, transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t('升级为正式账号')}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t('打卡数据现已保存到本设备，换设备或清除浏览器缓存会丢失。用邮箱注册即可永久保存并开启分享页。')}
                  </p>
                </div>
              </div>
              <Button
                className="mt-3 w-full rounded-full"
                onClick={() => navigate('/login')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {t('立即升级')}
              </Button>
            </div>
          </FadeIn>
        )}

        {/* 成就邮票：把徽章做成一套「邮票集」 */}
        <FadeIn>
          <div className="card-paper rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <SectionTitle
              icon={Award}
              right={
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {t('{{got}} / {{total}}', { got: badges.filter((b) => b.got).length, total: badges.length })}
                </span>
              }
              className="mb-4"
            >
              {t('成就邮票')}
            </SectionTitle>
            <Stagger className="grid grid-cols-3 gap-3" stagger={0.05}>
              {badges.map((b, i) => {
                const Icon = b.icon
                const isFirst = i === 0
                return (
                  <Stamp key={b.key} got={b.got} rotation={[-3, 2.5, -2, 3, -2.5, 2][i % 6]} title={b.hint}>
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: isFirst ? 48 : 40,
                        height: isFirst ? 48 : 40,
                        background: b.got ? 'var(--primary)' : 'transparent',
                        color: b.got ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        border: b.got ? 'none' : '1.5px dashed var(--border)',
                      }}
                    >
                      <Icon className={isFirst ? 'h-6 w-6' : 'h-5 w-5'} />
                    </span>
                    <span
                      className="font-medium"
                      style={{
                        fontSize: isFirst ? 12 : 11,
                        color: b.got ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {b.label}
                    </span>
                  </Stamp>
                )
              })}
            </Stagger>
          </div>
        </FadeIn>

        {/* 设置菜单：行李牌隐喻 */}
        <FadeIn>
          <div className="space-y-3">
            <LuggageRow
              icon={Languages}
              title={t('语言')}
              desc={lang === 'zh' ? 'Switch to English' : '切换到中文'}
              color="var(--primary)"
              onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}
            />
            {!guest && (
              <>
                <LuggageRow
                  icon={Globe2}
                  title={t('公开分享页')}
                  desc={t('开启后精选打卡出现在分享页（已选 {{n}} 条）', { n: publicCount })}
                  color="var(--primary)"
                  right={<Switch checked={shareOn} onCheckedChange={toggleShare} />}
                />
                <LuggageRow
                  icon={Share2}
                  title={t('复制分享链接')}
                  desc={t('发给朋友，无需登录即可查看')}
                  color="var(--accent)"
                  onClick={copyShareLink}
                  disabled={!shareOn}
                />
              </>
            )}
            <LuggageRow icon={Compass} title={t('回到地图')} desc={t('查看完整足迹分布')} color="var(--primary)" onClick={() => navigate('/')} />
          </div>
        </FadeIn>

        {/* 我的打卡 */}
        <FadeIn>
          <SectionTitle
            icon={MapPin}
            right={
              <Button
                size="sm"
                className="gap-1 rounded-full"
                onClick={() => navigate('/checkin/new')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                <MapPin className="h-3.5 w-3.5" /> {t('新增')}
              </Button>
            }
          >
            {t('我的打卡（{{n}}）', { n: checkins.length })}
          </SectionTitle>
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
