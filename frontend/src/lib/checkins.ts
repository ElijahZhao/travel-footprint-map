import { db, rpc } from '@/lib/cloudbase'
import { isGuest, getGuestCheckins, setGuestCheckins, buildGuestCheckin } from './guest'
import type { Checkin, CheckinInput } from './types'

/** 读取本人全部打卡。游客模式读本地示例数据；正式账号走云端 RLS（仅返回本人）。 */
export async function fetchMyCheckins(): Promise<Checkin[]> {
  if (isGuest()) return getGuestCheckins()
  const { data, error } = await db
    .from('checkins')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Checkin[]
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
  return (data ?? []) as unknown as Checkin[]
}

export async function fetchCheckinById(id: number): Promise<Checkin | null> {
  if (isGuest()) return getGuestCheckins().find((c) => c.id === id) ?? null
  const { data, error } = await db
    .from('checkins')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Checkin) ?? null
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
