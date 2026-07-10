import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking } from "@/types/api"
import { useToast } from "@/components/Toast"
import { ConfirmModal } from "@/components/Modal"
import { BookOpen, Loader2, RefreshCw, XCircle } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-blue-100 text-blue-800",
  CheckedIn: "bg-green-100 text-green-800",
  CheckedOut: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-800",
}

export const MyBookingsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await api.get<Booking[]>("/bookings/my")
      setBookings(res.data)
    } catch {
      toastError("Failed to load your bookings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const onCancelBooking = async () => {
    if (!cancelBooking) return
    try {
      await api.patch(`/bookings/${cancelBooking.id}/status`, { status: "Cancelled" })
      toastSuccess("Booking cancelled successfully.")
      setCancelBooking(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to cancel booking.")
    }
  }

  const nightCount = (b: Booking) => {
    const ms = new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()
    return Math.ceil(ms / 86400000)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-serif tracking-wide flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> My Bookings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage your resort reservations.</p>
        </div>
        <button onClick={fetchBookings} className="rounded-lg border bg-card p-2.5 hover:bg-secondary hover:text-secondary-foreground transition-all w-fit shadow-sm" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold text-foreground">No bookings found</h3>
          <p className="mt-1">You haven't made any reservations yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg">{b.room.room_type.name}</h3>
                  <p className="text-sm text-muted-foreground">Room {b.room.room_number} · Floor {b.room.floor}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}`}>
                  {b.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">{b.check_in_date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">{b.check_out_date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guests</p>
                  <p className="font-medium">{b.num_guests}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{nightCount(b)} Night(s)</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg text-primary">TK {b.total_amount.toFixed(2)}</p>
                </div>
                
                {b.status === "Pending" && (
                  <button
                    onClick={() => setCancelBooking(b)}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive text-destructive px-3 py-1.5 text-sm font-medium hover:bg-destructive/10 transition-colors"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!cancelBooking}
        title="Cancel Reservation"
        message={`Are you sure you want to cancel your reservation for ${cancelBooking?.room.room_type.name} (${cancelBooking?.check_in_date} to ${cancelBooking?.check_out_date})?`}
        confirmLabel="Yes, Cancel"
        onConfirm={onCancelBooking}
        onCancel={() => setCancelBooking(null)}
        danger
      />
    </div>
  )
}
