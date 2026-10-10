import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { auth } from './cloudbase'
import { enterGuestStore, exitGuestStore, isGuest, setGuestCheckins } from './guest'
import { mergeLocalCheckinsToCloud } from './checkins'

export type UserProfile = {
  uid: string
  email: string
  name: string
  avatar_url: string
  provider: string
} | null

type AuthContextType = {
  user: UserProfile
  /** 本地游客模式：未登录但已进入体验态，数据存于本设备。 */
  guest: boolean
  loading: boolean
  enterGuest: () => void
  signInWithGoogle: () => Promise<void>
  sendEmailCode: (email: string) => Promise<any>
  signUpWithEmail: (email: string, code: string, verificationInfo: any) => Promise<void>
  signInWithEmail: (email: string, code: string, verificationInfo: any) => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<any>
  resetPasswordForOld: (oldPassword: string, newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  applySession: (accessToken: string, refreshToken: string, oauthUser: UserProfile) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  guest: false,
  loading: true,
  enterGuest: () => {},
  signInWithGoogle: async () => {},
  sendEmailCode: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signInWithEmailPassword: async () => {},
  resetPasswordForEmail: async () => ({}),
  resetPasswordForOld: async () => {},
  signOut: async () => {},
  applySession: async () => {},
})

/** Fetch current user profile via v2 SDK auth.getUser(). Returns null if not logged in. */
async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const { data, error } = await (auth as any).getUser()
    if (error || !data?.user) return null
    const user = data.user
    const provider = user.app_metadata?.provider || 'unknown'
    if (!user.email) return null
    return {
      uid: user.id || '',
      email: user.email || '',
      name: user.user_metadata?.nickName || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatarUrl || '',
      provider,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [user, setUser] = useState<UserProfile>(null)
  const [guest, setGuest] = useState(() => isGuest())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const profile = await fetchUserProfile()
        setUser(profile)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 进入本地游客模式（数据仅存本设备，与云端账号无关）
  const enterGuest = useCallback(() => {
    enterGuestStore()
    setGuest(true)
  }, [])

  // 登录正式账号时自动退出游客模式，二者互不冲突
  const onLoggedIn = useCallback(async (profile: UserProfile) => {
    // 先把本机游客期间新增的足迹合并进云端账号（跳过示例数据）
    let merged = 0
    try {
      merged = await mergeLocalCheckinsToCloud()
    } catch {
      /* 合并失败不阻断登录 */
    }
    if (merged > 0) {
      toast.success(t('已把本机的 {{n}} 条足迹合并到账号', { n: merged }))
    }
    exitGuestStore()
    setGuestCheckins([]) // 清空本机游客数据，避免与云端互相串用
    setGuest(false)
    setUser(profile)
    // 账号模式切换后清空缓存，触发从云端重新拉取（含刚合并的数据）
    queryClient.clear()
  }, [queryClient, t])

  const applySession = async (
    accessToken: string,
    refreshToken: string,
    oauthUser: UserProfile
  ) => {
    await (auth as any).setSession({ access_token: accessToken, refresh_token: refreshToken })
    await onLoggedIn(await fetchUserProfile() ?? oauthUser)
  }

  const signInWithGoogle = async () => {
    const isInIframe = window.self !== window.top
    const callbackUrl = isInIframe
      ? `${window.location.origin}/auth/callback?mode=popup`
      : `${window.location.origin}/auth/callback`

    const oauthUrl = `${import.meta.env.VITE_OAUTH_RELAY_URL}/authorize?provider=google&callback_url=${encodeURIComponent(callbackUrl)}`

    if (!isInIframe) {
      window.location.href = oauthUrl
    } else {
      const popup = window.open(oauthUrl, 'oauth_popup', 'width=520,height=620,left=200,top=100')
      await new Promise<void>((resolve, reject) => {
        const handler = async (event: MessageEvent) => {
          if (event.data?.type !== 'oauth_callback') return
          window.removeEventListener('message', handler)
          clearInterval(checkClosed)
          try {
            const { access_token, refresh_token, user: oauthUser } = event.data
            await applySession(access_token, refresh_token, oauthUser)
            resolve()
          } catch (e) { reject(e) }
        }
        window.addEventListener('message', handler)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handler)
            resolve()
          }
        }, 500)
      })
    }
  }

  const sendEmailCode = async (email: string) => {
    const { data, error } = await (auth as any).signInWithOtp({ email })
    if (error) throw new Error(error.message || 'Failed to send verification code')
    return data
  }

  const signUpWithEmail = async (_email: string, code: string, verificationInfo: any) => {
    const { error } = await verificationInfo.verifyOtp({ token: code })
    if (error) throw new Error(error.message || 'Verification failed')
    await onLoggedIn(await fetchUserProfile())
  }

  const signInWithEmail = async (_email: string, code: string, verificationInfo: any) => {
    const { error } = await verificationInfo.verifyOtp({ token: code })
    if (error) throw new Error(error.message || 'Verification failed')
    await onLoggedIn(await fetchUserProfile())
  }

  const signInWithEmailPassword = async (email: string, password: string) => {
    const { error } = await (auth as any).signInWithPassword({ email, password })
    if (error) throw new Error(error.message || 'Email password login failed')
    await onLoggedIn(await fetchUserProfile())
  }

  const resetPasswordForEmail = async (email: string) => {
    const { data, error } = await (auth as any).resetPasswordForEmail(email)
    if (error) throw new Error(error.message || 'Failed to send reset code')
    return {
      ...data,
      updateUser: async (params: { nonce: string; password: string }) => {
        const result = await data.updateUser(params)
        if (result.error) throw new Error(result.error.message || 'Failed to reset password')
        await onLoggedIn(await fetchUserProfile())
        return result
      },
    }
  }

  const resetPasswordForOld = async (oldPassword: string, newPassword: string) => {
    const { error } = await (auth as any).resetPasswordForOld({
      old_password: oldPassword,
      new_password: newPassword,
    })
    if (error) throw new Error(error.message || 'Failed to reset password')
  }

  const signOut = async () => {
    setUser(null)
    await auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, guest, loading,
      enterGuest,
      signInWithGoogle, sendEmailCode, signUpWithEmail, signInWithEmail, signInWithEmailPassword,
      resetPasswordForEmail, resetPasswordForOld, signOut, applySession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
