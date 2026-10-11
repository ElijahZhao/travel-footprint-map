import { describe, it, expect, vi } from 'vitest'

// checkins.ts 在模块加载时会初始化 CloudBase SDK / 访问本地存储，
// node 测试环境下用桩替换这两个依赖，只验证纯函数 computeStats。
vi.mock('@/lib/cloudbase', () => ({ db: {}, rpc: vi.fn() }))
vi.mock('@/lib/guest', () => ({
  isGuest: () => false,
  getGuestCheckins: () => [],
  setGuestCheckins: () => {},
  buildGuestCheckin: (i: unknown) => i,
}))

import { computeStats } from '@/lib/checkins'
import type { Checkin } from '@/lib/types'

function mk(partial: Partial<Checkin>): Checkin {
  return {
    id: 1,
    user_id: 'u',
    place_name: 'p',
    address: null,
    lng: 0,
    lat: 0,
    category: 'scenery',
    status: 'visited',
    visit_date: null,
    mood_text: null,
    tags: [],
    photos: [],
    rating: 0,
    is_public: false,
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('computeStats', () => {
  it('统计 total / visited / wish 数量', () => {
    const list = [mk({ status: 'visited' }), mk({ status: 'wish' }), mk({ status: 'visited' })]
    const s = computeStats(list)
    expect(s.total).toBe(3)
    expect(s.visited).toBe(2)
    expect(s.wish).toBe(1)
  })

  it('by_category 仅按已去(visited)打卡聚合', () => {
    const list = [
      mk({ category: 'food' }),
      mk({ category: 'food' }),
      mk({ category: 'scenery', status: 'wish' }),
    ]
    const s = computeStats(list)
    expect(s.by_category).toEqual({ food: 2 })
  })

  it('城市数：剥离省级前缀后按去重计数', () => {
    const list = [
      mk({ address: '浙江省杭州市' }),
      mk({ address: '浙江省杭州市' }),
      mk({ address: '广东省深圳市' }),
    ]
    const s = computeStats(list)
    expect(s.cities).toBe(2)
  })

  it('address 为空时回退到 place_name 去重', () => {
    const list = [mk({ address: null, place_name: '同一个地方' }), mk({ address: null, place_name: '同一个地方' })]
    const s = computeStats(list)
    expect(s.cities).toBe(1)
  })

  it('空输入返回全零结构', () => {
    const s = computeStats([])
    expect(s).toEqual({ total: 0, visited: 0, wish: 0, cities: 0, by_category: {} })
  })
})
