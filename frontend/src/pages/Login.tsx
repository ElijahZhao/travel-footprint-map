import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { FadeIn } from '@/components/MotionPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Mail, KeyRound, Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const OAUTH_RELAY = import.meta.env.VITE_OAUTH_RELAY_URL || ''

export default function Login() {
  const { t } = useTranslation()
  const { enterGuest, signInWithGoogle, sendEmailCode, signUpWithEmail, signInWithEmail, signInWithEmailPassword } = useAuth()
  const navigate = useNavigate()
  const [guesting, setGuesting] = useState(false)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [otpInfo, setOtpInfo] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const sendCode = async () => {
    if (!email.trim() || !email.includes('@')) return toast.error(t('请输入有效的邮箱'))
    setSending(true)
    try {
      const info = await sendEmailCode(email.trim())
      setOtpInfo(info)
      toast.success(t('验证码已发送到邮箱'))
    } catch (e: any) {
      toast.error(e?.message || t('发送失败'))
    } finally {
      setSending(false)
    }
  }

  const verify = async (mode: 'signup' | 'signin') => {
    if (!code.trim()) return toast.error(t('请输入验证码'))
    setVerifying(true)
    try {
      if (mode === 'signup') await signUpWithEmail(email.trim(), code.trim(), otpInfo)
      else await signInWithEmail(email.trim(), code.trim(), otpInfo)
      toast.success(t('登录成功'))
      navigate('/me')
    } catch (e: any) {
      toast.error(e?.message || t('验证失败'))
    } finally {
      setVerifying(false)
    }
  }

  const pwdLogin = async () => {
    if (!email.trim() || !pwd) return toast.error(t('请填写邮箱与密码'))
    setVerifying(true)
    try {
      await signInWithEmailPassword(email.trim(), pwd)
      toast.success(t('登录成功'))
      navigate('/me')
    } catch (e: any) {
      toast.error(e?.message || t('登录失败'))
    } finally {
      setVerifying(false)
    }
  }

  const google = async () => {
    if (!OAUTH_RELAY) return toast.error(t('Google 登录未配置，请使用邮箱登录'))
    try {
      await signInWithGoogle()
    } catch (e: any) {
      toast.error(e?.message || t('Google 登录失败'))
    }
  }

  const guest = async () => {
    setGuesting(true)
    try {
      enterGuest()
      toast.success(t('已进入游客体验'))
      navigate('/')
    } catch (e: any) {
      toast.error(e?.message || t('游客体验失败'))
    } finally {
      setGuesting(false)
    }
  }

  return (
    <div className="page-bg paper-texture min-h-full">
      <main className="relative z-10 mx-auto max-w-md space-y-5 px-5 py-10">
        <FadeIn className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--ds-shadow-md)' }}
          >
            <MapPin className="h-8 w-8" />
          </div>
          <h1 className="text-grad-vivid font-bold tracking-tight" style={{ fontSize: 'var(--font-size-headline)' }}>
            {t('脚印地图')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('记录、回顾、分享你的旅行足迹')}
          </p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card className="card-paper rounded-2xl" style={{ borderColor: 'var(--border)' }}>
            <CardContent className="space-y-4 p-5">
              {OAUTH_RELAY && (
                <Button className="w-full gap-2" onClick={google} style={{ background: 'var(--foreground)', color: 'var(--background)' }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M21.35 11.1H12v2.99h5.35c-.23 1.4-1.62 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.3 12 6.3c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.78 3.7 14.6 2.8 12 2.8 6.98 2.8 2.9 6.88 2.9 11.9S6.98 21 12 21c5.02 0 9.1-3.6 9.1-9.04 0-.6-.07-1.06-.15-1.86z" /></svg>
                  {t('使用 Google 登录')}
                </Button>
              )}

              <Tabs defaultValue="otp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="otp">{t('验证码登录')}</TabsTrigger>
                  <TabsTrigger value="pwd">{t('密码登录')}</TabsTrigger>
                </TabsList>

                <TabsContent value="otp" className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {t('邮箱')}</Label>
                    <div className="flex gap-2">
                      <Input value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                      <Button variant="outline" onClick={sendCode} disabled={sending}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('发送')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> {t('验证码')}</Label>
                    <Input value={code} placeholder={t('6 位验证码')} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => verify('signin')} disabled={verifying} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('登录')}
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => verify('signup')} disabled={verifying}>
                      {t('注册')}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="pwd" className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {t('邮箱')}</Label>
                    <Input value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> {t('密码')}</Label>
                    <Input type="password" value={pwd} placeholder="••••••••" onChange={(e) => setPwd(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={pwdLogin} disabled={verifying} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('登录')}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div
            className="rounded-2xl p-3.5"
            style={{
              background: 'color-mix(in oklab, var(--accent) 10%, var(--card))',
              border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
            }}
          >
            <Button
              variant="ghost"
              className="h-11 w-full gap-2 rounded-full font-medium"
              onClick={guest}
              disabled={guesting}
              style={{ color: 'var(--foreground)' }}
            >
              {guesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              {t('游客体验模式（无需注册）')}
            </Button>
            <p className="mt-1 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {t('立即看到示例足迹，数据保存在本设备，可随时升级为正式账号')}
            </p>
          </div>
        </FadeIn>
      </main>
    </div>
  )
}
