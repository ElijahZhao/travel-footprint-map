import { MapPin, Utensils, Landmark, Building2, Baby, Mountain, type LucideIcon } from 'lucide-react'
import type { CategoryKey } from './types'

export interface CategoryMeta {
  key: CategoryKey
  label: string
  /** CSS 变量名（用于前端着色） */
  color: string
  /** 16 进制（用于地图 marker / 静态图） */
  hex: string
  /** 静态地图 API 允许的命名色 */
  staticColor: 'green' | 'orange' | 'purple' | 'blue' | 'red' | 'yellow'
  icon: LucideIcon
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'scenery', label: '风景', color: 'var(--primary)', hex: '#38A05F', staticColor: 'green', icon: MapPin },
  { key: 'food', label: '美食', color: 'var(--accent)', hex: '#F29755', staticColor: 'orange', icon: Utensils },
  { key: 'culture', label: '人文', color: 'oklch(0.62 0.16 300)', hex: '#9B6FD0', staticColor: 'purple', icon: Landmark },
  { key: 'city', label: '城市', color: 'var(--theme-blue)', hex: '#4E8FD9', staticColor: 'blue', icon: Building2 },
  { key: 'family', label: '亲子', color: 'var(--theme-rose)', hex: '#E8708A', staticColor: 'red', icon: Baby },
  { key: 'outdoor', label: '户外', color: 'oklch(0.72 0.13 195)', hex: '#3FB4C9', staticColor: 'yellow', icon: Mountain },
]

const MAP = new Map(CATEGORIES.map((c) => [c.key, c]))
export function categoryMeta(key: string): CategoryMeta {
  return MAP.get(key as CategoryKey) ?? CATEGORIES[0]
}
