'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

export function AuthInit() {
  const { initFromCookies } = useAuthStore()
  useEffect(() => { initFromCookies() }, [initFromCookies])
  return null
}
