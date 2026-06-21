'use client'
import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '@/store/auth'

export type WsEventType =
  | 'NEW_ORDER'
  | 'ORDER_UPDATED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'REQUEST_NEW'
  | 'REQUEST_CLAIMED'
  | 'WAITER_CALLED'
  | 'BILL_REQUESTED'

export interface WsOrderEvent {
  type: WsEventType
  orderId: number
  restaurantId: number
  tableNumber: number
  status: string
  message: string
  timestamp: string
  requestId?: number
  requestType?: string
  claimedByName?: string
  expiresAt?: string
}

interface UseWebSocketOptions {
  restaurantId: number | null
  onEvent: (event: WsOrderEvent) => void
  enabled?: boolean
}

/**
 * Chef ve Waiter ekranları için WebSocket bağlantısı.
 * /topic/restaurant/{restaurantId}/orders topic'ine subscribe olur.
 * Bağlantı kesilince otomatik yeniden bağlanır.
 *
 * onEvent kasıtlı olarak dependency array'e alınmaz — her render'da yeni
 * referans gelmesi WebSocket'i sürekli kopar/bağlar ve SockJS polling'e
 * düşer. Bunun yerine ref ile güncel tutulur.
 */
export function useWebSocket({ restaurantId, onEvent, enabled = true }: UseWebSocketOptions) {
  const { token } = useAuthStore()

  // onEvent'i ref'te tut; bağlantıyı koparmadan güncel callback'i çağır
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!restaurantId || !enabled) return

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${process.env.NEXT_PUBLIC_API_URL || 'https://batnetjirgo.fun'}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(
          `/topic/restaurant/${restaurantId}/orders`,
          (message) => {
            try {
              const event: WsOrderEvent = JSON.parse(message.body)
              onEventRef.current(event)
            } catch (e) {
              console.error('WS mesaj parse hatası:', e)
            }
          }
        )
      },
      onStompError: (frame) => {
        console.error('STOMP hatası:', frame.headers?.message)
      },
      onWebSocketError: (event) => {
        console.error('WebSocket bağlantı hatası, yeniden denenecek:', event)
      },
      onDisconnect: () => {
        console.warn('WebSocket bağlantısı kesildi, yeniden bağlanılıyor...')
      },
    })

    client.activate()

    return () => {
      client.deactivate()
    }
  }, [restaurantId, enabled, token]) // onEvent kasıtlı olarak burada yok
}
