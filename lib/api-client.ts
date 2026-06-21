import axios, { AxiosError } from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!))
  failedQueue = []
}

const clearAuthAndRedirect = () => {
  Cookies.remove('accessToken')
  Cookies.remove('userRole')
  Cookies.remove('userId')
  Cookies.remove('fullName')
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    const locale = window.location.pathname.split('/')[1] || 'tr'
    window.location.href = `/${locale}/login`
  }
}

// Request interceptor: token ekle
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: 401 → önce refresh dene, olmadı logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    const url = originalRequest?.url ?? ''
    const isLoginRequest   = url.includes('/api/auth/login')
    const isRefreshRequest = url.includes('/api/auth/refresh')
    const isPublicRequest  =
      url.includes('/api/menu/qr/') ||
      url.includes('/api/orders/table/') ||
      url.includes('/api/table/')

    // Login yanlış şifre → sadece reject, redirect yok
    if (error.response?.status === 401 && isLoginRequest) {
      return Promise.reject(error)
    }

    // Public menü/sipariş/masa endpoint'leri → login'e yönlendirme
    if (isPublicRequest) {
      return Promise.reject(error)
    }

    // Refresh isteği de 401 döndürdü → token tamamen geçersiz, çıkış yap
    if (error.response?.status === 401 && isRefreshRequest) {
      processQueue(error, null)
      clearAuthAndRedirect()
      return Promise.reject(error)
    }

    // Diğer 401'ler: önce token yenile, sonra isteği tekrar gönder
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Başka bir refresh zaten çalışıyorsa kuyruğa al
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const currentToken = Cookies.get('accessToken')
        const res = await axios.get(`${API_URL}/api/auth/refresh`, {
          headers: { Authorization: `Bearer ${currentToken}` },
          timeout: 10000,
        })
        const { accessToken, userId, fullName, role } = res.data as {
          accessToken: string; userId: number; fullName: string; role: string
        }

        Cookies.set('accessToken', accessToken, { expires: 30, sameSite: 'strict' })
        Cookies.set('userRole',    role,          { expires: 30, sameSite: 'strict' })
        Cookies.set('userId',      String(userId), { expires: 30, sameSite: 'strict' })
        Cookies.set('fullName',    fullName,       { expires: 30, sameSite: 'strict' })

        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
