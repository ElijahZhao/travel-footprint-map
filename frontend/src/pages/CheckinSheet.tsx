import { useNavigate } from 'react-router-dom'
import CheckinForm from './CheckinForm'
import BottomSheet from '@/components/BottomSheet'

/** 打卡表单的容器：以全屏上滑抽屉呈现。 */
export default function CheckinSheet() {
  const navigate = useNavigate()
  return (
    <BottomSheet open onClose={() => navigate(-1)} heightClass="h-[94%]">
      <CheckinForm />
    </BottomSheet>
  )
}
