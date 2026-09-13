import { type LucideIcon, MapPin } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({
  icon: Icon = MapPin,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center"
      style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}
    >
      <div
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
