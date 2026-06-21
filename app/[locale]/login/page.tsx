'use client'
import { useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { getRolePath } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'
import type { Role } from '@/types'
import Image from 'next/image'

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre gerekli'),
})
type FormData = z.infer<typeof schema>

const foodImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80',
  'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=600&q=80'
]

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations('auth')
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setLoginError(null)
    try {
      const res = await authApi.login(data.email, data.password)
      setAuth(res.accessToken, res.userId, res.fullName, res.role as Role)
      router.push(`/${locale}${getRolePath(res.role)}`)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        setLoginError('Giriş bilgileri hatalı. E-posta veya şifrenizi kontrol edin.')
      } else {
        setLoginError('Bağlantı hatası. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex bg-white overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1115] flex-col justify-center px-16 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
          <Image
            src="/logo.png"
            alt="Viamean Software"
            width={64}
            height={64}
            className="object-contain"
          />
          <span className="text-lg font-bold text-white tracking-tight">Viamean Software</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-bold text-white tracking-tight leading-tight">
            Viamean<br />Software
          </h1>
          <p className="mt-6 text-gray-400 text-lg max-w-md">
            Kurumsal yönetim ve kontrol paneline hoş geldiniz. Lütfen yetkili hesap bilgilerinizle giriş yapın.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-4">
        <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-3 p-3 z-0">
          {foodImages.map((src, i) => (
            <div key={i} className="relative w-full h-full rounded-xl overflow-hidden">
              <Image
                src={src}
                alt="Food background"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-10"></div>

        <div className="absolute top-6 right-8 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm">
          <a
            href="/tr/login"
            className={`text-sm tracking-wide transition-colors ${locale === 'tr' ? 'font-bold text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            TR
          </a>
          <span className="text-gray-300">/</span>
          <a
            href="/en/login"
            className={`text-sm tracking-wide transition-colors ${locale === 'en' ? 'font-bold text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            EN
          </a>
        </div>

        <div className="relative z-20 w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/logo.png"
              alt="Viamean Sipariş"
              width={64}
              height={64}
              className="object-contain brightness-0"
            />
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Viamean Sipariş</span>
          </div>

          <div className="w-full text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('welcomeBack')}</h2>
            <p className="text-gray-500 mt-3 text-sm px-4">
              Kurumsal yönetim ve kontrol paneline hoş geldiniz. Lütfen yetkili hesap bilgilerinizle giriş yapın.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
            <Input
              label={t('email')}
              type="email"
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('password')}
              type="password"
              placeholder={t('passwordPlaceholder')}
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {loginError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{loginError}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              className="h-12 text-base font-medium bg-[#0f1115] hover:bg-gray-800 text-white rounded-xl transition-all mt-2"
            >
              {t('loginButton')}
            </Button>
          </form>
        </div>

        <div className="absolute bottom-6 right-8 z-30">
          <p className="text-xs text-gray-600 font-medium bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-md shadow-sm">
            Copyright Viamean Software
          </p>
        </div>
      </div>
    </div>
  )
}