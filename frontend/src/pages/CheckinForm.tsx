import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useCheckin, useCreateCheckin, useUpdateCheckin } from '@/lib/hooks'
import { CATEGORIES, categoryMeta } from '@/lib/categories'
import { uploadPhoto } from '@/lib/storage'
import { generateCheckinText, aiConfigured } from '@/lib/ai'
import { createClient, LBSError, type POI } from '@/lib/tencent-lbs'
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
  lng: null,
  lat: null,
}

export default function CheckinForm() {
  const { id } = useParams()
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
  const fileRef = useRef<HTMLInputElement>(null)

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
        lng: existing.lng,
        lat: existing.lat,
      })
      setPhotos(existing.photos ?? [])
    }
  }, [existing, completeWish])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleAi = async () => {
    if (!form.place_name.trim()) {
      toast.error('先填写或搜索地点，AI 才能写出贴合的文案')
      return
    }
    if (!aiConfigured()) {
      toast.error('尚未配置 AI：请在 .env 中设置 VITE_AI_API_KEY')
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
      toast.success('AI 文案已生成')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 生成失败')
    } finally {
      setAiLoading(false)
    }
  }

  const searchPlace = async () => {    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await lbs.searchPlace(query.trim(), {
        boundary: 'region(全国,0)',
        pageSize: 10,
        pageIndex: 1,
      })
      setResults(res.data ?? [])
    } catch (e) {
      toast.error(e instanceof LBSError ? e.message : '地点搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const pickPlace = (poi: POI) => {
    set('place_name', poi.title)
    set('address', poi.address)
    set('lng', poi.location.lng)
    set('lat', poi.location.lat)
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
      toast.success(`已上传 ${uploaded.length} 张照片`)
    } catch (e) {
      toast.error('照片上传失败，可稍后重试')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    if (!form.place_name.trim()) return toast.error('请填写地点名称')
    if (form.lng == null || form.lat == null)
      return toast.error('请先搜索并选择地点以获取坐标')

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
      lng: form.lng,
      lat: form.lat,
    }

    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: Number(id), input })
        if (completeWish) {
          toast.success(`已点亮：${input.place_name}`)
          navigate('/timeline')
        } else {
          toast.success('已更新打卡')
          navigate(`/checkin/${id}`)
        }
      } else {
        await createMut.mutateAsync(input)
        toast.success('打卡成功')
        navigate('/')
      }
    } catch (e: any) {
      toast.error(e?.message || '保存失败')
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>加载中…</p>
      </div>
    )
  }

  const meta = categoryMeta(form.category)
  const busy = createMut.isPending || updateMut.isPending || uploading

  return (
    <div style={{ background: 'var(--background)' }}>
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-4 pt-1">
        <FadeIn duration={0.35}>
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-2xl"
              style={{ background: meta.color, color: 'white' }}
            >
              <meta.icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="font-bold leading-tight" style={{ fontSize: 'var(--font-size-title)' }}>
                {completeWish ? '完成心愿' : isEdit ? '编辑打卡' : '新增打卡'}
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {completeWish
                  ? `「${form.place_name || '这个地方'}」去过啦？记下这次出发吧`
                  : isEdit
                    ? '修改后保存即可更新'
                    : '记录这一刻，点亮你的足迹'}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn duration={0.4}>
          <Card className="card-paper rounded-3xl" style={{ borderColor: 'var(--border)' }}>
            <CardContent className="space-y-5 p-5">
              {/* 地点搜索 */}
              <div className="space-y-2">
                <Label>地点名称 *</Label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    placeholder="搜索地点，如：西湖"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
                  />
                  <Button variant="outline" onClick={searchPlace} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {results.length > 0 && (
                  <div className="max-h-56 overflow-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
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
                  placeholder="或手动填写地点名称"
                  onChange={(e) => set('place_name', e.target.value)}
                />
                {form.lng != null && (
                  <p className="text-xs" style={{ color: 'var(--success)' }}>
                    已定位坐标：{form.lat!.toFixed(4)}, {form.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* 地址 */}
              <div className="space-y-2">
                <Label>详细地址</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>

              {/* 分类（chip 选择，对齐概念图） */}
              <div className="space-y-2">
                <Label>分类</Label>
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
                          boxShadow: active ? `0 4px 12px color-mix(in oklab, ${c.hex} 32%, transparent)` : 'none',
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 状态：已去 / 心愿 */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--secondary)' }}>
                <span className="text-sm font-medium">
                  {form.status === 'wish' ? '加入心愿单' : '已打卡'}
                </span>
                <Switch
                  checked={form.status === 'visited'}
                  onCheckedChange={(v) => set('status', v ? 'visited' : 'wish')}
                />
              </div>

              {/* 日期（仅已打卡显示） */}
              {form.status === 'visited' && (
                <div className="space-y-2">
                  <Label>到访日期</Label>
                  <Input type="date" value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
                </div>
              )}

              {/* 评分 */}
              <div className="space-y-2">
                <Label>评分</Label>
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
                  <Label>旅行心情</Label>
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
                    AI 帮我写
                  </Button>
                </div>
                <Textarea
                  value={form.mood_text}
                  placeholder="写点什么吧，比如：夕阳下的湖面格外温柔…"
                  onChange={(e) => set('mood_text', e.target.value)}
                  rows={3}
                />
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label>标签（用逗号分隔）</Label>
                <Input value={form.tags} placeholder="日落, 亲子, 必去" onChange={(e) => set('tags', e.target.value)} />
              </div>

              {/* 照片 */}
              <div className="space-y-2">
                <Label>照片</Label>
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
                    上传
                  </button>
                </div>
              </div>

              {/* 公开 */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--secondary)' }}>
                <div>
                  <p className="text-sm font-medium">精选公开</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>开启后会出现在你的分享页</p>
                </div>
                <Switch checked={form.is_public} onCheckedChange={(v) => set('is_public', v)} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate(-1)} className="h-11 flex-1 rounded-full">
                  取消
                </Button>
                <Button
                  onClick={submit}
                  disabled={busy}
                  className="h-11 flex-[1.6] gap-1 rounded-full font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-foreground)', boxShadow: 'var(--ds-shadow-md)' }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {completeWish ? '完成打卡' : isEdit ? '保存修改' : '保存打卡'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </main>
    </div>
  )
}
