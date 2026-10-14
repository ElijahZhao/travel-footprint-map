import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export type SeasonMode = 'auto' | Season

/** 季节元信息：中文标签 + 英文 + 选取器用的色板（自动=四色渐变） */
export const SEASON_META: Record<SeasonMode, { label: string; en: string; swatch: string }> = {
  auto: { label: '自动', en: 'Auto', swatch: 'linear-gradient(120deg,#4BA85F,#E89BB0,#2E9FC4,#D98441)' },
  spring: { label: '春', en: 'Spring', swatch: '#4BA85F' },
  summer: { label: '夏', en: 'Summer', swatch: '#2E9FC4' },
  autumn: { label: '秋', en: 'Autumn', swatch: '#D98441' },
  winter: { label: '冬', en: 'Winter', swatch: '#5B8FC9' },
}

const STORAGE_KEY = 'tf_season'

function monthToSeason(m: number): Season {
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

/** 按当前月份推导系统季节（「自动」模式用） */
export function getSystemSeason(): Season {
  return monthToSeason(new Date().getMonth() + 1)
}

interface SeasonCtxValue {
  /** 当前生效季节（auto 时等于系统季节） */
  season: Season
  /** 用户选择：auto 或指定季节 */
  mode: SeasonMode
  setMode: (m: SeasonMode) => void
}

const SeasonCtx = createContext<SeasonCtxValue | null>(null)

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SeasonMode>(() => {
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as SeasonMode | null
    return saved === 'auto' || SEASONS.includes(saved as Season) ? (saved as SeasonMode) : 'auto'
  })
  // auto 模式下每小时重算一次，跨月自动跟随系统季节
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (mode !== 'auto') return
    const id = setInterval(() => setTick((t) => t + 1), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [mode])

  const season: Season = mode === 'auto' ? getSystemSeason() : mode

  useEffect(() => {
    document.documentElement.setAttribute('data-season', season)
    return () => {
      /* 保留最后一次设置的季节，不强制清除 */
    }
  }, [season, tick])

  const setMode = (m: SeasonMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* 隐私模式等场景忽略写入失败 */
    }
    setModeState(m)
  }

  return <SeasonCtx.Provider value={{ season, mode, setMode }}>{children}</SeasonCtx.Provider>
}

export function useSeason(): SeasonCtxValue {
  const ctx = useContext(SeasonCtx)
  if (!ctx) throw new Error('useSeason must be used within SeasonProvider')
  return ctx
}
