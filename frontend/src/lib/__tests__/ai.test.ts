import { describe, it, expect, vi } from 'vitest'

// API_KEY 在模块加载时从 import.meta.env 捕获，需重置模块后才能用新环境变量重测。
describe('aiConfigured', () => {
  it('未配置密钥时返回 false', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_AI_API_KEY', '')
    const { aiConfigured } = await import('@/lib/ai')
    expect(aiConfigured()).toBe(false)
  })

  it('配置了密钥时返回 true', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_AI_API_KEY', 'sk-test')
    const { aiConfigured } = await import('@/lib/ai')
    expect(aiConfigured()).toBe(true)
  })
})
