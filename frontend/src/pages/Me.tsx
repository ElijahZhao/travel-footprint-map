import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useUpdateCheckin } from '@/lib/hooks'
import { mergeLocalCheckinsToCloud, getLocalGuestCheckinCount, cloneSampleCheckinsToCloud } from '@/lib/checkins'
import { setGuestCheckins } from '@/lib/guest'
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
  Palette,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { setLanguage, getLanguage } from '@/lib/i18n'
import { useSeason, SEASONS, SEASON_META, type SeasonMode } from '@/lib/season'

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
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px' }}
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
  const { mode, setMode } = useSeason()
  const { data: checkins = [] } = useMyCheckins()
  const updateMut = useUpdateCheckin()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [shareOn, setShareOn] = useState(false)
  const [importing, setImporting] = useState(false)
  const [cloning, setCloning] = useState(false)

  // 已登录但本设备仍残留未同步的游客足迹时，提示可手动导入
  const leftoverCount = useMemo(
    () => (!guest && user ? getLocalGuestCheckinCount() : 0),
    [guest, user],
  )

  const importLocal = async () => {
    setImporting(true)
    try {
      const n = await mergeLocalCheckinsToCloud()
      setGuestCheckins([])
      queryClient.invalidateQueries({ queryKey: ['my-checkins'] })
      if (n > 0) toast.success(t('已导入本机 {{n}} 条足迹', { n }))
      else toast.success(t('没有需要导入的本机足迹'))
    } catch (e: any) {
      toast.error(e?.message || t('导入失败'))
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    if (!loading && !user && !guest) enterGuest()
  }, [loading, user, guest, enterGuest])

  useEffect(() => {
    setShareOn(checkins.some((c) => c.is_public))
  }, [checkins])

  const visited = useMemo(() => checkins.filter((c) => c.status === 'visited'), [checkins])
  const visitedCount = visited.length
  const wishCount = checkins.length - visitedCount
  const publicCount = checkins.filter((c) => c.is_public).length
  const photoCount = visited.reduce((a, c) => a + (c.photos?.length ?? 0), 0)
  const yearsCount = new Set(visited.map((c) => (c.visit_date || '').slice(0, 4)).filter(Boolean)).size
  const citiesCount = new Set(
    visited.map((c) => c.address?.replace(/^(.{2}省|.{2}市|.{2}自治区|.{2}特别行政区)/, '') || c.place_name),
  ).size
  const nationsCount = new Set(visited.map((c) => c.nation).filter(Boolean)).size
  const catsCovered = new Set(visited.map((c) => c.category)).size

  const badges = useMemo(
    () => [
      { key: 'first', label: t('初次出发'), icon: Sparkles, got: visitedCount >= 1, hint: t('记录你的第一个足迹') },
      { key: 'five', label: t('五处打卡'), icon: MapPin, got: visitedCount >= 5, hint: t('累计 5 处已打卡') },
      { key: 'photo', label: t('影像记录'), icon: Camera, got: photoCount >= 1, hint: t('上传第一张照片') },
      { key: 'year', label: t('跨年旅行'), icon: CalendarCheck, got: yearsCount >= 2, hint: t('在两年都留下足迹') },
      { key: 'explorer', label: t('探索者'), icon: Mountain, got: visitedCount >= 10, hint: t('累计 10 处已打卡') },
      { key: 'curator', label: t('精选策展'), icon: BadgeCheck, got: publicCount >= 1, hint: t('把一条打卡设为公开精选') },
      { key: 'nation', label: t('环球旅人'), icon: Globe2, got: nationsCount >= 1, hint: t('踏足第一个不同国家') },
      { key: 'category', label: t('集齐分类'), icon: Compass, got: catsCovered >= 6, hint: t('走遍全部 6 类主题') },
      { key: 'cities', label: t('十城行者'), icon: MapPin, got: citiesCount >= 10, hint: t('足迹覆盖 10 座城市') },
      { key: 'planner', label: t('行程规划师'), icon: Compass, got: wishCount >= 3, hint: t('收藏 3 个想去的地方') },
    ],
    [visitedCount, photoCount, yearsCount, citiesCount, nationsCount, catsCovered, wishCount, publicCount, t],
  )

  if (!loading && !user && !guest) {
    return (
      <div className="flex min-h-full items-center justify-center px-6" style={{ background: 'transparent' }}>
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

  const cloneSample = async () => {
    setCloning(true)
    try {
      const n = await cloneSampleCheckinsToCloud()
      queryClient.invalidateQueries({ queryKey: ['my-checkins'] })
      if (n > 0) toast.success(t('已克隆 {{n}} 条示例足迹到你的账号', { n }))
      else toast.success(t('示例足迹已在你的账号中'))
    } catch (e: any) {
      toast.error(e?.message || t('克隆失败'))
    } finally {
      setCloning(false)
    }
  }

  const displayName = user?.name || user?.email?.split('@')[0] || (guest ? t('游客') : t('旅行者'))

  return (
    <div className="relative min-h-full px-4 pb-28 pt-6" style={{ background: 'transparent' }}>
      <main className="space-y-6">
        {/* 头像与身份 */}
        <FadeIn>
          <div
            className="grad-vivid overflow-hidden rounded-2xl p-5"
            style={{ boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.22)' }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {displayName.slice(0, 1).toUpperCase()}
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ background: guest ? 'var(--accent)' : 'var(--primary)', border: '2px solid rgba(255,255,255,0.55)' }}
                >
                  {guest ? <UserRound className="h-3 w-3" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                </span>
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-white">{displayName}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {guest ? t('游客模式 · 数据保存于本设备') : user?.email}
                </p>
                <div className="mt-1.5 flex gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  <span>{t('足迹 {{n}}', { n: visitedCount })}</span>
                  <span>{t('心愿 {{n}}', { n: wishCount })}</span>
                  <span>{t('照片 {{n}}', { n: photoCount })}</span>
                </div>
              </div>
              <button
                onClick={guest ? exitGuest : () => signOut()}
                className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <DoorOpen className="h-3.5 w-3.5" /> {t('退出')}
              </button>
            </div>
          </div>
        </FadeIn>

        {/* 游客升级提示——一行小字 */}
        {guest && (
          <FadeIn>
            <button
              onClick={() => navigate('/login')}
              className="flex w-full items-center justify-center gap-1 py-1 text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {t('登录后数据跨设备同步')} <span style={{ color: 'var(--primary)' }}>{t('去登录 →')}</span>
            </button>
          </FadeIn>
        )}

        {/* 本机残留数据导入（已登录但之前未合并的兜底） */}
        {!guest && leftoverCount > 0 && (
          <FadeIn>
            <div
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)', color: 'var(--accent)' }}
              >
                <Compass className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t('导入本机数据')}</p>
                <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {t('检测到本设备还有 {{n}} 条未同步的足迹', { n: leftoverCount })}
                </p>
              </div>
              <button
                onClick={importLocal}
                disabled={importing}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--primary)' }}
              >
                {importing ? t('生成中…') : t('导入')}
              </button>
            </div>
          </FadeIn>
        )}

        {/* 新账号引导：一键克隆游客示例足迹，降低上手门槛 */}
        {!guest && checkins.length === 0 && (
          <FadeIn>
            <div
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in oklab, var(--primary) 16%, transparent)', color: 'var(--primary)' }}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t('体验示例足迹')}</p>
                <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {t('一键把示例地点克隆到你的账号，快速感受完整功能')}
                </p>
              </div>
              <button
                onClick={cloneSample}
                disabled={cloning}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--primary)' }}
              >
                {cloning ? t('生成中…') : t('克隆示例')}
              </button>
            </div>
          </FadeIn>
        )}

        {/* 集章手册 */}
        <FadeIn>
          <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="sticker-wiggle h-4 w-4" style={{ color: 'var(--primary)' }} />
                <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('集章手册')}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {t('已集 {{got}} / {{total}} 枚', { got: badges.filter((b) => b.got).length, total: badges.length })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {badges.map((b, i) => {
                const Icon = b.icon
                const pal = ['var(--primary)', 'var(--accent)', 'var(--theme-blue)', 'var(--theme-rose)', 'var(--theme-gold, #EFC241)', 'oklch(0.62 0.16 300)', 'var(--primary)', 'var(--accent)', 'var(--theme-blue)', 'var(--theme-rose)']
                const gotColor = pal[i % pal.length]
                return (
                  <motion.div
                    key={b.key}
                    className="flex flex-col items-center gap-1 text-center"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <span
                      className="relative flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: b.got ? gotColor : 'transparent',
                        color: b.got ? '#fff' : 'var(--muted-foreground)',
                        border: b.got ? 'none' : '1.5px dashed var(--border)',
                        boxShadow: b.got ? `0 6px 16px color-mix(in oklab, ${gotColor} 32%, transparent)` : 'none',
                        opacity: b.got ? 1 : 0.7,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      {b.got && (
                        <span
                          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ background: 'var(--theme-green, #2Faa66)', border: '1.5px solid var(--card)' }}
                        >
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium leading-tight" style={{ color: b.got ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                      {b.label}
                    </span>
                    {!b.got && (
                      <span className="text-[10px] leading-tight" style={{ color: 'var(--muted-foreground)', opacity: 0.8 }}>
                        {b.hint}
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* 设置菜单 */}
        <FadeIn>
          <div className="space-y-2">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
                >
                  <Palette className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('季节皮肤')}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>{t('随季节切换整站配色')}</p>
                </div>
              </div>
              <div className="flex gap-1.5 rounded-full p-1" style={{ background: 'var(--secondary)' }}>
                {(['auto', ...SEASONS] as SeasonMode[]).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full px-1 py-1.5 text-xs font-medium"
                      style={{
                        background: active ? 'var(--card)' : 'transparent',
                        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                        boxShadow: active ? 'var(--ds-shadow-sm)' : 'none',
                      }}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEASON_META[m].swatch }} />
                      {t(SEASON_META[m].label)}
                    </button>
                  )
                })}
              </div>
            </div>
            <SettingRow
              icon={Languages}
              title={t('语言')}
              desc={lang === 'zh' ? 'Switch to English' : t('切换到中文')}
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
              <MapPin className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <span className="font-display text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {t('我的打卡（{{n}}）', { n: visitedCount })}
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
