import app from '@/lib/cloudbase'
import { isGuest } from './guest'

/**
 * 上传照片到 TCB 对象存储，返回可用于 <img> 的临时访问 URL。
 * 游客模式下返回本地预览地址（blob:），仅当前会话有效。
 * 失败时抛出错误，由调用方决定是否降级（如仅保存打卡、不保存照片）。
 */
export async function uploadPhoto(file: File, uid: string): Promise<string> {
  if (isGuest()) {
    // 本地预览：游客数据不入云端，照片仅当前会话可用
    return URL.createObjectURL(file)
  }
  const safeName = file.name.replace(/[^\w.\-]/g, '_')
  const cloudPath = `checkins/${uid}/${Date.now()}-${safeName}`
  const upload = await (app as any).uploadFile({ cloudPath, filePath: file })
  const fileID: string = upload?.fileID
  if (!fileID) throw new Error('上传失败：未返回文件 ID')

  const urlRes = await (app as any).getTempFileURL({ fileList: [fileID] })
  const tempFileURL: string | undefined = urlRes?.fileList?.[0]?.tempFileURL
  if (!tempFileURL) throw new Error('获取图片地址失败')
  return tempFileURL
}
