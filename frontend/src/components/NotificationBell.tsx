import React, { useState, useRef, useEffect, useCallback } from "react"
import { Bell, X, CheckCheck, BookOpen, CreditCard, Sparkles, User, AlertCircle, Info } from "lucide-react"

export interface Notification {
  id: string
  type: "booking" | "payment" | "housekeeping" | "system" | "user" | "alert"
  title: string
  message: string
  time: Date
  read: boolean
}

// Simulated real-time notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "booking",
    title: "New Booking Confirmed",
    message: "Room 302 booked by Alex Johnson for 3 nights starting Jul 14.",
    time: new Date(Date.now() - 1000 * 60 * 2),
    read: false,
  },
  {
    id: "2",
    type: "payment",
    title: "Payment Received",
    message: "Payment of $450 received for Booking #BK-2024-009.",
    time: new Date(Date.now() - 1000 * 60 * 15),
    read: false,
  },
  {
    id: "3",
    type: "housekeeping",
    title: "Room Ready",
    message: "Room 215 has been cleaned and is now available.",
    time: new Date(Date.now() - 1000 * 60 * 32),
    read: true,
  },
  {
    id: "4",
    type: "alert",
    title: "Check-out Reminder",
    message: "Guest in Room 108 is scheduled to check out in 1 hour.",
    time: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
  },
  {
    id: "5",
    type: "system",
    title: "System Update",
    message: "StayEase has been updated with new features. Refresh to apply.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
  },
]

const iconForType = (type: Notification["type"]) => {
  switch (type) {
    case "booking": return <BookOpen className="h-3.5 w-3.5" />
    case "payment": return <CreditCard className="h-3.5 w-3.5" />
    case "housekeeping": return <Sparkles className="h-3.5 w-3.5" />
    case "user": return <User className="h-3.5 w-3.5" />
    case "alert": return <AlertCircle className="h-3.5 w-3.5" />
    default: return <Info className="h-3.5 w-3.5" />
  }
}

const colorForType = (type: Notification["type"]) => {
  switch (type) {
    case "booking": return "bg-blue-500/10 text-blue-500"
    case "payment": return "bg-emerald-500/10 text-emerald-500"
    case "housekeeping": return "bg-violet-500/10 text-violet-500"
    case "user": return "bg-indigo-500/10 text-indigo-500"
    case "alert": return "bg-amber-500/10 text-amber-500"
    default: return "bg-slate-500/10 text-slate-500"
  }
}

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface NotificationBellProps {
  className?: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = "" }) => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastNotifTimeRef = useRef<number>(Date.now())

  const unreadCount = notifications.filter((n) => !n.read).length

  // Simulate real-time incoming notifications every 30-90 seconds
  const scheduleNextNotification = useCallback(() => {
    const delay = 30000 + Math.random() * 60000 // 30s - 90s
    animationRef.current = window.setTimeout(() => {
      const newTypes: Notification["type"][] = ["booking", "payment", "housekeeping", "alert", "system"]
      const newMessages = [
        { type: "booking" as const, title: "New Booking Request", message: `Room ${Math.floor(Math.random() * 400 + 100)} has a new booking request.` },
        { type: "payment" as const, title: "Payment Pending", message: `A payment of $${(Math.random() * 500 + 100).toFixed(0)} is awaiting confirmation.` },
        { type: "housekeeping" as const, title: "Task Assigned", message: `Housekeeping task assigned for Room ${Math.floor(Math.random() * 400 + 100)}.` },
        { type: "alert" as const, title: "Check-in Alert", message: `Guest arriving in 30 minutes for Room ${Math.floor(Math.random() * 400 + 100)}.` },
      ]
      const random = newMessages[Math.floor(Math.random() * newMessages.length)]
      const notification: Notification = {
        id: Date.now().toString(),
        type: random.type,
        title: random.title,
        message: random.message,
        time: new Date(),
        read: false,
      }
      setNotifications((prev) => [notification, ...prev.slice(0, 19)])
      lastNotifTimeRef.current = Date.now()
      scheduleNextNotification()
    }, delay)
  }, [])

  useEffect(() => {
    scheduleNextNotification()
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current)
    }
  }, [scheduleNextNotification])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/20 transition-all duration-200 hover:shadow-sm"
        aria-label="Notifications"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 shadow-md animate-notification-pop">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {/* Pulse ring for new notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500/40 animate-ping" />
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border bg-card shadow-2xl z-50 overflow-hidden animate-slide-down-from-top">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-primary/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No new notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-secondary/40 relative ${
                    !notif.read ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}

                  {/* Icon */}
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorForType(notif.type)}`}>
                    {iconForType(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold leading-tight ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <button
                        onClick={(e) => dismiss(notif.id, e)}
                        className="shrink-0 h-4 w-4 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-1 font-medium">
                      {timeAgo(notif.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2.5 bg-secondary/20">
              <p className="text-center text-[10px] text-muted-foreground font-medium">
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
