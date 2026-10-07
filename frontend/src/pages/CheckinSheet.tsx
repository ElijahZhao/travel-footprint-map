import { useLocation, useNavigate } from 'react-router-dom'
import CheckinForm from './CheckinForm'
import BottomSheet from '@/components/BottomSheet'

/** 打卡表单的容器：以全屏上滑抽屉呈现。 */
export default function CheckinSheet() {
  const navigate = useNavigate()
  // AppShell 在 <Routes> 之外渲染本组件，useParams 拿不到路由参数，
  // 编辑态的打卡 id 需从地址栏解析：/checkin/:id/edit
  const editId = useLocation().pathname.match(/^\/checkin\/(\d+)\/edit$/)?.[1]
  return (
    <BottomSheet open onClose={() => navigate(-1)} heightClass="h-[94%]">
      <CheckinForm checkinId={editId} />
    </BottomSheet>
  )
}
