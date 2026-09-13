import { useNavigate } from 'react-router-dom'
import WishForm from './WishForm'
import BottomSheet from '@/components/BottomSheet'

/** 新增心愿表单的容器：以全屏上滑抽屉呈现。 */
export default function WishSheet() {
  const navigate = useNavigate()
  return (
    <BottomSheet open onClose={() => navigate(-1)} heightClass="h-[94%]">
      <WishForm />
    </BottomSheet>
  )
}
