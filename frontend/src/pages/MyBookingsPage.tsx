import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking, StripeIntent } from "@/types/api"
import { useToast } from "@/components/Toast"
import { ConfirmModal, Modal } from "@/components/Modal"
import {
  BookOpen, Loader2, RefreshCw, XCircle, CreditCard,
  CheckCircle2, Info, FileText, Calendar, Users, BedDouble, Trash2
} from "lucide-react"

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

  // Payment Modal
  const [payBooking, setPayBooking] = useState<Booking | null>(null)
  const [payMethod, setPayMethod] = useState<"Card" | "bKash" | "Nagad" | "Rocket">("Card")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardName, setCardName] = useState("")
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [stripeIntent, setStripeIntent] = useState<StripeIntent | null>(null)
  const [senderPhone, setSenderPhone] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)

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

  const initiateBalancePayment = async (booking: Booking) => {
    try {
      setPayBooking(booking)
      setPaymentInvoiceId(null)
      setPayMethod("Card")
      setCardNumber("")
      setCardExpiry("")
      setCardCvc("")
      setCardName("")
      setSenderPhone("")
      setTransactionId("")

      const intentRes = await api.post("/payments/stripe/create-intent", {
        booking_id: booking.id,
      })
      setStripeIntent(intentRes.data)
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to initiate payment.")
      setPayBooking(null)
    }
  }

  const onCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payBooking || !stripeIntent) return

    if (payMethod === "Card") {
      if (cardNumber.replace(/\s/g, "").length < 16) { toastError("Valid 16-digit card number required."); return }
      if (cardExpiry.length < 5) { toastError("Enter expiry in MM/YY."); return }
      if (cardCvc.length < 3) { toastError("Valid CVC required."); return }
      if (!cardName.trim()) { toastError("Cardholder name required."); return }
    } else {
      if (!senderPhone.trim() || senderPhone.trim().length < 10) { toastError("Valid sender phone required."); return }
      if (!transactionId.trim()) { toastError("Transaction ID required."); return }
    }

    setPaymentProcessing(true)
    try {
      if (payMethod === "Card") {
        const res = await api.post("/payments/stripe/confirm", {
          booking_id: payBooking.id,
          payment_intent_id: stripeIntent.payment_intent_id,
        })
        setPaymentInvoiceId(res.data?.invoice_id || null)
      } else {
        const res = await api.post("/payments/mobile-banking", {
          booking_id: payBooking.id,
          amount: stripeIntent.amount,
          payment_method: payMethod,
          transaction_ref: transactionId.trim(),
          sender_phone: senderPhone.trim(),
        })
        setPaymentInvoiceId(res.data?.invoice_id || null)
      }
      toastSuccess("Balance paid successfully!")
      setPayBooking(null)
      setStripeIntent(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Payment failed.")
    } finally {
      setPaymentProcessing(false)
    }
  }

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 16)
    setCardNumber(value.replace(/(\d{4})(?=\d)/g, "$1 "))
  }

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 4)
    if (value.length > 2) value = value.substring(0, 2) + "/" + value.substring(2)
    setCardExpiry(value)
  }

  const openInvoice = (invId: string) => {
    const token = localStorage.getItem("accessToken")
    window.open(`${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/invoices/${invId}/html?token=${token}`, "_blank")
  }

  const getCardBrand = () => {
    const num = cardNumber.replace(/\s/g, "")
    if (num.startsWith("4")) return "Visa"
    if (num.startsWith("5")) return "Mastercard"
    if (num.startsWith("3")) return "Amex"
    return ""
  }

  const resortAccounts: Record<string, string> = {
    bKash: import.meta.env.VITE_BKASH_NUMBER || "01XXX-XXXXXX",
    Nagad: import.meta.env.VITE_NAGAD_NUMBER || "01XXX-XXXXXX",
    Rocket: import.meta.env.VITE_ROCKET_NUMBER || "01XXX-XXXXXX",
  }

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

      {paymentInvoiceId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-bold text-emerald-800">Payment successful!</p>
            <p className="text-xs text-emerald-600">Your invoice is ready.</p>
          </div>
          <button onClick={() => { openInvoice(paymentInvoiceId); setPaymentInvoiceId(null) }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors">
            <FileText className="h-4 w-4" /> Download Invoice
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" /></div>
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
                  {remaining > 0 && b.status === "Confirmed" && (
                    <button
                      onClick={() => initiateBalancePayment(b)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 px-4 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
                    >
                      <CreditCard className="h-4 w-4" /> Pay TK {remaining.toFixed(2)}
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

      {payBooking && (
        <Modal isOpen={!!payBooking} title="Pay Remaining Balance" onClose={() => setPayBooking(null)}>
          <form onSubmit={onCompletePayment} className="space-y-5">
            {stripeIntent?.is_mock && (
              <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800">
                <p className="font-bold flex items-center gap-1"><Info className="h-4 w-4" /> Demo Mode</p>
                <p>Use test card 4242 4242 4242 4242.</p>
              </div>
            )}
            <div className="rounded-lg bg-muted/40 p-4 border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="font-bold text-primary">TK {stripeIntent?.amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(["Card", "bKash", "Nagad", "Rocket"] as const).map((m) => (
                  <div key={m} onClick={() => setPayMethod(m)} className={`cursor-pointer rounded-lg border p-2.5 text-center transition-all ${payMethod === m ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/30"}`}>
                    <span className="text-xs font-bold">{m === "Card" ? "💳 Card" : `📱 ${m}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {payMethod === "Card" ? (
              <>
                <div className="relative h-40 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 p-5 text-white shadow-lg flex flex-col justify-between overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 font-bold text-[100px] font-serif">SE</div>
                  <div className="text-lg tracking-[0.15em] font-mono my-1">{cardNumber || "•••• •••• •••• ••••"}</div>
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <p className="text-[8px] tracking-wider uppercase opacity-60">Card Holder</p>
                      <p className="font-semibold">{cardName.toUpperCase() || "YOUR NAME"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] tracking-wider uppercase opacity-60">Expires</p>
                      <p className="font-semibold font-mono">{cardExpiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>
                <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Cardholder Name" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                <input type="text" value={cardNumber} onChange={handleCardNumber} placeholder="4242 4242 4242 4242" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={cardExpiry} onChange={handleExpiry} placeholder="MM/YY" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                  <input type="password" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").substring(0, 4))} placeholder="CVC" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-blue-50 border border-blue-200/50 p-4 text-xs text-blue-800">
                  <p className="font-bold">Pay via {payMethod}</p>
                  <p>Send TK {stripeIntent?.amount?.toFixed(2)} to {resortAccounts[payMethod]}</p>
                </div>
                <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Your number" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setPayBooking(null)} disabled={paymentProcessing} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={paymentProcessing} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {paymentProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Pay Now</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
