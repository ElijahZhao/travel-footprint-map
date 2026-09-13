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
  { key: 'scenery', label: '风景', color: 'var(--scenery)', hex: '#3fae7e', staticColor: 'green', icon: MapPin },
  { key: 'food', label: '美食', color: 'var(--food)', hex: '#e6953a', staticColor: 'orange', icon: Utensils },
  { key: 'culture', label: '人文', color: 'var(--culture)', hex: '#9b5cc4', staticColor: 'purple', icon: Landmark },
  { key: 'city', label: '城市', color: 'var(--city)', hex: '#4a7fd1', staticColor: 'blue', icon: Building2 },
  { key: 'family', label: '亲子', color: 'var(--family)', hex: '#d95a6b', staticColor: 'red', icon: Baby },
  { key: 'outdoor', label: '户外', color: 'var(--outdoor)', hex: '#3aa9c4', staticColor: 'yellow', icon: Mountain },
]

const MAP = new Map(CATEGORIES.map((c) => [c.key, c]))
export function categoryMeta(key: string): CategoryMeta {
  return MAP.get(key as CategoryKey) ?? CATEGORIES[0]
}
