import { create } from 'zustand'
import Cookies from 'js-cookie'
import type { Role } from '@/types'

interface AdminSnapshot {
  token: string
  userId: number
  fullName: string
  role: Role
}

interface AuthState {
  token: string | null
  userId: number | null
  fullName: string | null
  role: Role | null
  isAuthenticated: boolean
  // impersonation
  originalAdmin: AdminSnapshot | null
  setAuth: (token: string, userId: number, fullName: string, role: Role) => void
  clearAuth: () => void
  initFromCookies: () => void
  impersonate: (token: string, userId: number, fullName: string, role: Role) => void
  returnToAdmin: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  fullName: null,
  role: null,
  isAuthenticated: false,
  originalAdmin: null,

  setAuth: (token, userId, fullName, role) => {
    Cookies.set('accessToken', token, { expires: 30, sameSite: 'strict' })
    Cookies.set('userRole', role, { expires: 30, sameSite: 'strict' })
    Cookies.set('userId', String(userId), { expires: 30, sameSite: 'strict' })
    Cookies.set('fullName', fullName, { expires: 30, sameSite: 'strict' })
    set({ token, userId, fullName, role, isAuthenticated: true })
  },

  clearAuth: () => {
    Cookies.remove('accessToken')
    Cookies.remove('userRole')
    Cookies.remove('userId')
    Cookies.remove('fullName')
    set({ token: null, userId: null, fullName: null, role: null, isAuthenticated: false, originalAdmin: null })
  },

  initFromCookies: () => {
    const token = Cookies.get('accessToken')
    const role = Cookies.get('userRole') as Role | undefined
    const userId = Cookies.get('userId')
    const fullName = Cookies.get('fullName')
    if (token && role && userId) {
      set({ token, role, userId: Number(userId), fullName: fullName || '', isAuthenticated: true })
    }
  },

  impersonate: (token, userId, fullName, role) => {
    const current = get()
    const snapshot: AdminSnapshot = {
      token: current.token!,
      userId: current.userId!,
      fullName: current.fullName!,
      role: current.role!,
    }
    Cookies.set('accessToken', token, { expires: 30, sameSite: 'strict' })
    Cookies.set('userRole', role, { expires: 30, sameSite: 'strict' })
    Cookies.set('userId', String(userId), { expires: 30, sameSite: 'strict' })
    Cookies.set('fullName', fullName, { expires: 30, sameSite: 'strict' })
    set({ token, userId, fullName, role, isAuthenticated: true, originalAdmin: snapshot })
  },

  returnToAdmin: () => {
    const { originalAdmin } = get()
    if (!originalAdmin) return
    Cookies.set('accessToken', originalAdmin.token, { expires: 30, sameSite: 'strict' })
    Cookies.set('userRole', originalAdmin.role, { expires: 30, sameSite: 'strict' })
    Cookies.set('userId', String(originalAdmin.userId), { expires: 30, sameSite: 'strict' })
    Cookies.set('fullName', originalAdmin.fullName, { expires: 30, sameSite: 'strict' })
    set({
      token: originalAdmin.token,
      userId: originalAdmin.userId,
      fullName: originalAdmin.fullName,
      role: originalAdmin.role,
      isAuthenticated: true,
      originalAdmin: null,
    })
  },
}))
