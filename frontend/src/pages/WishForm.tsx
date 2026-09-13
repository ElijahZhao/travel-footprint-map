import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ImagePlus, Loader2, MapPin, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

import { FadeIn } from '@/components/MotionPrimitives'
import { Surface } from '@/components/Surface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORIES } from '@/lib/categories'
import { useAuth } from '@/lib/AuthContext'
import { useCreateCheckin } from '@/lib/hooks'
import { uploadPhoto } from '@/lib/storage'
import { createClient, LBSError, type POI } from '@/lib/tencent-lbs'
import type { CategoryKey, CheckinInput, PhotoItem } from '@/lib/types'

interface WishFormState {
  place_name: string
  address: string
  category: CategoryKey
  mood_text: string
  lng: number | null
  lat: number | null
}

const EMPTY: WishFormState = {
  place_name: '',
  address: '',
  category: 'scenery',
  mood_text: '',
  lng: null,
  lat: null,
}

const WISH_GRAD = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.72 0.14 295))'

const lbs = createClient()

export default function WishForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createMut = useCreateCheckin()

  const [form, setForm] = useState<WishFormState>(EMPTY)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<POI[]>([])
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof WishFormState>(k: K, v: WishFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    document.title = '新增心愿'
  }, [])

  const doSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    try {
      const res = await lbs.searchPlace(q, {
        boundary: 'region(全国,0)',
        pageSize: 10,
        pageIndex: 1,
      })
      const list = res.data ?? []
      setResults(list)
      if (list.length === 0) toast.message('没有找到这个地点，试试更完整的名称')
    } catch (e) {
      toast.error(e instanceof LBSError ? e.message : '搜索失败，请稍后重试')
    } finally {
      setSearching(false)
    }
  }

  const pick = (p: POI) => {
    setForm((f) => ({
      ...f,
      place_name: p.title,
      address: p.address || f.address,
      lng: p.location.lng,
      lat: p.location.lat,
    }))
    setResults([])
    setQuery('')
  }

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploaded: PhotoItem[] = []
      for (const f of Array.from(files)) {
        const url = await uploadPhoto(f, user?.uid ?? 'guest')
        uploaded.push({ url })
      }
      setPhotos((p) => [...p, ...uploaded])
      toast.success(`已上传 ${uploaded.length} 张照片`)
    } catch {
      toast.error('照片上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    if (!form.place_name.trim()) {
      toast.error('请先写下或搜索一个想去的地方')
      return
    }
    if (form.lng == null || form.lat == null) {
      toast.error('请先搜索选择地点，这样它才能出现在你的地图上')
      return
    }
    const input: CheckinInput = {
      place_name: form.place_name.trim(),
      address: form.address.trim() || null,
      category: form.category,
      status: 'wish',
      visit_date: null,
      mood_text: form.mood_text.trim() || null,
      tags: [],
      rating: 0,
      is_public: false,
      photos,
      lng: form.lng,
      lat: form.lat,
    }
    try {
      await createMut.mutateAsync(input)
      toast.success('心愿已收藏')
      navigate('/wishlist')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const busy = createMut.isPending || uploading

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
        <FadeIn>
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: WISH_GRAD, boxShadow: '0 6px 18px oklch(0.72 0.14 295 / 0.32)' }}
            >
              <Heart className="h-5 w-5" fill="currentColor" />
            </span>
            <div className="min-w-0">
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: 'var(--font-size-title)' }}
              >
                新增心愿
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                把想去的地方，先放进愿望清单
              </p>
            </div>
          </div>
        </FadeIn>

        {/* 地点 */}
        <FadeIn delay={0.04}>
          <Surface pad="lg" className="card-paper space-y-3">
            <label className="text-sm font-medium" htmlFor="wish-place">
              想去哪里
            </label>
            <div className="flex gap-2">
              <Input
                id="wish-place"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void doSearch()
                  }
                }}
                placeholder="搜索城市或景点，如「大理」「西湖」"
              />
              <Button
                type="button"
                onClick={() => void doSearch()}
                disabled={searching}
                className="shrink-0 gap-1"
                style={{ background: 'oklch(0.72 0.14 295)', color: 'white' }}
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <AnimatePresence>
              {results.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {results.map((p, i) => (
                    <li key={`${p.title}-${i}`}>
                      <button
                        type="button"
                        onClick={() => pick(p)}
                        className="w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--muted)]"
                      >
                        <div className="text-sm font-medium">{p.title}</div>
                        {p.address && (
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {p.address}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            <Input
              value={form.place_name}
              onChange={(e) => set('place_name', e.target.value)}
              placeholder="地点名称"
            />

            <Input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="详细地址（选填）"
            />

            <p
              className="flex items-center gap-1.5 text-xs"
              style={{ color: form.lng != null ? 'var(--muted-foreground)' : 'var(--muted-foreground)' }}
            >
              <MapPin className="h-3.5 w-3.5" />
              {form.lng != null
                ? '已记在地图上，之后可以点亮它'
                : '搜索选择地点后，它才会出现在你的足迹地图上'}
            </p>
          </Surface>
        </FadeIn>

        {/* 分类 */}
        <FadeIn delay={0.08}>
          <Surface pad="lg" className="card-paper space-y-3">
            <label className="text-sm font-medium">这是哪一类</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = form.category === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => set('category', c.key)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: active ? c.hex : 'var(--muted)',
                      color: active ? 'white' : 'var(--muted-foreground)',
                      boxShadow: active ? `0 4px 12px ${c.hex}55` : 'none',
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </Surface>
        </FadeIn>

        {/* 期待 */}
        <FadeIn delay={0.12}>
          <Surface pad="lg" className="card-paper space-y-3">
            <label className="text-sm font-medium" htmlFor="wish-mood">
              记一句期待
            </label>
            <Textarea
              id="wish-mood"
              rows={3}
              value={form.mood_text}
              onChange={(e) => set('mood_text', e.target.value)}
              placeholder="为什么想去这里？先记下一句心里的期待…"
            />
          </Surface>
        </FadeIn>

        {/* 照片 */}
        <FadeIn delay={0.16}>
          <Surface pad="lg" className="card-paper space-y-3">
            <label className="text-sm font-medium">存几张图片（选填）</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={`${p.url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-xl">
                  <img src={p.thumb || p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
                    aria-label="移除照片"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? '上传中' : '添加'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
          </Surface>
        </FadeIn>
      </div>

      <div
        className="flex shrink-0 gap-2 border-t px-4 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <Button variant="ghost" className="h-11 rounded-full" onClick={() => navigate(-1)}>
          取消
        </Button>
        <Button
          className="h-11 flex-1 rounded-full"
          onClick={() => void submit()}
          disabled={busy}
          style={{ background: 'oklch(0.72 0.14 295)', color: 'white' }}
        >
          {busy ? '保存中…' : '保存心愿'}
        </Button>
      </div>
    </div>
  )
}
