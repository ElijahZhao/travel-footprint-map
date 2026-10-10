import { db, rpc } from '@/lib/cloudbase'
import { isGuest, getGuestCheckins, setGuestCheckins, buildGuestCheckin } from './guest'
import type { Checkin, CheckinInput, PhotoItem } from './types'

/** 云端行 → Checkin 的显式映射，避免直接 `as unknown as` 绕过类型校验导致运行时崩溃。 */
function normalize(row: Record<string, unknown>): Checkin {
  return {
    ...(row as unknown as Checkin),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    photos: Array.isArray(row.photos) ? (row.photos as PhotoItem[]) : [],
    status: row.status === 'wish' ? 'wish' : 'visited',
    rating: Number(row.rating) || 0,
    is_public: Boolean(row.is_public),
  }
}

/** 读取本人全部打卡。游客模式读本地示例数据；正式账号走云端 RLS（仅返回本人）。 */
export async function fetchMyCheckins(): Promise<Checkin[]> {
  if (isGuest()) return getGuestCheckins()
  const { data, error } = await db
    .from('checkins')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalize)
}

/** 读取某用户的公开精选打卡（命中 select_public 策略，免登录可读）。 */
export async function fetchPublicCheckins(publicId: string): Promise<Checkin[]> {
  const { data, error } = await db
    .from('checkins')
    .select('*')
    .eq('user_id', publicId)
    .eq('is_public', true)
    .order('visit_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalize)
}

export async function fetchCheckinById(id: number): Promise<Checkin | null> {
  if (isGuest()) return getGuestCheckins().find((c) => c.id === id) ?? null
  const { data, error } = await db
    .from('checkins')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? normalize(data as Record<string, unknown>) : null
}

export async function createCheckin(input: CheckinInput): Promise<void> {
  if (isGuest()) {
    setGuestCheckins([buildGuestCheckin(input), ...getGuestCheckins()])
    return
  }
  // 注意：不接 .select()、不传 user_id（DEFAULT auth.uid() 自动填充）、不传 null 给 user_id
  const { error } = await db.from('checkins').insert({
    place_name: input.place_name,
    address: input.address ?? null,
    lng: input.lng,
    lat: input.lat,
    category: input.category,
    status: input.status,
    visit_date: input.visit_date ?? null,
    mood_text: input.mood_text ?? null,
    tags: input.tags ?? [],
    photos: input.photos ?? [],
    rating: input.rating ?? 0,
    is_public: input.is_public ?? false,
    nation: input.nation ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function updateCheckin(id: number, input: CheckinInput): Promise<void> {
  if (isGuest()) {
    const list = getGuestCheckins().map((c) =>
      c.id === id
        ? { ...c, ...input, updated_at: new Date().toISOString() }
        : c,
    )
    setGuestCheckins(list)
    return
  }
  const { error } = await db
    .from('checkins')
    .update({
      place_name: input.place_name,
      address: input.address ?? null,
      lng: input.lng,
      lat: input.lat,
      category: input.category,
      status: input.status,
      visit_date: input.visit_date ?? null,
      mood_text: input.mood_text ?? null,
      tags: input.tags ?? [],
      photos: input.photos ?? [],
      rating: input.rating ?? 0,
      is_public: input.is_public ?? false,
      nation: input.nation ?? null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCheckin(id: number): Promise<void> {
  if (isGuest()) {
    setGuestCheckins(getGuestCheckins().filter((c) => c.id !== id))
    return
  }
  const { error } = await db.from('checkins').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 游客示例数据的固定 id，合并时应跳过，避免把演示数据带进正式账号。 */
export const SAMPLE_GUEST_IDS = new Set([
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012,
])

/** 本机游客数据中、用户真正新增（非示例）且可合并的条数。 */
export function getLocalGuestCheckinCount(): number {
  return getGuestCheckins().filter((c) => !SAMPLE_GUEST_IDS.has(Number(c.id))).length
}

/**
 * 把本机游客打卡合并进当前登录的云端账号（跳过示例数据）。
 * 直接写云端表，不经由 createCheckin 的 isGuest 分支；user_id 由 RLS 的 auth.uid() 自动填充。
 * 逐条插入、单条失败不阻断其余，返回成功合并的条数。
 */
export async function mergeLocalCheckinsToCloud(): Promise<number> {
  const local = getGuestCheckins().filter((c) => !SAMPLE_GUEST_IDS.has(Number(c.id)))
  if (local.length === 0) return 0
  let merged = 0
  for (const c of local) {
    try {
      const { error } = await db.from('checkins').insert({
        place_name: c.place_name,
        address: c.address ?? null,
        lng: c.lng,
        lat: c.lat,
        category: c.category,
        status: c.status,
        visit_date: c.visit_date ?? null,
        mood_text: c.mood_text ?? null,
        tags: c.tags ?? [],
        photos: c.photos ?? [],
        rating: c.rating ?? 0,
        is_public: c.is_public ?? false,
        nation: (c as { nation?: string | null }).nation ?? null,
      })
      if (!error) merged++
    } catch {
      /* 单条失败不阻断其余 */
    }
  }
  return merged
}

export interface TravelStats {
  total: number
  visited: number
  wish: number
  cities: number
  by_category: Record<string, number>
}

/** 本地计算统计（游客模式用，不依赖云端 RPC）。 */
export function computeStats(checkins: Checkin[]): TravelStats {
  const visited = checkins.filter((c) => c.status === 'visited')
  const by_category: Record<string, number> = {}
  for (const c of visited) by_category[c.category] = (by_category[c.category] || 0) + 1
  const cities = new Set(
    visited.map((c) => c.address?.replace(/^(.{2}省|.{2}市|.{2}自治区|.{2}特别行政区)/, '') || c.place_name),
  ).size
  return {
    total: checkins.length,
    visited: visited.length,
    wish: checkins.filter((c) => c.status === 'wish').length,
    cities,
    by_category,
  }
}

/** 调用 get_travel_stats RPC 汇总统计（正式账号）。 */
export async function fetchStats(uid: string): Promise<TravelStats> {
  const data = await rpc<TravelStats>('get_travel_stats', { target_user: uid })
  return {
    total: data?.total ?? 0,
    visited: data?.visited ?? 0,
    wish: data?.wish ?? 0,
    cities: data?.cities ?? 0,
    by_category: data?.by_category ?? {},
  }
}
