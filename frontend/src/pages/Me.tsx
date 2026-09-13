import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useMyCheckins, useUpdateCheckin } from '@/lib/hooks'
import EmptyState from '@/components/EmptyState'
import CheckinCard from '@/components/CheckinCard'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import { Surface, SectionTitle } from '@/components/Surface'
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
} from 'lucide-react'
import { toast } from 'sonner'

export default function Me() {
  const { user, guest, loading, signOut, enterGuest } = useAuth()
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
      { key: 'first', label: '初次出发', icon: Sparkles, got: visitedCount >= 1, hint: '记录第 1 个足迹' },
      { key: 'five', label: '五处打卡', icon: MapPin, got: visitedCount >= 5, hint: '累计 5 个足迹' },
      { key: 'photo', label: '影像记录', icon: Camera, got: photoCount >= 3, hint: '上传 3 张照片' },
      { key: 'year', label: '跨年旅行', icon: CalendarCheck, got: new Set(checkins.map((c) => (c.visit_date || '').slice(0, 4)).filter(Boolean)).size >= 2, hint: '跨越 2 个年度' },
      { key: 'explorer', label: '探索者', icon: Mountain, got: visitedCount >= 10, hint: '累计 10 个足迹' },
      { key: 'curator', label: '精选策展', icon: BadgeCheck, got: publicCount >= 1, hint: '公开 1 条精选' },
    ],
    [visitedCount, photoCount, checkins, publicCount],
  )

  if (!loading && !user && !guest) {
    return (
      <div className="page-bg paper-texture flex min-h-full items-center justify-center px-6">
        <EmptyState
          icon={UserRound}
          title="请先登录"
          description="登录后管理你的打卡与分享设置。"
          action={
            <Button onClick={() => navigate('/login')} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              去登录
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
        toast.error(`${failed} 条更新失败，请重试`)
      } else {
        toast.success(on ? '已开启分享' : '已关闭分享')
      }
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const copyShareLink = () => {
    if (!user) return
    const url = `${window.location.origin}/share/${user.uid}`
    navigator.clipboard?.writeText(url)
    toast.success('分享链接已复制')
  }

  const exitGuest = () => {
    signOut()
    navigate('/login')
  }

  const displayName = user?.name || user?.email?.split('@')[0] || (guest ? '游客' : '旅行者')

  return (
    <div className="page-bg paper-texture min-h-full px-4 pb-28 pt-5">
      <main className="relative z-10 space-y-5">
        {/* 头像与身份 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
            <div className="flex items-center gap-4">
              <motion.div
                className="grad-vivid relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-xl font-bold text-white"
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
                  {guest ? '游客模式 · 数据保存于本设备' : user?.email}
                </p>
                <div className="mt-1.5 flex gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  <span>足迹 {visitedCount}</span>
                  <span>心愿 {checkins.length - visitedCount}</span>
                  <span>照片 {photoCount}</span>
                </div>
              </div>
              {guest ? (
                <button
                  onClick={exitGuest}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                >
                  <DoorOpen className="h-3.5 w-3.5" /> 退出
                </button>
              ) : (
                <button
                  onClick={() => signOut()}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-xs"
                  style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                >
                  退出
                </button>
              )}
            </div>
          </Surface>
        </FadeIn>

        {/* 游客升级提示条 */}
        {guest && (
          <FadeIn>
            <div
              className="relative overflow-hidden rounded-3xl p-4"
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
                  <p className="text-sm font-semibold">升级为正式账号</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    打卡数据现已保存到本设备，换设备或清除浏览器缓存会丢失。用邮箱注册即可永久保存并开启分享页。
                  </p>
                </div>
              </div>
              <Button
                className="mt-3 w-full rounded-full"
                onClick={() => navigate('/login')}
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                立即升级
              </Button>
            </div>
          </FadeIn>
        )}

        {/* 成就徽章 */}
        <FadeIn>
          <Surface pad="lg" className="card-paper">
            <SectionTitle
              icon={Award}
              right={
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {badges.filter((b) => b.got).length} / {badges.length}
                </span>
              }
              className="mb-3"
            >
              成就徽章
            </SectionTitle>
            <Stagger className="grid grid-cols-3 gap-3" stagger={0.05}>
              {badges.map((b) => {
                const Icon = b.icon
                return (
                  <motion.div
                    key={b.key}
                    className="flex flex-col items-center gap-1.5 rounded-2xl py-3"
                    style={{
                      background: b.got ? 'color-mix(in oklab, var(--primary) 10%, var(--card))' : 'var(--secondary)',
                      border: b.got ? '1px solid color-mix(in oklab, var(--primary) 24%, transparent)' : '1px dashed var(--border)',
                    }}
                    variants={{ hidden: { opacity: 0, scale: 0.88 }, visible: { opacity: 1, scale: 1 } }}
                    title={b.hint}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        background: b.got ? 'var(--primary)' : 'transparent',
                        color: b.got ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        border: b.got ? 'none' : '1.5px dashed var(--border)',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: b.got ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                    >
                      {b.label}
                    </span>
                  </motion.div>
                )
              })}
            </Stagger>
          </Surface>
        </FadeIn>

        {/* 设置菜单 */}
        <FadeIn>
          <Surface pad="none" className="card-paper divide-y" style={{ borderColor: 'var(--border)' }}>
            {!guest && (
              <>
                <div className="flex items-center gap-3 p-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'color-mix(in oklab, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
                  >
                    <Globe2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">公开分享页</p>
                    <p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      开启后，精选打卡会出现在分享页（已选 {publicCount} 条）
                    </p>
                  </div>
                  <Switch checked={shareOn} onCheckedChange={toggleShare} />
                </div>
                <button
                  onClick={copyShareLink}
                  disabled={!shareOn}
                  className="flex w-full items-center gap-3 p-4 text-left disabled:opacity-50"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
                  >
                    <Share2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">复制分享链接</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      发给朋友，无需登录即可查看
                    </p>
                  </div>
                  <span style={{ color: 'var(--muted-foreground)' }}>→</span>
                </button>
              </>
            )}
            <button onClick={() => navigate('/')} className="flex w-full items-center gap-3 p-4 text-left">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'color-mix(in oklab, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
              >
                <Compass className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">回到地图</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  查看完整足迹分布
                </p>
              </div>
              <span style={{ color: 'var(--muted-foreground)' }}>→</span>
            </button>
          </Surface>
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
                <MapPin className="h-3.5 w-3.5" /> 新增
              </Button>
            }
          >
            我的打卡（{checkins.length}）
          </SectionTitle>
        </FadeIn>

        {checkins.length === 0 ? (
          <EmptyState icon={MapPin} title="还没有打卡" description="去地图页记录你的第一个足迹吧。" />
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
