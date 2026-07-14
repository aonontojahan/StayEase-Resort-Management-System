import React, { useState, useRef, useEffect, useCallback } from "react"
import { Bell, X, CheckCheck, BookOpen, CreditCard, Sparkles, AlertCircle, Info, Trash2, Loader2 } from "lucide-react"
import { api } from "@/services/api"
import { useAuth } from "@/store/AuthContext"
import { Booking, Payment, HousekeepingTask } from "@/types/api"
import { useWebSocket } from "@/hooks/useWebSocket"

// ─── Notification type ──────────────────────────────────────────────────────

export interface Notification {
  id: string
  type: "booking" | "payment" | "housekeeping" | "alert" | "system"
  title: string
  message: string
  time: Date
  read: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const iconForType = (type: Notification["type"]) => {
  switch (type) {
    case "booking":      return <BookOpen className="h-3.5 w-3.5" />
    case "payment":      return <CreditCard className="h-3.5 w-3.5" />
    case "housekeeping": return <Sparkles className="h-3.5 w-3.5" />
    case "alert":        return <AlertCircle className="h-3.5 w-3.5" />
    default:             return <Info className="h-3.5 w-3.5" />
  }
}

const colorForType = (type: Notification["type"]) => {
  switch (type) {
    case "booking":      return "bg-blue-500/10 text-blue-500"
    case "payment":      return "bg-emerald-500/10 text-emerald-500"
    case "housekeeping": return "bg-violet-500/10 text-violet-500"
    case "alert":        return "bg-amber-500/10 text-amber-500"
    default:             return "bg-slate-500/10 text-slate-500"
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

// Convert real API data into Notification objects
function bookingToNotification(b: Booking): Notification {
  const statusLabels: Record<string, string> = {
    Pending: "Pending Approval",
    Confirmed: "Confirmed",
    CheckedIn: "Checked In",
    CheckedOut: "Checked Out",
    Cancelled: "Cancelled",
  }
  const isAlert = b.status === "Pending"
  return {
    id: `booking-${b.id}`,
    type: isAlert ? "alert" : "booking",
    title: `Booking ${statusLabels[b.status] || b.status}`,
    message: `${b.guest.full_name} — Room ${b.booking_rooms.map(br => br.room.room_number).join(", ")} (${b.booking_rooms[0].check_in_date} → ${b.booking_rooms[0].check_out_date}). Total: TK ${b.total_amount.toFixed(0)}`,
    time: new Date(b.created_at),
    read: false,
  }
}

function paymentToNotification(p: Payment): Notification {
  return {
    id: `payment-${p.id}`,
    type: "payment",
    title: `Payment ${p.status}`,
    message: `TK ${p.amount.toFixed(0)} via ${p.payment_method}${p.transaction_ref ? ` · Ref: ${p.transaction_ref}` : ""}`,
    time: new Date(p.created_at),
    read: false,
  }
}

function taskToNotification(t: HousekeepingTask): Notification {
  const isHighPriority = t.priority === "High"
  return {
    id: `task-${t.id}`,
    type: "housekeeping",
    title: `${isHighPriority ? "🔴 High Priority: " : ""}${t.title}`,
    message: `Room ${t.room.room_number} · Status: ${t.status}${t.assigned_to ? ` · Assigned: ${t.assigned_to.full_name}` : " · Unassigned"}`,
    time: new Date(t.created_at),
    read: false,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface NotificationBellProps {
  className?: string
}

const POLL_INTERVAL_MS = 60_000 // refresh every 60 seconds
// We only show items created/updated within last 7 days as "notification-worthy"
const NOTIFICATION_WINDOW_DAYS = 7

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = "" }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track IDs that the user has dismissed (cleared) so they don't reappear on next poll
  const dismissedIdsRef = useRef<Set<string>>(new Set())
  // Track IDs that have been seen so only *new* ones are marked unread
  const seenIdsRef = useRef<Set<string>>(new Set())

  const { connected, onMessage } = useWebSocket("global")
  const unreadCount = notifications.filter((n) => !n.read).length
  const totalCount = notifications.length

  // Determine which APIs to call based on user role
  const canViewBookings    = user && ["Resort Owner", "Manager", "Accountant"].includes(user.role.name)
  const canViewPayments    = user && ["Resort Owner", "Manager", "Accountant"].includes(user.role.name)
  const canViewHousekeeping = user && ["Resort Owner", "Manager", "Housekeeping"].includes(user.role.name)
  const isGuest            = user?.role.name === "Guest"

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const cutoff = new Date(Date.now() - NOTIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const raw: Notification[] = []

    try {
      if (isGuest) {
        // Guests see their own bookings and payments
        const [bookRes, payRes] = await Promise.allSettled([
          api.get<Booking[]>("/bookings/my"),
          api.get<Payment[]>("/payments/my"),
        ])
        if (bookRes.status === "fulfilled") {
          bookRes.value.data
            .filter(b => new Date(b.created_at) >= cutoff)
            .forEach(b => raw.push(bookingToNotification(b)))
        }
        if (payRes.status === "fulfilled") {
          payRes.value.data
            .filter(p => new Date(p.created_at) >= cutoff)
            .forEach(p => raw.push(paymentToNotification(p)))
        }
      } else {
        const promises: Promise<any>[] = []
        if (canViewBookings)     promises.push(api.get<Booking[]>("/bookings/").catch(() => null))
        if (canViewPayments)     promises.push(api.get<Payment[]>("/payments/").catch(() => null))
        if (canViewHousekeeping) promises.push(api.get<HousekeepingTask[]>("/housekeeping/").catch(() => null))

        const results = await Promise.all(promises)
        let idx = 0

        if (canViewBookings && results[idx]) {
          const bookings: Booking[] = results[idx].data || []
          bookings
            .filter(b => new Date(b.created_at) >= cutoff && b.status !== "Cancelled")
            .slice(0, 10) // cap at 10 most recent
            .forEach(b => raw.push(bookingToNotification(b)))
          idx++
        }
        if (canViewPayments && results[idx]) {
          const payments: Payment[] = results[idx].data || []
          payments
            .filter(p => new Date(p.created_at) >= cutoff)
            .slice(0, 10)
            .forEach(p => raw.push(paymentToNotification(p)))
          idx++
        }
        if (canViewHousekeeping && results[idx]) {
          const tasks: HousekeepingTask[] = results[idx].data || []
          tasks
            .filter(t => new Date(t.created_at) >= cutoff && t.status !== "Done")
            .slice(0, 8)
            .forEach(t => raw.push(taskToNotification(t)))
          idx++
        }
      }
    } catch {
      // silently fail — no notifications shown on error
    }

    // Sort newest first
    raw.sort((a, b) => b.time.getTime() - a.time.getTime())

    // Filter out dismissed items
    const filtered = raw.filter(n => !dismissedIdsRef.current.has(n.id))

    // Mark as read if already seen, else mark unread (new item)
    const withReadState: Notification[] = filtered.map(n => ({
      ...n,
      read: seenIdsRef.current.has(n.id),
    }))

    // Register all current IDs as "seen" after this fetch
    filtered.forEach(n => seenIdsRef.current.add(n.id))

    setNotifications(withReadState)
    setLoading(false)
  }, [user, canViewBookings, canViewPayments, canViewHousekeeping, isGuest])

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchNotifications])

  // Real-time updates via WebSocket
  useEffect(() => {
    const unsubscribe = onMessage("booking_update", () => {
      fetchNotifications()
    })
    return unsubscribe
  }, [onMessage, fetchNotifications])

  // Close panel on outside click
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
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    notifications.forEach(n => dismissedIdsRef.current.add(n.id))
    setNotifications([])
  }

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    dismissedIdsRef.current.add(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* ── Bell Button ── */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/20 transition-all duration-200 hover:shadow-sm"
        aria-label="Notifications"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 shadow-md animate-notification-pop">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500/40 animate-ping" />
          </>
        )}
      </button>

      {/* ── Notification Panel ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border bg-card shadow-2xl z-50 overflow-hidden animate-slide-down-from-top">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Notifications</span>
              {totalCount > 0 && (
                <span className="rounded-full bg-primary/15 text-primary text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                  {totalCount}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount} new
                </span>
              )}
            </div>
            {/* Action buttons: Clear All + Mark all read */}
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  Read all
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-primary/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No new notifications in the last 7 days</p>
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
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}

                  {/* Type icon */}
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
                        className="shrink-0 h-4 w-4 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                        title="Dismiss"
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
          {!loading && notifications.length > 0 && (
            <div className="border-t px-4 py-2 bg-secondary/20 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                Showing last 7 days · Refreshes every 60s
              </p>
              <button
                onClick={fetchNotifications}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
