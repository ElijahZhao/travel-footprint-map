import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import app from '../lib/cloudbase'
import { MapPin, Loader2, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { applySession } = useAuth()
  const { t } = useTranslation()
  const handled = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const provider = params.get('provider') || 'google'
      const isPopup = params.get('mode') === 'popup'

      if (!code) {
        navigate('/')
        return
      }

      try {
        const res = await app.callFunction({
          name: 'oauth-callback',
          data: { code, provider },
        })

        const result = res.result as any
        if (!result || result.status !== 'success') {
          setError(result?.message || t('登录失败，请重试'))
          setTimeout(() => navigate('/'), 2000)
          return
        }

        const { access_token, refresh_token, user: oauthUser } = result.data

        if (isPopup && window.opener) {
          window.opener.postMessage(
            { type: 'oauth_callback', access_token, refresh_token, user: oauthUser },
            window.location.origin
          )
          window.close()
        } else {
          await applySession(access_token, refresh_token, oauthUser)
          navigate('/me')
        }
      } catch (err) {
        setError(t('登录失败，请重试'))
        setTimeout(() => navigate('/'), 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="page-bg paper-texture flex min-h-full flex-col items-center justify-center gap-5 px-6">
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* 品牌加载动画 */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: '3px solid color-mix(in oklab, var(--accent) 30%, transparent)', borderTopColor: 'var(--accent)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {error ? <TriangleAlert className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
          </motion.span>
        </div>

        <div className="text-center">
          <p className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>
            {error ? t('登录未完成') : t('正在登录…')}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {!error && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {error || t('登录成功后将自动跳转')}
          </p>
        </div>
      </div>
    </div>
  )
}
