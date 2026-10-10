import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useCheckin, useCreateCheckin, useUpdateCheckin } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import { uploadPhoto } from '@/lib/storage'
import { generateCheckinText, generateTags, aiConfigured } from '@/lib/ai'
import { createClient, LBSError, LBS_ERROR_CODES, type POI } from '@/lib/tencent-lbs'
import type { CategoryKey, CheckinStatus, CheckinInput, PhotoItem } from '@/lib/types'
import { FadeIn } from '@/components/MotionPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Star, MapPin, Upload, X, Search, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { celebrate } from '@/lib/celebrate'
import { useTranslation } from 'react-i18next'

const lbs = createClient()

interface FormState {
  place_name: string
  address: string
  category: CategoryKey
  status: CheckinStatus
  visit_date: string
  mood_text: string
  tags: string
  rating: number
  is_public: boolean
  nation: string | null
  lng: number | null
  lat: number | null
}

const EMPTY: FormState = {
  place_name: '',
  address: '',
  category: 'scenery',
  status: 'visited',
  visit_date: new Date().toISOString().slice(0, 10),
  mood_text: '',
  tags: '',
  rating: 0,
  is_public: false,
  nation: null,
  lng: null,
  lat: null,
}

export default function CheckinForm({ checkinId }: { checkinId?: string }) {
  const { t } = useTranslation()
  // 本表单由 AppShell 在路由体系外渲染，useParams 拿不到 :id，
  // 因此优先使用 CheckinSheet 从地址栏解析出的 checkinId。
  const { id: routeId } = useParams()
  const id = checkinId ?? routeId
  const [params] = useSearchParams()
  const isEdit = !!id
  /** 从心愿卡「完成此心愿」进入：把该心愿原地转为已打卡 */
  const completeWish = isEdit && params.get('complete') === '1'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: existing, isLoading: loadingExisting } = useCheckin(isEdit ? Number(id) : null)
  const createMut = useCreateCheckin()
  const updateMut = useUpdateCheckin()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<POI[]>([])
  const [searching, setSearching] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [tagLoading, setTagLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchSeq = useRef(0)

  useEffect(() => {
    if (existing) {
      const today = new Date().toISOString().slice(0, 10)
      setForm({
        place_name: existing.place_name,
        address: existing.address ?? '',
        category: existing.category,
        status: completeWish ? 'visited' : existing.status,
        visit_date: completeWish ? existing.visit_date || today : existing.visit_date ?? '',
        mood_text: existing.mood_text ?? '',
        tags: (existing.tags ?? []).join(', '),
        rating: existing.rating,
        is_public: existing.is_public,
        nation: existing.nation ?? null,
        lng: existing.lng,
        lat: existing.lat,
      })
      setPhotos(existing.photos ?? [])
    }
  }, [existing, completeWish])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // 输入停顿后自动搜索，无需按回车或点按钮
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const my = ++searchSeq.current
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const res = await lbs.searchPlace(q, {
          boundary: 'region(全国,0)',
          pageSize: 10,
          pageIndex: 1,
        })
        if (my !== searchSeq.current) return // 已有更新的输入，丢弃旧结果
        setResults(res.data ?? [])
      } catch {
        if (my === searchSeq.current) setResults([])
      } finally {
        if (my === searchSeq.current) setSearching(false)
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [query])

  const handleAi = async () => {
    if (!form.place_name.trim()) {
      toast.error(t('先填写或搜索地点，AI 才能写出贴合的文案'))
      return
    }
    if (!aiConfigured()) {
      toast.error(t('「AI 帮我写」还未开通：需要配置 AI 密钥后才能使用'))
      return
    }
    setAiLoading(true)
    try {
      const text = await generateCheckinText({
        placeName: form.place_name,
        address: form.address,
        category: form.category,
        visitDate: form.visit_date,
        tags: form.tags ? form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [],
      })
      set('mood_text', text)
      toast.success(t('AI 文案已生成'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('AI 生成失败'))
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiTags = async () => {
    if (!form.place_name.trim()) {
      toast.error(t('先填写或搜索地点，AI 才能给出合适的标签'))
      return
    }
    if (!aiConfigured()) {
      toast.error(t('「AI 建议标签」还未开通：需要配置 AI 密钥后才能使用'))
      return
    }
    setTagLoading(true)
    try {
      const current = form.tags
        ? form.tags.split(/[,，]/).map((x) => x.trim()).filter(Boolean)
        : []
      const suggested = await generateTags({
        placeName: form.place_name,
        address: form.address,
        category: form.category,
        moodText: form.mood_text,
        existingTags: current,
      })
      const merged = Array.from(new Set([...current, ...suggested]))
      set('tags', merged.join(', '))
      toast.success(t('AI 标签建议已添加'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('AI 标签生成失败'))
    } finally {
      setTagLoading(false)
    }
  }

  const searchPlace = async (q?: string) => {
    const kw = (q ?? query).trim()
    if (!kw) { setResults([]); return }
    const seq = ++searchSeq.current
    setSearching(true)
    try {
      const res = await lbs.searchPlace(kw, {
        boundary: 'region(全国,0)',
        pageSize: 10,
        pageIndex: 1,
      })
      if (seq !== searchSeq.current) return
      setResults(res.data ?? [])
    } catch (e) {
      if (seq !== searchSeq.current) return
      // 域名未授权是最常见的搜索失败场景：给出简短、指向真实解法的提示，
      // 不把 SDK 的长报错原文（带 URL）直接甩给用户。
      if (e instanceof LBSError && e.status === LBS_ERROR_CODES.UNAUTHORIZED_REFERER) {
        console.warn('LBS referer unauthorized:', e.message)
        toast.error(t('地点搜索暂不可用：需要把本站域名加入腾讯位置服务的授权名单'))
      } else {
        toast.error(e instanceof LBSError ? t(e.getSolution()) : t('地点搜索失败，请稍后重试'))
      }
      setResults([])
    } finally {
      if (seq === searchSeq.current) setSearching(false)
    }
  }

  // 输入即搜：停止输入 350ms 后自动触发，避免每次按键都打接口、候选列表乱跳
  useEffect(() => {
    const kw = query.trim()
    if (!kw) { setResults([]); return }
    const tid = setTimeout(() => { void searchPlace(kw) }, 350)
    return () => clearTimeout(tid)
  }, [query])

  const pickPlace = (poi: POI) => {
    set('place_name', poi.title)
    set('address', poi.address)
    set('lng', poi.location.lng)
    set('lat', poi.location.lat)
    // 国家免费来自 POI 的行政区划（避免国际逆地址解析的海外收费）；国内默认中国
    set('nation', poi.ad_info?.nation ?? '中国')
    setResults([])
    setQuery('')
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    try {
      const uploaded: PhotoItem[] = []
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file, user?.uid ?? 'guest')
        uploaded.push({ url })
      }
      setPhotos((p) => [...p, ...uploaded])
      toast.success(t('已上传 {{count}} 张照片', { count: uploaded.length }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('照片处理失败，请换一张试试'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    const name = form.place_name.trim()
    if (!name) return toast.error(t('请填写地点名称'))

    // 没经过搜索选点（手动填写名称）时，自动把地点名解析成坐标
    let lng = form.lng
    let lat = form.lat
    if (lng == null || lat == null) {
      setResolving(true)
      try {
        const res = await lbs.geocode(name)
        lng = res.result.location.lng
        lat = res.result.location.lat
        set('lng', lng)
        set('lat', lat)
      } catch {
        return toast.error(t('没找到「{{name}}」的坐标，请在上方搜索并从结果中选择', { name }))
      } finally {
        setResolving(false)
      }
    }

    const input: CheckinInput = {
      place_name: form.place_name.trim(),
      address: form.address.trim() || null,
      category: form.category,
      status: form.status,
      visit_date: form.status === 'wish' ? null : form.visit_date || null,
      mood_text: form.mood_text.trim() || null,
      tags: form.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      rating: form.rating,
      is_public: form.is_public,
      photos,
      nation: form.nation,
      lng,
      lat,
    }

    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: Number(id), input })
        if (completeWish) {
          toast.success(t('已点亮：{{name}}', { name: input.place_name }))
          celebrate()
          navigate('/timeline')
        } else {
          toast.success(t('已更新打卡'))
          navigate(`/checkin/${id}`)
        }
      } else {
        await createMut.mutateAsync(input)
        toast.success(t('打卡成功'))
        celebrate()
        navigate('/')
      }
    } catch (e: any) {
      toast.error(e?.message || t('保存失败'))
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: 'transparent' }}>
        <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>{t('加载中…')}</p>
      </div>
    )
  }

  const meta = categoryMeta(form.category)
  const MetaIcon = meta.icon
  const busy = createMut.isPending || updateMut.isPending || uploading || resolving

  return (
    <div style={{ background: 'transparent' }}>
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-4 pt-1">
        <FadeIn duration={0.35}>
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-2xl"
              style={{ background: meta.color, color: 'white' }}
            >
              <MetaIcon className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'var(--font-size-title)' }}>
                {completeWish ? t('完成心愿') : isEdit ? t('编辑打卡') : t('新增打卡')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {completeWish
                  ? t('「{{place}}」去过啦？记下这次出发吧', { place: form.place_name || t('这个地方') })
                  : isEdit
                    ? t('修改后保存即可更新')
                    : t('记录这一刻，点亮你的足迹')}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn duration={0.4}>
          <Card className="card-paper rounded-2xl" style={{ borderColor: 'var(--border)' }}>
            <CardContent className="space-y-5 p-5">
              {/* 地点搜索 */}
              <div className="space-y-2">
                <Label>{t('地点名称 *')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    placeholder={t('搜索地点，如：西湖')}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
                  />
                  <Button variant="outline" onClick={() => searchPlace()} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {(searching || results.length > 0 || query.trim()) && (
                  <div className="max-h-56 overflow-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    {searching && (
                      <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('搜索中…')}</p>
                    )}
                    {!searching && results.length === 0 && query.trim() && (
                      <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>{t('未找到相关地点，换个词试试')}</p>
                    )}
                    {results.map((poi) => (
                      <button
                        key={poi.id}
                        onClick={() => pickPlace(poi)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--secondary)]"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />
                        <span className="min-w-0">
                          <span className="block font-medium">{poi.title}</span>
                          <span className="block truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>{poi.address}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  value={form.place_name}
                  placeholder={t('或手动填写地点名称')}
                  onChange={(e) => set('place_name', e.target.value)}
                />
                {form.lng != null && (
                  <p className="text-xs" style={{ color: 'var(--success)' }}>
                    {t('已定位坐标：')}{form.lat!.toFixed(4)}, {form.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* 地址 */}
              <div className="space-y-2">
                <Label>{t('详细地址')}</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>

              {/* 分类（chip 选择，对齐概念图） */}
              <div className="space-y-2">
                <Label>{t('分类')}</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon
                    const active = form.category === c.key
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => set('category', c.key)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95"
                        style={{
                          background: active ? c.hex : 'var(--secondary)',
                          color: active ? 'white' : 'var(--muted-foreground)',
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(c.label)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 状态：已去 / 心愿 */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--secondary)' }}>
                <span className="text-sm font-medium">
                  {form.status === 'wish' ? t('加入心愿单') : t('已打卡')}
                </span>
                <Switch
                  checked={form.status === 'visited'}
                  onCheckedChange={(v) => set('status', v ? 'visited' : 'wish')}
                />
              </div>

              {/* 日期（仅已打卡显示） */}
              {form.status === 'visited' && (
                <div className="space-y-2">
                  <Label>{t('到访日期')}</Label>
                  <Input type="date" value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
                </div>
              )}

              {/* 评分 */}
              <div className="space-y-2">
                <Label>{t('评分')}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => set('rating', n === form.rating ? 0 : n)} type="button">
                      <Star
                        className="h-6 w-6"
                        style={{ color: n <= form.rating ? 'var(--accent)' : 'var(--border)' }}
                        fill={n <= form.rating ? 'var(--accent)' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 心情文字 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('旅行心情')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleAi}
                    disabled={aiLoading}
                    style={{ color: 'var(--primary)' }}
                  >
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t('AI 帮我写')}
                  </Button>
                </div>
                <Textarea
                  value={form.mood_text}
                  placeholder={t('写点什么吧，比如：夕阳下的湖面格外温柔…')}
                  onChange={(e) => set('mood_text', e.target.value)}
                  rows={3}
                />
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('标签（用逗号分隔）')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={handleAiTags}
                    disabled={tagLoading}
                    style={{ color: 'var(--primary)' }}
                  >
                    {tagLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t('AI 建议标签')}
                  </Button>
                </div>
                <Input value={form.tags} placeholder={t('日落, 亲子, 必去')} onChange={(e) => set('tags', e.target.value)} />
              </div>

              {/* 照片 */}
              <div className="space-y-2">
                <Label>{t('照片')}</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    type="button"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    {t('上传')}
                  </button>
                </div>
              </div>

              {/* 公开 */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--secondary)' }}>
                <div>
                  <p className="text-sm font-medium">{t('精选公开')}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t('开启后会出现在你的分享页')}</p>
                </div>
                <Switch checked={form.is_public} onCheckedChange={(v) => set('is_public', v)} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate(-1)} className="h-11 flex-1 rounded-full">
                  {t('取消')}
                </Button>
                <Button
                  onClick={submit}
                  disabled={busy}
                  className="h-11 flex-[1.6] gap-1 rounded-full font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-foreground)', boxShadow: 'var(--ds-shadow-md)' }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {completeWish ? t('完成打卡') : isEdit ? t('保存修改') : t('保存打卡')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </main>
    </div>
  )
}
