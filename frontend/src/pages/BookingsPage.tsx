import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking } from "@/types/api"
import { useToast } from "@/components/Toast"
import { ConfirmModal } from "@/components/Modal"
import {
  BookOpen, Loader2, RefreshCw, Search, ChevronDown, Trash2,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-blue-100 text-blue-800",
  CheckedIn: "bg-green-100 text-green-800",
  CheckedOut: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-800",
}

const STATUS_OPTIONS = ["Pending", "Confirmed", "CheckedIn", "CheckedOut", "Cancelled"]

export const BookingsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await api.get<Booking[]>("/bookings/")
      setBookings(res.data)
    } catch {
      toastError("Failed to load bookings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.guest.full_name.toLowerCase().includes(search.toLowerCase()) ||
      b.guest.email.toLowerCase().includes(search.toLowerCase()) ||
      b.room.room_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const updateStatus = async (booking: Booking, status: string) => {
    setUpdatingId(booking.id)
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status })
      toastSuccess(`Booking status updated to ${status}.`)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update status.")
    } finally {
      setUpdatingId(null)
    }
  }

  const onDeleteBooking = async () => {
    if (!deleteBooking) return
    try {
      await api.delete(`/bookings/${deleteBooking.id}`)
      toastSuccess("Booking deleted.")
      setDeleteBooking(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to delete booking.")
    }
  }

  const nightCount = (b: Booking) => {
    const ms = new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()
    return Math.ceil(ms / 86400000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Bookings Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{bookings.length} total bookings</p>
        </div>
        <button onClick={fetchBookings} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              filterStatus === s ? STATUS_COLORS[s] + " border-transparent" : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s}
            <span className="font-bold">{bookings.filter((b) => b.status === s).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest name, email, room..."
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Check In</th>
                  <th className="px-5 py-3">Check Out</th>
                  <th className="px-5 py-3">Nights</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{b.guest.full_name}</p>
                      <p className="text-xs text-muted-foreground">{b.guest.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{b.room.room_number}</p>
                      <p className="text-xs text-muted-foreground">{b.room.room_type.name}</p>
                    </td>
                    <td className="px-5 py-3.5">{b.check_in_date}</td>
                    <td className="px-5 py-3.5">{b.check_out_date}</td>
                    <td className="px-5 py-3.5">{nightCount(b)}</td>
                    <td className="px-5 py-3.5 font-semibold">${b.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {updatingId === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="relative">
                            <select
                              defaultValue=""
                              onChange={(e) => { if (e.target.value) updateStatus(b, e.target.value) }}
                              className="rounded-lg border bg-card py-1 pl-2 pr-7 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                            >
                              <option value="" disabled>Update status</option>
                              {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          onClick={() => setDeleteBooking(b)}
                          className="rounded-lg border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteBooking}
        title="Delete Booking"
        message={`Delete this booking for ${deleteBooking?.guest.full_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteBooking}
        onCancel={() => setDeleteBooking(null)}
        danger
      />
    </div>
  )
}
