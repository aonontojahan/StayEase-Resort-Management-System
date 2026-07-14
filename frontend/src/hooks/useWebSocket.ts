import { useEffect, useRef, useCallback, useState } from "react"

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export function useWebSocket(room = "global") {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef<Map<string, Set<(msg: WebSocketMessage) => void>>>(new Map())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    const token = localStorage.getItem("accessToken")
    if (!token) return

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
    const wsUrl = apiUrl.replace("/api/v1", "").replace("http", "ws") + "/api/v1/ws"
    const fullUrl = `${wsUrl}?token=${token}&room=${room}`

    const ws = new WebSocket(fullUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true)
    }

    ws.onclose = () => {
      if (mountedRef.current) setConnected(false)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 5000)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data)
        const typeListeners = listenersRef.current.get(msg.type)
        if (typeListeners) {
          typeListeners.forEach((fn) => fn(msg))
        }
        const allListeners = listenersRef.current.get("*")
        if (allListeners) {
          allListeners.forEach((fn) => fn(msg))
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [room])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const onMessage = useCallback((type: string, fn: (msg: WebSocketMessage) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(fn)
    return () => {
      listenersRef.current.get(type)?.delete(fn)
    }
  }, [])

  return { connected, onMessage }
}
