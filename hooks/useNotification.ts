import { useEffect, useRef, useCallback } from 'react'

export function useNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio('/sounds/ding.mp3')
    audio.load()
    audioRef.current = audio

    // Tarayıcı autoplay policy: ilk kullanıcı etkileşiminde sesi unlock et
    const unlock = () => {
      if (unlockedRef.current) return
      audio.volume = 0
      audio.play()
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          audio.volume = 1
          unlockedRef.current = true
        })
        .catch(() => {})
    }
    document.addEventListener('click',      unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('keydown',    unlock, { once: true })

    // Bildirim izni iste
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      document.removeEventListener('click',      unlock)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('keydown',    unlock)
    }
  }, [])

  const notify = useCallback((title: string, body: string) => {
    // Ses çal
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }

    // Browser bildirimi
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: title,
      })
    }
  }, [])

  return { notify }
}
