import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking, Room } from "@/types/api"

interface GuestSearchResult {
  id: string
  full_name: string
  email: string
  phone_number: string | null
}
import { Pagination } from "@/components/Pagination"
import { TableSkeleton } from "@/components/Skeleton"
import { useToast } from "@/components/Toast"
import { ConfirmModal, Modal } from "@/components/Modal"
import {
  BookOpen, Loader2, RefreshCw, Search, ChevronDown, Trash2, CreditCard, CheckCircle2, UserPlus, Calendar, Users,
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

  const [payBooking, setPayBooking] = useState<Booking | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState("Cash")
  const [payRef, setPayRef] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payLoading, setPayLoading] = useState(false)

  // Walk-in booking state
  const [showWalkin, setShowWalkin] = useState(false)
  const [walkinRooms, setWalkinRooms] = useState<Room[]>([])
  const [walkinGuestSearch, setWalkinGuestSearch] = useState("")
  const [walkinGuests, setWalkinGuests] = useState<GuestSearchResult[]>([])
  const [walkinSelectedGuest, setWalkinSelectedGuest] = useState<GuestSearchResult | null>(null)
  const [walkinGuestName, setWalkinGuestName] = useState("")
  const [walkinGuestPhone, setWalkinGuestPhone] = useState("")
  const [walkinGuestEmail, setWalkinGuestEmail] = useState("")
  const [walkinCheckIn, setWalkinCheckIn] = useState("")
  const [walkinCheckOut, setWalkinCheckOut] = useState("")
  const [walkinRoomId, setWalkinRoomId] = useState("")
  const [walkinGuestsCount, setWalkinGuestsCount] = useState(1)
  const [walkinSubmitting, setWalkinSubmitting] = useState(false)
  const [walkinCreateNew, setWalkinCreateNew] = useState(false)

  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const fetchBookings = async (currentPage = page) => {
    setLoading(true)
    const skip = (currentPage - 1) * itemsPerPage
    try {
      const res = await api.get<Booking[]>("/bookings/", { params: { skip, limit: itemsPerPage } })
      setBookings(res.data)
      setTotalItems(parseInt(res.headers["x-total-count"] || "0", 10))
    } catch {
      toastError("Failed to load bookings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings(1)
  }, [])

  const filtered = bookings.filter((b) => {
    const roomNumbers = b.booking_rooms.map(br => br.room.room_number).join(", ")
    const matchSearch =
      !search ||
      b.guest.full_name.toLowerCase().includes(search.toLowerCase()) ||
      b.guest.email.toLowerCase().includes(search.toLowerCase()) ||
      roomNumbers.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const updateStatus = async (booking: Booking, status: string, e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (status === "CheckedIn" && booking.total_amount - booking.paid_amount > 0.01) {
      openPayModal(booking)
      if (e) e.target.value = ""
      return
    }
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

  const openPayModal = (booking: Booking) => {
    setPayBooking(booking)
    setPayAmount(booking.total_amount - booking.paid_amount)
    setPayMethod("Cash")
    setPayRef("")
    setPayNotes("Check-in payment")
  }

  const onRecordPayment = async () => {
    if (!payBooking) return
    if (payAmount <= 0) {
      toastError("Amount must be greater than zero.")
      return
    }
    setPayLoading(true)
    try {
      await api.post("/payments/", {
        booking_id: payBooking.id,
        amount: payAmount,
        payment_method: payMethod,
        transaction_ref: payRef || undefined,
        notes: payNotes || undefined,
      })
      await api.patch(`/bookings/${payBooking.id}/status`, { status: "CheckedIn" })
      toastSuccess(`Payment of TK ${payAmount.toFixed(2)} recorded. Guest checked in.`)
      setPayBooking(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to process payment.")
    } finally {
      setPayLoading(false)
    }
  }

  const openWalkinModal = async () => {
    setShowWalkin(true)
    setWalkinSelectedGuest(null)
    setWalkinGuestSearch("")
    setWalkinGuests([])
    setWalkinGuestName("")
    setWalkinGuestPhone("")
    setWalkinGuestEmail("")
    setWalkinCheckIn("")
    setWalkinCheckOut("")
    setWalkinRoomId("")
    setWalkinGuestsCount(1)
    setWalkinCreateNew(false)

    try {
      const res = await api.get<Room[]>("/rooms")
      setWalkinRooms(res.data.filter((r) => r.status === "Available" || r.status === "Cleaning"))
    } catch {
      toastError("Failed to load available rooms for walk-in.")
    }
  }

  const searchWalkinGuests = async (q: string) => {
    setWalkinGuestSearch(q)
    if (q.trim().length < 1) {
      setWalkinGuests([])
      return
    }
    try {
      const res = await api.get<GuestSearchResult[]>("/bookings/guests", { params: { search: q } })
      setWalkinGuests(res.data)
    } catch {
      toastError("Guest search failed.")
      setWalkinGuests([])
    }
  }

  const onSubmitWalkin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!walkinRoomId) { toastError("Please select a room."); return }
    if (!walkinCheckIn || !walkinCheckOut) { toastError("Please select check-in and check-out dates."); return }
    if (walkinCheckOut <= walkinCheckIn) { toastError("Check-out must be after check-in."); return }

    setWalkinSubmitting(true)
    try {
      let guestId: string | undefined

      if (walkinCreateNew) {
        if (!walkinGuestName.trim() || !walkinGuestEmail.trim()) {
          toastError("Guest name and email are required for new guests.")
          setWalkinSubmitting(false)
          return
        }
        const createRes = await api.post("/auth/users", {
          full_name: walkinGuestName.trim(),
          email: walkinGuestEmail.trim(),
          phone_number: walkinGuestPhone.trim() || undefined,
          password: import.meta.env.VITE_DEFAULT_GUEST_PASSWORD || "Welcome123!",
          role_name: "Guest",
        })
        guestId = createRes.data.id
      } else if (walkinSelectedGuest) {
        guestId = walkinSelectedGuest.id
      } else {
        toastError("Please select or create a guest.")
        setWalkinSubmitting(false)
        return
      }

      await api.post("/bookings/", {
        rooms: [{
          room_id: walkinRoomId,
          check_in_date: walkinCheckIn,
          check_out_date: walkinCheckOut,
          num_guests: walkinGuestsCount,
        }],
        guest_id: guestId,
      })

      toastSuccess("Walk-in booking created successfully.")
      setShowWalkin(false)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to create walk-in booking.")
    } finally {
      setWalkinSubmitting(false)
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

  const onPageChange = (newPage: number) => {
    setPage(newPage)
    fetchBookings(newPage)
  }

  const nightCount = (b: Booking) => {
    if (b.booking_rooms.length === 0) return 0
    const br = b.booking_rooms[0]
    const ms = new Date(br.check_out_date).getTime() - new Date(br.check_in_date).getTime()
    return Math.max(1, Math.ceil(ms / 86400000))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Bookings Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{totalItems} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openWalkinModal} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
            <UserPlus className="h-4 w-4" /> Walk-in Booking
          </button>
          <button onClick={fetchBookings} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(filterStatus === s ? "" : s); setPage(1); fetchBookings(1) }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              filterStatus === s ? STATUS_COLORS[s] + " border-transparent" : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s}
            <span className="font-bold">{bookings.filter((b) => b.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); fetchBookings(1) }}
            placeholder="Search guest name, email, room..."
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
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
                {filtered.map((b) => {
                  const due = b.total_amount - b.paid_amount
                  return (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{b.guest.full_name}</p>
                        <p className="text-xs text-muted-foreground">{b.guest.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {b.booking_rooms.map((br, i) => (
                          <p key={i} className="font-semibold">{br.room.room_number} <span className="text-xs text-muted-foreground font-normal">({br.room.room_type.name})</span></p>
                        ))}
                      </td>
                      <td className="px-5 py-3.5">{b.booking_rooms[0]?.check_in_date || "-"}</td>
                      <td className="px-5 py-3.5">{b.booking_rooms[0]?.check_out_date || "-"}</td>
                      <td className="px-5 py-3.5">{nightCount(b)}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">TK {b.total_amount.toFixed(2)}</p>
                        <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                          <p>Paid: <span className="text-emerald-600 font-medium">TK {b.paid_amount.toFixed(2)}</span></p>
                          {due > 0.01 ? (
                            <p>Due: <span className="text-destructive font-medium">TK {due.toFixed(2)}</span></p>
                          ) : (
                            <p className="text-emerald-600 font-semibold uppercase text-[8px] tracking-wide">Paid</p>
                          )}
                        </div>
                      </td>
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
                                onChange={(e) => { if (e.target.value) updateStatus(b, e.target.value, e) }}
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
                          {due > 0.01 && b.status !== "Cancelled" && b.status !== "CheckedOut" && (
                            <button
                              onClick={() => openPayModal(b)}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Record payment"
                            >
                              <CreditCard className="h-3 w-3" /> Pay
                            </button>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalItems > itemsPerPage && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={onPageChange}
          />
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

      <Modal isOpen={showWalkin} title="Walk-in Booking" onClose={() => setShowWalkin(false)}>
        <form onSubmit={onSubmitWalkin} className="space-y-4">
          {/* Guest Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Guest</label>
            {!walkinCreateNew && !walkinSelectedGuest && (
              <div className="space-y-1.5">
                <input
                  value={walkinGuestSearch}
                  onChange={(e) => searchWalkinGuests(e.target.value)}
                  placeholder="Search existing guest by name, email or phone..."
                  className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {walkinGuests.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                    {walkinGuests.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => { setWalkinSelectedGuest(g); setWalkinGuestSearch(""); setWalkinGuests([]) }}
                        className="px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer"
                      >
                        <span className="font-medium">{g.full_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{g.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-center">
                  <button type="button" onClick={() => setWalkinCreateNew(true)} className="text-primary hover:underline font-medium">
                    + New guest (walk-in)
                  </button>
                </p>
              </div>
            )}
            {walkinSelectedGuest && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
                <div>
                  <span className="font-semibold text-sm">{walkinSelectedGuest.full_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{walkinSelectedGuest.email}</span>
                </div>
                <button type="button" onClick={() => setWalkinSelectedGuest(null)} className="text-xs text-destructive hover:underline">Change</button>
              </div>
            )}
            {walkinCreateNew && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Full Name *</label>
                    <input value={walkinGuestName} onChange={(e) => setWalkinGuestName(e.target.value)} className="block w-full rounded-lg border bg-card py-1.5 px-2.5 text-sm" placeholder="Guest name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Phone</label>
                    <input value={walkinGuestPhone} onChange={(e) => setWalkinGuestPhone(e.target.value)} className="block w-full rounded-lg border bg-card py-1.5 px-2.5 text-sm" placeholder="01XXXXXXXXX" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">Email *</label>
                  <input value={walkinGuestEmail} onChange={(e) => setWalkinGuestEmail(e.target.value)} type="email" className="block w-full rounded-lg border bg-card py-1.5 px-2.5 text-sm" placeholder="guest@example.com" />
                </div>
                <button type="button" onClick={() => { setWalkinCreateNew(false); setWalkinGuestName(""); setWalkinGuestPhone(""); setWalkinGuestEmail("") }} className="text-xs text-destructive hover:underline">Cancel</button>
              </div>
            )}
          </div>

          {/* Room */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Room</label>
            <select value={walkinRoomId} onChange={(e) => setWalkinRoomId(e.target.value)} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm">
              <option value="">-- Select available room --</option>
              {walkinRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.room_number} - {r.room_type.name} (TK {r.room_type.base_price_per_night}/night)</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Check In</label>
              <input type="date" value={walkinCheckIn} onChange={(e) => setWalkinCheckIn(e.target.value)} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Check Out</label>
              <input type="date" value={walkinCheckOut} onChange={(e) => setWalkinCheckOut(e.target.value)} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm" />
            </div>
          </div>

          {/* Guests count */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Number of Guests</label>
            <input type="number" min={1} value={walkinGuestsCount} onChange={(e) => setWalkinGuestsCount(parseInt(e.target.value) || 1)} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowWalkin(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={walkinSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {walkinSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><CheckCircle2 className="h-4 w-4" /> Create Booking</>}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!payBooking} title="Record Payment & Check In" onClose={() => setPayBooking(null)}>
        {payBooking && (
          <div className="space-y-5">
            <div className="rounded-lg bg-muted/30 p-4 border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guest:</span>
                <span className="font-semibold">{payBooking.guest.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rooms:</span>
                <span className="font-semibold">{payBooking.booking_rooms.map(br => br.room.room_number).join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">TK {payBooking.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="font-semibold text-emerald-600">TK {payBooking.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2 font-bold text-base">
                <span>Due Now:</span>
                <span className="text-primary">TK {(payBooking.total_amount - payBooking.paid_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Amount (TK)</label>
              <input
                type="number" step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option>Cash</option>
                <option>Card</option>
                <option>BankTransfer</option>
                <option>bKash</option>
                <option>Nagad</option>
                <option>Rocket</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Reference (Optional)</label>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. TXN-12345"
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
              <input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Check-in payment"
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                onClick={() => setPayBooking(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onRecordPayment}
                disabled={payLoading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {payLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Record Payment & Check In</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
