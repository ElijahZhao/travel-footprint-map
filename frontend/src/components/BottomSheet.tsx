import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  /** 高度类，默认 h-[90%]（接近全屏抽屉） */
  heightClass?: string
}

const spring = { type: 'spring', damping: 32, stiffness: 340 } as const

/** 移动端上滑抽屉：遮罩 + 底部圆角面板，用于打卡表单等场景。 */
export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  heightClass = 'h-[90%]',
}: BottomSheetProps) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl bg-[var(--card)] shadow-2xl ${heightClass}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="relative shrink-0 px-4 pt-2">
              <div className="mx-auto h-1.5 w-10 rounded-full" style={{ background: 'var(--border)' }} />
              <button
                type="button"
                onClick={onClose}
                aria-label={t('关闭')}
                className="absolute right-3 top-0.5 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {title && (
              <div className="shrink-0 px-4 pb-2 pt-1">
                <h2 className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>{title}</h2>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
