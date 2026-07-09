import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { Room, BookingCreate } from "@/types/api"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import { BedDouble, Loader2, Search, Calendar, Users } from "lucide-react"

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
  
  const [bookRoom, setBookRoom] = useState<Room | null>(null)

  const searchForm = useForm<{ check_in: string, check_out: string }>({ 
    resolver: zodResolver(searchSchema) 
  })
  
  const bookForm = useForm<BookingCreate>({ resolver: zodResolver(bookingSchema) })

  const onSearch = async (data: { check_in: string, check_out: string }) => {
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get<Room[]>("/rooms/available", {
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
    setBookRoom(room)
    const dates = searchForm.getValues()
    bookForm.reset({
      room_id: room.id,
      check_in_date: dates.check_in,
      check_out_date: dates.check_out,
      num_guests: 1,
      special_requests: ""
    })
  }

  const onBookRoom = async (data: BookingCreate) => {
    try {
      await api.post("/bookings/", data)
      toastSuccess("Room booked successfully! Wait for confirmation.")
      setBookRoom(null)
      // Re-search to remove booked room
      onSearch(searchForm.getValues())
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to book room.")
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-primary" /> Browse Rooms
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Find and book your perfect stay.</p>
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

      {searched && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">{rooms.length} Rooms Available</h3>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
              <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-foreground">No rooms available for these dates.</p>
              <p className="text-sm mt-1">Try adjusting your check-in and check-out dates.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div key={room.id} className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col group">
                  <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center text-muted-foreground">
                    {/* Placeholder image since we don't have real images */}
                    <BedDouble className="h-12 w-12 opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="font-bold text-lg leading-tight">{room.room_type.name}</p>
                      <p className="text-xs text-white/80">Room {room.room_number} · Floor {room.floor}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-2xl font-bold text-primary">${room.room_type.base_price_per_night.toFixed(0)}<span className="text-sm text-muted-foreground font-normal">/night</span></p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        <Users className="h-3.5 w-3.5" /> Max {room.room_type.max_occupancy}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground flex-1 mb-4 line-clamp-2">
                      {room.room_type.description || "A beautiful room for your stay."}
                    </p>
                    
                    <button
                      onClick={() => openBookModal(room)}
                      className="w-full rounded-lg bg-secondary py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      Book This Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      <Modal isOpen={!!bookRoom} title={`Book ${bookRoom?.room_type.name}`} onClose={() => setBookRoom(null)}>
        <form onSubmit={bookForm.handleSubmit(onBookRoom)} className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-4 border text-sm space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-semibold">{bookRoom?.room_number} (Floor {bookRoom?.floor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dates:</span>
              <span className="font-semibold">{searchForm.getValues("check_in")} to {searchForm.getValues("check_out")}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground font-medium">Price per night:</span>
              <span className="font-bold text-primary">${bookRoom?.room_type.base_price_per_night.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Number of Guests</label>
            <input {...bookForm.register("num_guests")} type="number" min="1" max={bookRoom?.room_type.max_occupancy} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {bookForm.formState.errors.num_guests && <p className="text-[10px] text-destructive">{bookForm.formState.errors.num_guests.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Special Requests (optional)</label>
            <textarea {...bookForm.register("special_requests")} rows={3} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Any specific needs or requests?" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setBookRoom(null)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={bookForm.formState.isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {bookForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
