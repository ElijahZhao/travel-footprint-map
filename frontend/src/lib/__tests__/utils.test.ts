import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('拼接真值类名', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('丢弃假值', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('合并冲突的 Tailwind 类（后者生效）', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
