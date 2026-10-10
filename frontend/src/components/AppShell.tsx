import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import MobileFrame from './MobileFrame'
import BottomNav from './BottomNav'
import CheckinSheet from '@/pages/CheckinSheet'
import WishSheet from '@/pages/WishSheet'

const TAB_ROUTES = ['/', '/timeline', '/wishlist', '/stats', '/me']

/**
 * App 外壳：手机边框 + 滚动内容区 + 底部导航。
 * 表单路由以全屏上滑抽屉形式覆盖在上方：
 * - 打卡表单：/checkin/new 与 /checkin/:id/edit（含 ?complete=1 完成心愿）
 * - 心愿表单：/wish/new
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isTab = TAB_ROUTES.includes(pathname)
  const isWishSheet = pathname === '/wish/new'
  const isCheckinSheet = pathname === '/checkin/new' || /^\/checkin\/\d+\/edit$/.test(pathname)
  const showChrome = isTab

  return (
    <MobileFrame>
      {/* 手机框内的可用高度由这个 flex 容器独占，底部导航作为正常流布局参与占位，
          这样内容区（flex-1）天然就是「导航以上」的剩余空间，页面无需再猜测视口高度。 */}
      <div className="relative flex h-full flex-col">
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </div>
        {showChrome && <BottomNav />}
      </div>
      {isWishSheet ? <WishSheet /> : isCheckinSheet && <CheckinSheet />}
    </MobileFrame>
  )
}
