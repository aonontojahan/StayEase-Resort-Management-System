import React, { useState, useEffect } from "react"
import { api } from "@/services/api"
import { Room, StripeIntent } from "@/types/api"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import {
  BedDouble, Loader2, Search, Calendar, Users,
  CreditCard, CheckCircle2, Info, Lock, FileText,
  ShoppingCart, Trash2, Plus, Minus, ChevronRight,
  MapPin, Wifi, Tv, Snowflake, Coffee, Waves,
  Dumbbell, Car, Shield
} from "lucide-react"

const ROOM_TYPE_IMAGES: Record<string, string> = {
  "Superior Room": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop",
  "Deluxe Room": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop",
  "Suite Room": "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop",
}

const getRoomImage = (room: Room): string => {
  if (room.room_type.image_urls && room.room_type.image_urls.length > 0) {
    return room.room_type.image_urls[0]
  }
  return ROOM_TYPE_IMAGES[room.room_type.name] || ROOM_TYPE_IMAGES["Superior Room"]
}

const amenityIcons: Record<string, React.ReactNode> = {
  "WiFi": <Wifi className="h-3.5 w-3.5" />,
  "AC": <Snowflake className="h-3.5 w-3.5" />,
  "TV": <Tv className="h-3.5 w-3.5" />,
  "Mini Bar": <Coffee className="h-3.5 w-3.5" />,
  "Room Service": <Coffee className="h-3.5 w-3.5" />,
  "Pool": <Waves className="h-3.5 w-3.5" />,
  "Gym": <Dumbbell className="h-3.5 w-3.5" />,
  "Parking": <Car className="h-3.5 w-3.5" />,
  "Sea View": <Waves className="h-3.5 w-3.5" />,
}

interface CartItem {
  room: Room
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  total: number
  specialRequests?: string
}

export const BrowseRoomsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [searchDates, setSearchDates] = useState<{ check_in: string; check_out: string } | null>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [specialRequestOpen, setSpecialRequestOpen] = useState<Record<string, boolean>>({})

  // Booking flow
  const [showCart, setShowCart] = useState(false)
  const [bookingStep, setBookingStep] = useState<"cart" | "payment" | "done">("cart")
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)

  // Payment
  const [payMethod, setPayMethod] = useState<"Card" | "bKash" | "Nagad" | "Rocket">("Card")
  const [cardLast4, setCardLast4] = useState("")
  const [cardName, setCardName] = useState("")
  const [senderPhone, setSenderPhone] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [stripeIntent, setStripeIntent] = useState<StripeIntent | null>(null)
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null)

  const loadInitialRooms = async () => {
    setLoading(true)
    try {
      const res = await api.get<Room[]>("/rooms")
      setRooms(res.data)
    } catch {
      toastError("Failed to load room listings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialRooms()
  }, [])

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkIn || !checkOut) {
      toastError("Please select check-in and check-out dates.")
      return
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toastError("Check-out must be after check-in.")
      return
    }
    setLoading(true)
    setSearched(true)
    const dates = { check_in: checkIn, check_out: checkOut }
    setSearchDates(dates)
    setCart([])
    try {
      const res = await api.get<Room[]>("/rooms/with-availability", {
        params: { check_in: checkIn, check_out: checkOut }
      })
      setRooms(res.data)
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to search rooms.")
    } finally {
      setLoading(false)
    }
  }

  const getNights = (ci: string, co: string) => {
    const diff = new Date(co).getTime() - new Date(ci).getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const addToCart = (room: Room) => {
    if (!searchDates) {
      toastError("Please search dates first.")
      return
    }
    if (!room.is_available) {
      toastError("This room is not available.")
      return
    }
    const existing = cart.find(item => item.room.id === room.id)
    if (existing) {
      toastError("This room is already in your cart.")
      return
    }
    const nights = getNights(searchDates.check_in, searchDates.check_out)
    const total = room.room_type.base_price_per_night * nights
    setCart(prev => [...prev, {
      room,
      checkIn: searchDates.check_in,
      checkOut: searchDates.check_out,
      nights,
      guests: 1,
      total,
    }])
    toastSuccess(`${room.room_type.name} added to cart!`)
  }

  const removeFromCart = (roomId: string) => {
    setCart(prev => prev.filter(item => item.room.id !== roomId))
  }

  const updateCartGuests = (roomId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.room.id !== roomId) return item
      const newGuests = Math.max(1, Math.min(item.room.room_type.max_occupancy, item.guests + delta))
      return {
        ...item,
        guests: newGuests,
        total: item.room.room_type.base_price_per_night * item.nights * newGuests,
      }
    }))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0)

  // Proceed to payment
  const proceedToPayment = async () => {
    if (cart.length === 0) {
      toastError("Your cart is empty.")
      return
    }
    setBookingStep("payment")
    setPaymentProcessing(true)
    try {
      const bookingData = {
        rooms: cart.map(item => ({
          room_id: item.room.id,
          check_in_date: item.checkIn,
          check_out_date: item.checkOut,
          num_guests: item.guests,
          special_requests: item.specialRequests || undefined,
        }))
      }
      const res = await api.post("/bookings/", bookingData)
      const booking = res.data
      setCreatedBookingId(booking.id)

      const intentRes = await api.post("/payments/stripe/create-intent", {
        booking_id: booking.id,
      })
      setStripeIntent(intentRes.data)
      setPayingBookingId(booking.id)
    } catch (err: any) {
      // Auto-cancel pending booking if payment fails
      if (createdBookingId) {
        try {
          await api.patch(`/bookings/${createdBookingId}/status`, { status: "Cancelled" })
        } catch { /* cleanup failure is non-critical */ }
      }
      toastError(err.response?.data?.detail || "Failed to create booking.")
      setBookingStep("cart")
      setCreatedBookingId(null)
    } finally {
      setPaymentProcessing(false)
    }
  }

  const onCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdBookingId || !stripeIntent) return

    if (payMethod === "Card") {
      if (cardLast4.replace(/\D/g, "").length !== 4) {
        toastError("Please enter the last 4 digits of your card.")
        return
      }
      if (!cardName.trim()) {
        toastError("Please enter cardholder name.")
        return
      }
    } else {
      if (!senderPhone.trim() || senderPhone.trim().length < 10) {
        toastError("Please enter a valid sender phone number.")
        return
      }
      if (!transactionId.trim()) {
        toastError("Please enter the transaction ID.")
        return
      }
    }

    setPaymentProcessing(true)
    try {
      if (payMethod === "Card") {
        const res = await api.post("/payments/stripe/confirm", {
          booking_id: createdBookingId,
          payment_intent_id: stripeIntent.payment_intent_id,
        })
        setInvoiceId(res.data?.invoice_id || null)
      } else {
        const res = await api.post("/payments/mobile-banking", {
          booking_id: createdBookingId,
          amount: stripeIntent.amount,
          payment_method: payMethod,
          transaction_ref: transactionId.trim(),
          sender_phone: senderPhone.trim(),
        })
        setInvoiceId(res.data?.invoice_id || null)
      }
      toastSuccess("Payment successful! Booking confirmed.")
      setBookingStep("done")
    } catch (err: any) {
      // Auto-cancel pending booking if payment fails
      if (createdBookingId) {
        try {
          await api.patch(`/bookings/${createdBookingId}/status`, { status: "Cancelled" })
        } catch { /* non-critical */ }
      }
      toastError(err.response?.data?.detail || "Payment failed.")
      setBookingStep("cart")
    } finally {
      setPaymentProcessing(false)
    }
  }

  const openInvoice = (invId: string) => {
    const token = localStorage.getItem("accessToken")
    window.open(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/invoices/${invId}/html?token=${token}`,
      "_blank"
    )
  }

  const closeCart = () => {
    setShowCart(false)
    setBookingStep("cart")
  }

  const doneAndRefresh = () => {
    setCart([])
    setCreatedBookingId(null)
    setInvoiceId(null)
    setBookingStep("cart")
    setShowCart(false)
    if (searchDates) {
      onSearch({ preventDefault: () => {} } as React.FormEvent)
    } else {
      loadInitialRooms()
    }
  }

  const CartPanel = () => (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-background border-l shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showCart ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Your Cart ({cart.length})
        </h3>
        <button onClick={closeCart} className="text-muted-foreground hover:text-foreground text-xl font-bold p-1">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-xs mt-1">Browse rooms and add them to your booking.</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={item.room.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm">{item.room.room_type.name}</p>
                  <p className="text-xs text-muted-foreground">Room {item.room.room_number} &middot; Floor {item.room.floor}</p>
                </div>
                <button onClick={() => removeFromCart(item.room.id)} className="text-destructive hover:bg-destructive/5 p-1 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span><Calendar className="h-3 w-3 inline mr-1" />{item.checkIn} &rarr; {item.checkOut}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <button
                    onClick={() => updateCartGuests(item.room.id, -1)}
                    disabled={item.guests <= 1}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-semibold text-foreground min-w-[1.5ch] text-center">{item.guests}</span>
                  <button
                    onClick={() => updateCartGuests(item.room.id, 1)}
                    disabled={item.guests >= item.room.room_type.max_occupancy}
                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span>guest(s)</span>
                </span>
              </div>
              <div className="text-right font-bold text-primary">TK {item.total.toFixed(2)}</div>
              {specialRequestOpen[item.room.id] ? (
                <div className="pt-1">
                  <textarea
                    value={item.specialRequests || ""}
                    onChange={e => {
                      const val = e.target.value.slice(0, 80)
                      setCart(prev => prev.map(ci =>
                        ci.room.id === item.room.id ? { ...ci, specialRequests: val } : ci
                      ))
                    }}
                    placeholder="Any special requests? (max 80 chars)"
                    className="block w-full rounded-lg border bg-muted/30 py-1.5 px-2.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
                    rows={2}
                    maxLength={80}
                  />
                  <button
                    onClick={() => setSpecialRequestOpen(prev => ({ ...prev, [item.room.id]: false }))}
                    className="text-xs text-muted-foreground hover:text-foreground mt-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSpecialRequestOpen(prev => ({ ...prev, [item.room.id]: true }))}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {item.specialRequests ? "Edit special request" : "Add special request"}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal ({cart.length} room{cart.length > 1 ? "s" : ""})</span>
            <span className="font-bold text-lg text-primary">TK {cartTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={proceedToPayment}
            disabled={paymentProcessing}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {paymentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Proceed to Payment
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-primary" /> Book Your Stay
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse our rooms, select multiple, and book them all at once.
          </p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="relative rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-all shadow-sm flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span>Cart</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Check In
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Check Out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-8 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>
        {searched && searchDates && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {searchDates.check_in} &rarr; {searchDates.check_out}
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{getNights(searchDates.check_in, searchDates.check_out)} night(s)</span>
          </div>
        )}
      </div>

      {/* Room Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {searched ? `${rooms.length} Room${rooms.length !== 1 ? "s" : ""} Available` : "Our Rooms & Suites"}
          </h3>
          {cart.length > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              {cart.length} in cart <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
            <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-foreground">No rooms match your search.</p>
            <p className="text-sm mt-1">Try different dates.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const avail = searched ? room.is_available : (room.status === "Available" || room.status === "Cleaning")
              const inCart = cart.some(item => item.room.id === room.id)

              return (
                <div key={room.id} className="rounded-xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group">
                  <div className="aspect-[4/3] bg-muted/50 relative overflow-hidden">
                    <img
                      src={getRoomImage(room)}
                      alt={room.room_type.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                        avail ? "bg-emerald-500 text-white" : "bg-destructive text-white"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full bg-white ${avail ? "animate-pulse" : ""}`} />
                        {avail ? "Available" : "Booked"}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="font-serif text-xl tracking-wide">{room.room_type.name}</p>
                      <p className="text-xs text-white/70 mt-0.5">
                        <MapPin className="h-3 w-3 inline mr-1" />Room {room.room_number} &middot; Floor {room.floor}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xl font-bold text-primary">
                        TK {room.room_type.base_price_per_night.toFixed(0)}
                        <span className="text-xs text-muted-foreground font-normal"> /night</span>
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        <Users className="h-3.5 w-3.5" /> Max {room.room_type.max_occupancy}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {room.room_type.description || "Experience comfort and luxury at StayEase Resort."}
                    </p>

                    {room.room_type.amenities && room.room_type.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {room.room_type.amenities.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-medium rounded-md border border-primary/10">
                            {amenityIcons[a] || null} {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto">
                      {searched && (
                        <p className="text-xs text-muted-foreground mb-2 text-center">
                          {getNights(searchDates!.check_in, searchDates!.check_out)} nights: <span className="font-bold text-foreground">TK {(room.room_type.base_price_per_night * getNights(searchDates!.check_in, searchDates!.check_out)).toFixed(2)}</span>
                        </p>
                      )}
                      {inCart ? (
                        <button
                          onClick={() => removeFromCart(room.id)}
                          className="w-full rounded-lg py-2.5 text-sm font-semibold border-2 border-primary text-primary bg-primary/5 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> In Cart
                        </button>
                      ) : (
                        <button
                          onClick={() => addToCart(room)}
                          disabled={!avail || !searched}
                          className={`w-full rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
                            avail && searched
                              ? "bg-primary text-primary-foreground hover:bg-primary/95"
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                          {searched ? (avail ? "Add to Cart" : "Unavailable") : "Search Dates First"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Side Panel */}
      <CartPanel />

      {/* Payment Modal */}
      <Modal
        isOpen={bookingStep === "payment"}
        title="Complete Your Booking"
        onClose={() => { setBookingStep("cart"); setStripeIntent(null) }}
      >
        <form onSubmit={onCompletePayment} className="space-y-5">
          {/* Order Summary */}
          <div className="rounded-xl bg-muted/30 p-4 border space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booking Summary</p>
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.room.room_type.name} &middot; {item.nights} night(s)</span>
                <span className="font-semibold">TK {item.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-bold text-base">
              <span>Total Due</span>
              <span className="text-primary">TK {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {stripeIntent?.is_mock && (
            <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800">
              <p className="font-bold flex items-center gap-1"><Info className="h-4 w-4" /> Demo Mode</p>
              <p className="mt-1">Demo mode - any card works</p>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {(["Card", "bKash", "Nagad", "Rocket"] as const).map((m) => (
                <div
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`cursor-pointer rounded-lg border p-2.5 text-center transition-all ${
                    payMethod === m ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <span className="text-xs font-bold">{m === "Card" ? "💳 Card" : `📱 ${m}`}</span>
                </div>
              ))}
            </div>
          </div>

          {payMethod === "Card" ? (
            <>
              <div className="relative h-40 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 p-5 text-white shadow-lg flex flex-col justify-between overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 font-bold text-[100px] font-serif">SE</div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] tracking-widest uppercase opacity-75 font-mono">StayEase Resort</p>
                    <p className="text-xs font-semibold opacity-90 mt-0.5">Booking Payment</p>
                  </div>
                  <span className="font-bold italic text-xs bg-white/10 px-2.5 py-0.5 rounded">Card</span>
                </div>
                <div className="text-lg tracking-[0.15em] font-mono my-1">•••• •••• •••• {cardLast4 || "••••"}</div>
                <div className="flex justify-between items-end text-xs">
                  <div>
                    <p className="text-[8px] tracking-wider uppercase opacity-60 font-mono">Card Holder</p>
                    <p className="font-semibold tracking-wide">{cardName.toUpperCase() || "YOUR NAME"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] tracking-wider uppercase opacity-60 font-mono">Demo</p>
                    <p className="font-semibold font-mono">Test Mode</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Cardholder Name" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                <input type="text" value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").substring(0, 4))} placeholder="Last 4 digits" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono text-center focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200/50 p-4 text-xs text-blue-800 space-y-2">
                <p className="font-bold">Pay via {payMethod}</p>
                <p>Send <strong>TK {cartTotal.toFixed(2)}</strong> to StayEase Resort {payMethod} number below.</p>
                <div className="bg-white rounded border border-blue-100 p-2.5 text-center">
                  <span className="text-xs text-muted-foreground">Resort {payMethod} Number:</span>
                  <p className="text-base font-bold text-foreground tracking-wider mt-0.5">
                    {import.meta.env[`VITE_${payMethod.toUpperCase()}_NUMBER`] || "01XXX-XXXXXX"}
                  </p>
                </div>
              </div>
              <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Your {payMethod} number (sender)" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID (TrxID)" className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" required />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setBookingStep("cart"); setStripeIntent(null) }} disabled={paymentProcessing} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">Back</button>
            <button type="submit" disabled={paymentProcessing} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
              {paymentProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Lock className="h-4 w-4" /> Pay TK {cartTotal.toFixed(2)}</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={bookingStep === "done"}
        title="Booking Confirmed!"
        onClose={doneAndRefresh}
      >
        <div className="space-y-5 text-center py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Thank You!</h3>
            <p className="text-sm text-muted-foreground mt-1">Your booking is confirmed. Full payment received.</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-4 border text-sm text-left space-y-2">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{item.room.room_type.name}:</span>
                <span className="font-semibold">{item.checkIn} &rarr; {item.checkOut}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-bold text-base">
              <span>Total Paid:</span>
              <span className="text-primary">TK {cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            {invoiceId && (
              <button onClick={() => openInvoice(invoiceId)} className="flex items-center gap-2 rounded-lg border border-primary px-5 py-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors">
                <FileText className="h-4 w-4" /> Download Invoice
              </button>
            )}
          </div>
          <button onClick={doneAndRefresh} className="rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
            Done
          </button>
        </div>
      </Modal>
    </div>
  )
}
