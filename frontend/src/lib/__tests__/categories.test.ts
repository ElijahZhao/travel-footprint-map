import { describe, it, expect } from 'vitest'
import { categoryMeta, CATEGORIES } from '@/lib/categories'

describe('categoryMeta', () => {
  it('返回已知分类的元数据', () => {
    expect(categoryMeta('food').label).toBe('美食')
  })

  it('未知 key 回退到第一个分类', () => {
    expect(categoryMeta('not-a-real-key')).toBe(CATEGORIES[0])
  })

  it('覆盖全部 CategoryKey', () => {
    const keys = ['scenery', 'food', 'culture', 'city', 'family', 'outdoor'] as const
    for (const k of keys) expect(categoryMeta(k).key).toBe(k)
  })
})
