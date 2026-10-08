import { CATEGORIES } from '@/lib/categories'
import type { CategoryKey, CheckinStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export interface FilterValue {
  /** 选中的分类（null = 全部） */
  category: CategoryKey | null
  /** 选中的状态（null = 全部） */
  status: CheckinStatus | null
}

interface FilterBarProps {
  value: FilterValue
  onChange: (next: FilterValue) => void
  /** 是否显示状态筛选（心愿页可隐藏） */
  showStatus?: boolean
}

export default function FilterBar({ value, onChange, showStatus = true }: FilterBarProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip
          active={value.category === null}
          onClick={() => onChange({ ...value, category: null })}
        >
          {t('全部')}
        </Chip>
        {CATEGORIES.map((c) => {
          const Icon = c.icon
          return (
            <Chip
              key={c.key}
              active={value.category === c.key}
              color={c.color}
              onClick={() =>
                onChange({ ...value, category: value.category === c.key ? null : c.key })
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </Chip>
          )
        })}
      </div>

      {showStatus && (
        <div className="flex gap-2">
          {([
            { v: null, label: t('全部') },
            { v: 'visited', label: t('已打卡') },
            { v: 'wish', label: t('心愿单') },
          ] as const).map((opt) => (
            <Chip
              key={opt.label}
              active={value.status === opt.v}
              onClick={() => onChange({ ...value, status: opt.v })}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
      )}
      style={{
        background: active ? (color ?? 'var(--primary)') : 'var(--secondary)',
        color: active ? 'white' : 'var(--muted-foreground)',
      }}
    >
      {children}
    </button>
  )
}
