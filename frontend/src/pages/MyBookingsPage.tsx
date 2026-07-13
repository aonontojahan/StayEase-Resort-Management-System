import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Booking, StripeIntent } from "@/types/api"
import { useToast } from "@/components/Toast"
import { ConfirmModal, Modal } from "@/components/Modal"
import { 
  BookOpen, Loader2, RefreshCw, XCircle, CreditCard, 
  CheckCircle2, Info
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

  // Payment Modal States
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
    return Math.max(1, Math.ceil(ms / 86400000))
  }

  // Settle Remaining balance
  const initiateBalancePayment = async (booking: Booking) => {
    try {
      setPayBooking(booking)
      setPayMethod("Card")
      setCardNumber("")
      setCardExpiry("")
      setCardCvc("")
      setCardName("")
      setSenderPhone("")
      setTransactionId("")
      
      const intentRes = await api.post("/payments/stripe/create-intent", {
        booking_id: booking.id,
        amount_type: "full" // Settle the full remaining balance
      })
      setStripeIntent(intentRes.data)
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to initiate payment intent.")
      setPayBooking(null)
    }
  }

  const onCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payBooking || !stripeIntent) return

    if (cardNumber.replace(/\s/g, "").length < 16) {
      toastError("Please enter a valid 16-digit card number.")
      return
    }
    if (cardExpiry.length < 5) {
      toastError("Please enter expiry in MM/YY format.")
      return
    }
    if (cardCvc.length < 3) {
      toastError("Please enter a valid CVC.")
      return
    }
    if (!cardName.trim()) {
      toastError("Please enter cardholder name.")
      return
    }

    setPaymentProcessing(true)
    try {
      await api.post("/payments/stripe/confirm", {
        booking_id: payBooking.id,
        payment_intent_id: stripeIntent.payment_intent_id,
        amount_type: "full"
      })

      toastSuccess("Remaining balance paid and settled successfully!")
      setPayBooking(null)
      setStripeIntent(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Payment failed. Please try again.")
    } finally {
      setPaymentProcessing(false)
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 16)
    const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ")
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 4)
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2)
    }
    setCardExpiry(value)
  }

  const onMobileBankingPay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payBooking || !stripeIntent) return

    if (!senderPhone.trim() || senderPhone.trim().length < 10) {
      toastError("Please enter a valid sender phone number.")
      return
    }
    if (!transactionId.trim()) {
      toastError("Please enter the transaction ID from your payment.")
      return
    }

    setPaymentProcessing(true)
    try {
      await api.post("/payments/mobile-banking", {
        booking_id: payBooking.id,
        amount: stripeIntent.amount,
        payment_method: payMethod,
        transaction_ref: transactionId.trim(),
        sender_phone: senderPhone.trim(),
        amount_type: "full",
      })

      toastSuccess(`${payMethod} payment recorded! Balance settled successfully.`)
      setPayBooking(null)
      setStripeIntent(null)
      fetchBookings()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Payment failed. Please try again.")
    } finally {
      setPaymentProcessing(false)
    }
  }

  const resortAccounts: Record<string, string> = {
    bKash: import.meta.env.VITE_BKASH_NUMBER || "01XXX-XXXXXX",
    Nagad: import.meta.env.VITE_NAGAD_NUMBER || "01XXX-XXXXXX",
    Rocket: import.meta.env.VITE_ROCKET_NUMBER || "01XXX-XXXXXX",
  }

  const getCardBrand = () => {
    const cleanNum = cardNumber.replace(/\s/g, "")
    if (cleanNum.startsWith("4")) return "Visa"
    if (cleanNum.startsWith("5")) return "Mastercard"
    if (cleanNum.startsWith("3")) return "Amex"
    return "Unknown"
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
        <div className="grid gap-6 sm:grid-cols-2">
          {bookings.map((b) => {
            const remainingBalance = b.total_amount - b.paid_amount
            
            return (
              <div key={b.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground font-medium">Check-in</p>
                      <p className="font-semibold text-foreground mt-0.5">{b.check_in_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Check-out</p>
                      <p className="font-semibold text-foreground mt-0.5">{b.check_out_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Guests</p>
                      <p className="font-semibold text-foreground mt-0.5">{b.num_guests}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Duration</p>
                      <p className="font-semibold text-foreground mt-0.5">{nightCount(b)} Night(s)</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg bg-card border text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Amount:</span>
                      <span className="font-bold text-foreground">TK {b.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Paid Amount:</span>
                      <span className="font-bold text-emerald-600">TK {b.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 text-sm">
                      <span>Remaining Balance:</span>
                      <span className={remainingBalance > 0 ? "text-destructive" : "text-emerald-600"}>
                        TK {remainingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t mt-4 gap-2">
                  {b.status === "Pending" && (
                    <button
                      onClick={() => setCancelBooking(b)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive text-destructive px-3.5 py-2 text-sm font-semibold hover:bg-destructive/5 transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Booking
                    </button>
                  )}

                  {remainingBalance > 0 && (b.status === "Pending" || b.status === "Confirmed") && (
                    <button
                      onClick={() => initiateBalancePayment(b)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 px-4 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
                    >
                      <CreditCard className="h-4 w-4" /> Pay Balance
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
        message={`Are you sure you want to cancel your reservation for ${cancelBooking?.room.room_type.name} (${cancelBooking?.check_in_date} to ${cancelBooking?.check_out_date})?`}
        confirmLabel="Yes, Cancel"
        onConfirm={onCancelBooking}
        onCancel={() => setCancelBooking(null)}
        danger
      />

      {/* Online Settle Balance Modal */}
      {payBooking && (
        <Modal 
          isOpen={!!payBooking} 
          title="Settle Outstanding Balance" 
          onClose={() => setPayBooking(null)}
        >
          <form onSubmit={payMethod === "Card" ? onCompletePayment : onMobileBankingPay} className="space-y-5">
            {stripeIntent?.is_mock && (
              <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info className="h-4 w-4 text-amber-600" /> Stripe Sandbox Simulator Active
                </p>
                <p>System is running in development fallback. You can use any simulated card number (e.g. 4242 4242 4242 4242) to checkout.</p>
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-4 border text-sm space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reservation Room:</span>
                <span className="font-semibold">{payBooking.room.room_number} ({payBooking.room.room_type.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Total Bill:</span>
                <span className="font-semibold">TK {payBooking.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Already Paid:</span>
                <span className="font-semibold text-emerald-600">TK {payBooking.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-muted-foreground/20 pt-2 font-bold text-base">
                <span>Amount Due Now:</span>
                <span className="text-primary">TK {stripeIntent?.amount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(["Card", "bKash", "Nagad", "Rocket"] as const).map((m) => (
                  <div
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`cursor-pointer rounded-lg border p-2.5 text-center transition-all ${
                      payMethod === m
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-bold">{m === "Card" ? "💳 Card" : `📱 ${m}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {payMethod === "Card" ? (
              <>
                {/* Virtual Card Preview */}
                <div className="relative h-44 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 p-6 text-white shadow-lg flex flex-col justify-between overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 font-bold text-[120px] leading-none pointer-events-none font-serif">SE</div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[8px] tracking-widest uppercase opacity-75 font-mono">StayEase Resort Card</p>
                      <p className="text-xs font-semibold opacity-90 mt-0.5">Booking Guarantee</p>
                    </div>
                    <span className="font-bold italic text-base tracking-wider bg-white/10 px-2.5 py-0.5 rounded backdrop-blur-sm">
                      {getCardBrand() !== "Unknown" ? getCardBrand() : "Stripe"}
                    </span>
                  </div>
                  
                  <div className="text-xl tracking-[0.15em] font-mono my-2.5">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] tracking-wider uppercase opacity-60 font-mono">Card Holder</p>
                      <p className="text-sm font-semibold tracking-wide truncate max-w-[200px]">{cardName.toUpperCase() || "YOUR NAME"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] tracking-wider uppercase opacity-60 font-mono">Expires</p>
                      <p className="text-sm font-semibold font-mono">{cardExpiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>

                {/* Card Input fields */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Cardholder Name</label>
                    <input 
                      type="text" 
                      value={cardName} 
                      onChange={(e) => setCardName(e.target.value)} 
                      placeholder="e.g. Ummay Salik Rumya"
                      className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Card Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={cardNumber} 
                        onChange={handleCardNumberChange} 
                        placeholder="4242 4242 4242 4242"
                        className="block w-full rounded-lg border bg-card py-2 pl-3 pr-10 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Expiration Date</label>
                      <input 
                        type="text" 
                        value={cardExpiry} 
                        onChange={handleExpiryChange} 
                        placeholder="MM/YY"
                        className="block w-full rounded-lg border bg-card py-2 px-3 text-sm font-mono text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">CVC / CVV</label>
                      <input 
                        type="password" 
                        value={cardCvc} 
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").substring(0, 4))} 
                        placeholder="•••"
                        className="block w-full rounded-lg border bg-card py-2 px-3 text-sm font-mono text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mobile Banking Info */}
                <div className="rounded-lg bg-blue-50 border border-blue-200/50 p-4 text-xs text-blue-800 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-blue-600" /> 
                    Pay via {payMethod}
                  </p>
                  <p>Send <strong>TK {stripeIntent?.amount?.toFixed(2)}</strong> to the StayEase Resort {payMethod} number below, then enter your details.</p>
                  <div className="bg-white rounded border border-blue-100 p-2.5 text-center">
                    <span className="text-xs text-muted-foreground">Resort {payMethod} Number:</span>
                    <p className="text-base font-bold text-foreground tracking-wider mt-0.5">{resortAccounts[payMethod]}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Your {payMethod} Number (Sender)</label>
                    <input 
                      type="tel" 
                      value={senderPhone} 
                      onChange={(e) => setSenderPhone(e.target.value)} 
                      placeholder="e.g. 01XXXXXXXXX"
                      className="block w-full rounded-lg border bg-card py-2 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Transaction ID (TrxID)</label>
                    <input 
                      type="text" 
                      value={transactionId} 
                      onChange={(e) => setTransactionId(e.target.value)} 
                      placeholder="e.g. A7B8C9D0E1"
                      className="block w-full rounded-lg border bg-card py-2 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => setPayBooking(null)}
                disabled={paymentProcessing}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={paymentProcessing}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {payMethod === "Card" ? "Authorize Payment" : `Pay via ${payMethod}`}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
