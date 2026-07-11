import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { Room, BookingCreate } from "@/types/api"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import { 
  BedDouble, Loader2, Search, Calendar, Users, 
  CreditCard, CheckCircle2, Info, Lock
} from "lucide-react"

const searchSchema = z.object({
  check_in: z.string().min(1, "Required"),
  check_out: z.string().min(1, "Required"),
})

const bookingSchema = z.object({
  room_id: z.string().min(1),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  num_guests: z.coerce.number().min(1).default(1),
  special_requests: z.string().optional(),
})

export const BrowseRoomsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // Dates searched
  const [searchDates, setSearchDates] = useState<{ check_in: string; check_out: string } | null>(null)

  // Booking details modal
  const [bookRoom, setBookRoom] = useState<Room | null>(null)
  
  // Payment step state
  const [paymentStep, setPaymentStep] = useState(false)
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">("deposit")
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  
  // Card input states
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardName, setCardName] = useState("")
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [stripeIntent, setStripeIntent] = useState<any>(null)

  const searchForm = useForm<{ check_in: string, check_out: string }>({ 
    resolver: zodResolver(searchSchema) 
  })
  
  const bookForm = useForm<BookingCreate>({ resolver: zodResolver(bookingSchema) })

  // Load initial rooms
  const loadInitialRooms = async () => {
    setLoading(true)
    try {
      const res = await api.get<Room[]>("/rooms")
      setRooms(res.data)
    } catch (err: any) {
      toastError("Failed to load room listings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialRooms()
  }, [])

  const onSearch = async (data: { check_in: string, check_out: string }) => {
    setLoading(true)
    setSearched(true)
    setSearchDates(data)
    try {
      const res = await api.get<Room[]>("/rooms/with-availability", {
          params: { check_in: data.check_in, check_out: data.check_out }
      })
      setRooms(res.data)
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to search rooms.")
    } finally {
      setLoading(false)
    }
  }

  const openBookModal = (room: Room) => {
    if (!searchDates) {
      toastError("Please select check-in and check-out dates first.")
      return
    }
    setBookRoom(room)
    setPaymentStep(false)
    setCreatedBookingId(null)
    setStripeIntent(null)
    setCardNumber("")
    setCardExpiry("")
    setCardCvc("")
    setCardName("")
    
    bookForm.reset({
      room_id: room.id,
      check_in_date: searchDates.check_in,
      check_out_date: searchDates.check_out,
      num_guests: 1,
      special_requests: ""
    })
  }

  // Helper: Number of nights
  const getNights = () => {
    if (!searchDates) return 0
    const checkIn = new Date(searchDates.check_in)
    const checkOut = new Date(searchDates.check_out)
    const diff = checkOut.getTime() - checkIn.getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getPriceBreakdown = (room: Room) => {
    const nights = getNights()
    const total = room.room_type.base_price_per_night * nights
    const deposit = total * 0.3
    return { nights, total, deposit }
  }

  // Booking step 1: Create pending booking
  const onProceedToPayment = async (data: BookingCreate) => {
    try {
      // Create a pending booking first
      const res = await api.post("/bookings/", data)
      const booking = res.data
      setCreatedBookingId(booking.id)
      
      // Request Stripe Payment Intent
      const intentRes = await api.post("/payments/stripe/create-intent", {
        booking_id: booking.id,
        amount_type: paymentOption
      })
      setStripeIntent(intentRes.data)
      setPaymentStep(true)
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to initiate booking.")
    }
  }

  // Booking step 2: Pay and confirm
  const onCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdBookingId || !stripeIntent) return
    
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
      // Settle payment on backend (if mock, confirms directly; if real, retrieves from Stripe and verifies)
      await api.post("/payments/stripe/confirm", {
        booking_id: createdBookingId,
        payment_intent_id: stripeIntent.payment_intent_id,
        amount_type: paymentOption
      })
      
      toastSuccess(
        paymentOption === "deposit" 
          ? "Deposit paid! Booking confirmed. Remaining balance due at check-in." 
          : "Fully Paid! Booking confirmed successfully."
      )
      
      // Reset States
      setBookRoom(null)
      setPaymentStep(false)
      setCreatedBookingId(null)
      setStripeIntent(null)
      
      // Re-search to update statuses
      if (searchDates) {
        onSearch(searchDates)
      } else {
        loadInitialRooms()
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Payment failed. Please try again.")
    } finally {
      setPaymentProcessing(false)
    }
  }

  // Format card input
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

  const getCardBrand = () => {
    const cleanNum = cardNumber.replace(/\s/g, "")
    if (cleanNum.startsWith("4")) return "Visa"
    if (cleanNum.startsWith("5")) return "Mastercard"
    if (cleanNum.startsWith("3")) return "Amex"
    return "Unknown"
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-primary" /> Browse Rooms
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Find, check real-time availability, and book your perfect stay.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form onSubmit={searchForm.handleSubmit(onSearch)} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1 w-full">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> Check In</label>
            <input {...searchForm.register("check_in")} type="date" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {searchForm.formState.errors.check_in && <p className="text-[10px] text-destructive absolute">{searchForm.formState.errors.check_in.message}</p>}
          </div>
          <div className="space-y-1 flex-1 w-full">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> Check Out</label>
            <input {...searchForm.register("check_out")} type="date" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {searchForm.formState.errors.check_out && <p className="text-[10px] text-destructive absolute">{searchForm.formState.errors.check_out.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search Availability
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {searched ? `${rooms.length} Rooms Filtered` : "Available Rooms & Suites"}
          </h3>
          {!searched && (
            <span className="text-xs flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full">
              <Info className="h-3.5 w-3.5" /> Please search dates to book
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
            <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-foreground">No rooms found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              // Determine availability status
              const isAvailable = searched ? room.is_available : (room.status === "Available" || room.status === "Cleaning")
              return (
                <div key={room.id} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group border-border">
                  <div className="aspect-[4/3] bg-muted/50 relative overflow-hidden flex items-center justify-center text-muted-foreground">
                    <img 
                      src={`https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop&sig=${room.id}`} 
                      alt="Room" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                        isAvailable 
                          ? "bg-emerald-500 text-white" 
                          : "bg-destructive text-white"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full bg-white ${isAvailable ? "animate-pulse" : ""}`} />
                        {isAvailable ? "Available" : "Booked"}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 text-white z-10">
                      <p className="font-serif text-xl tracking-wide leading-tight text-white">{room.room_type.name}</p>
                      <p className="text-xs text-emerald-100 font-light mt-0.5">Room {room.room_number} · Floor {room.floor}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xl font-bold text-primary">TK {room.room_type.base_price_per_night.toFixed(0)}<span className="text-xs text-muted-foreground font-normal"> /night</span></p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        <Users className="h-3.5 w-3.5" /> Max {room.room_type.max_occupancy}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">
                      {room.room_type.description || "A beautiful, premium room equipped for your comfortable stay."}
                    </p>
                    
                    <button
                      onClick={() => openBookModal(room)}
                      disabled={!isAvailable}
                      className={`w-full rounded-lg py-2 text-sm font-semibold shadow-sm transition-all ${
                        isAvailable 
                          ? "bg-primary text-primary-foreground hover:bg-primary/95" 
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {isAvailable ? (searchDates ? "Book Now" : "Select Dates to Book") : "Unavailable"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Booking Dialog Modal */}
      {bookRoom && (
        <Modal 
          isOpen={!!bookRoom} 
          title={paymentStep ? "Settle Booking Payment" : `Book ${bookRoom.room_type.name}`} 
          onClose={() => setBookRoom(null)}
        >
          {!paymentStep ? (
            <form onSubmit={bookForm.handleSubmit(onProceedToPayment)} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 border text-sm space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Room:</span>
                  <span className="font-semibold">{bookRoom.room_number} ({bookRoom.room_type.name})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nights Stay:</span>
                  <span className="font-semibold">{getNights()} night(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price / Night:</span>
                  <span className="font-semibold">TK {bookRoom.room_type.base_price_per_night.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-muted-foreground/20 pt-2 font-bold text-base">
                  <span>Total Bill:</span>
                  <span className="text-primary">TK {getPriceBreakdown(bookRoom).total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment selector option */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">Select Payment Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setPaymentOption("deposit")}
                    className={`cursor-pointer rounded-lg border p-3 flex flex-col justify-between transition-all ${
                      paymentOption === "deposit" 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="font-bold text-sm text-foreground">30% Deposit</span>
                    <span className="text-xs text-primary font-semibold mt-1">TK {getPriceBreakdown(bookRoom).deposit.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Rest due at check-in</span>
                  </div>

                  <div 
                    onClick={() => setPaymentOption("full")}
                    className={`cursor-pointer rounded-lg border p-3 flex flex-col justify-between transition-all ${
                      paymentOption === "full" 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="font-bold text-sm text-foreground">Full Payment</span>
                    <span className="text-xs text-primary font-semibold mt-1">TK {getPriceBreakdown(bookRoom).total.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Fully settled booking</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Number of Guests</label>
                <input {...bookForm.register("num_guests")} type="number" min="1" max={bookRoom.room_type.max_occupancy} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {bookForm.formState.errors.num_guests && <p className="text-[10px] text-destructive">{bookForm.formState.errors.num_guests.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Special Requests (optional)</label>
                <textarea {...bookForm.register("special_requests")} rows={3} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Any specific needs or requests?" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setBookRoom(null)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Proceed to Payment
                </button>
              </div>
            </form>
          ) : (
            // Card Payment Step
            <form onSubmit={onCompletePayment} className="space-y-5">
              {stripeIntent?.is_mock && (
                <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Info className="h-4 w-4 text-amber-600" /> Stripe Sandbox Simulator Active
                  </p>
                  <p>System is running in development fallback. You can use any simulated card number (e.g. 4242 4242 4242 4242) to checkout.</p>
                </div>
              )}

              {/* Total Summary */}
              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Amount ({paymentOption === "deposit" ? "30% Deposit" : "Full"})</p>
                  <p className="font-bold text-lg text-primary">TK {stripeIntent?.amount?.toFixed(2)}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium bg-card px-2.5 py-1 rounded border">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" /> SSL Secured
                </span>
              </div>

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

              {/* Form Input fields */}
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

              <div className="flex justify-between items-center pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setPaymentStep(false)}
                  disabled={paymentProcessing}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Back
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
                      Authorize Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
