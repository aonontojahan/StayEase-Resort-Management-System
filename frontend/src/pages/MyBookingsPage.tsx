import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking, Refund } from "@/types/api"
import { useToast } from "@/components/Toast"
import { ConfirmModal, Modal } from "@/components/Modal"
import {
  BookOpen, Loader2, RefreshCw, XCircle, RotateCcw,
  Calendar, Users, BedDouble, Trash2
} from "lucide-react"
import { TableSkeleton } from "@/components/Skeleton"

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Confirmed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  CheckedIn: "bg-blue-100 text-blue-800 border border-blue-200",
  CheckedOut: "bg-gray-100 text-gray-700 border border-gray-200",
  Cancelled: "bg-red-100 text-red-800 border border-red-200",
}

export const MyBookingsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null)
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null)

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
      toastSuccess("Booking cancelled. 30% refund has been processed.")
      setCancelBooking(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to cancel booking.")
    }
  }

  const onDeleteBooking = async () => {
    if (!deleteBooking) return
    try {
      await api.delete(`/bookings/${deleteBooking.id}`)
      toastSuccess("Booking deleted successfully.")
      setDeleteBooking(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to delete booking.")
    }
  }

  const getRemaining = (b: Booking) => b.total_amount - b.paid_amount

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-serif tracking-wide flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> My Bookings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage your reservations.</p>
        </div>
        <button onClick={fetchBookings} className="rounded-lg border bg-card p-2.5 hover:bg-secondary transition-all w-fit shadow-sm" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={1} />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold text-foreground">No bookings found</h3>
          <p className="mt-1">Browse rooms and book your stay.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {bookings.map((b) => {
            const remaining = getRemaining(b)
            const roomNames = b.booking_rooms.map(br => br.room.room_type.name).join(", ")
            const roomNumbers = b.booking_rooms.map(br => br.room.room_number).join(", ")

            return (
              <div key={b.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{roomNames}</h3>
                      <p className="text-sm text-muted-foreground">Rooms: {roomNumbers}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}`}>
                      {b.status}
                    </span>
                  </div>
                  {b.status === "Cancelled" && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <RotateCcw className="h-3 w-3" />
                        Refund: TK {(b.total_amount * 0.70).toFixed(2)} (70%) — 30% fee retained
                      </div>
                    </div>
                  )}

                  {/* Room Details */}
                  <div className="space-y-2">
                    {b.booking_rooms.map((br) => (
                      <div key={br.id} className="bg-muted/20 rounded-lg p-3 border text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{br.room.room_type.name} (Room {br.room.room_number})</span>
                          <span className={STATUS_COLORS[br.status]?.split(" ")[0] || ""}>{br.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span><Calendar className="h-3 w-3 inline mr-1" />{br.check_in_date} &rarr; {br.check_out_date}</span>
                          <span><Users className="h-3 w-3 inline mr-1" />{br.num_guests}</span>
                        </div>
                        <div className="text-right font-semibold text-primary">TK {br.total_amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg bg-card border text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total:</span>
                      <span className="font-bold text-foreground">TK {b.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Paid:</span>
                      <span className="font-bold text-emerald-600">TK {b.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 text-sm">
                      <span>Balance:</span>
                      <span className={remaining > 0 ? "text-destructive" : "text-emerald-600"}>TK {remaining.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t mt-4 gap-2">
                  {(b.status === "Pending" || b.status === "Confirmed") && (
                    <button
                      onClick={() => setCancelBooking(b)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive text-destructive px-3.5 py-2 text-sm font-semibold hover:bg-destructive/5 transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                  )}
                  {b.status === "Cancelled" && (
                    <button
                      onClick={() => setDeleteBooking(b)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-muted-foreground/30 text-muted-foreground px-3.5 py-2 text-sm font-semibold hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!cancelBooking}
        title="Cancel Reservation"
        message={
          cancelBooking
            ? `Cancel this booking? Refund policy: 30% of total paid amount will be refunded.`
            : ""
        }
        confirmLabel="Yes, Cancel"
        onConfirm={onCancelBooking}
        onCancel={() => setCancelBooking(null)}
        danger
      />

      <ConfirmModal
        isOpen={!!deleteBooking}
        title="Delete Booking"
        message={
          deleteBooking
            ? `Delete this cancelled booking for ${deleteBooking.booking_rooms.map(br => br.room.room_type.name).join(", ")}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={onDeleteBooking}
        onCancel={() => setDeleteBooking(null)}
        danger
      />

    </div>
  )
}
