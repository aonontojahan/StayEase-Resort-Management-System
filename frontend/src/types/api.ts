// ── Room Types ──────────────────────────────────────────────────────────
export interface RoomType {
  id: string
  name: string
  description: string | null
  base_price_per_night: number
  max_occupancy: number
  amenities: string[]
  image_urls: string[]
}

export interface Room {
  id: string
  room_number: string
  floor: number
  status: "Available" | "Occupied" | "Maintenance" | "Cleaning"
  notes: string | null
  room_type: RoomType
  room_type_id?: string
  created_at: string
  updated_at: string
}

export interface RoomCreate {
  room_number: string
  floor: number
  notes?: string
  room_type_id: string
}

export interface RoomUpdate {
  room_number?: string
  floor?: number
  status?: string
  notes?: string
  room_type_id?: string
}

export interface RoomTypeCreate {
  name: string
  description?: string
  base_price_per_night: number
  max_occupancy: number
  amenities?: string[]
  image_urls?: string[]
}

// ── Bookings ─────────────────────────────────────────────────────────────
export interface GuestSimple {
  id: string
  full_name: string
  email: string
  phone_number: string | null
}

export interface RoomTypeSimple {
  id: string
  name: string
  base_price_per_night: number
  image_urls: string[]
}

export interface RoomSimple {
  id: string
  room_number: string
  floor: number
  room_type: RoomTypeSimple
}

export interface Booking {
  id: string
  check_in_date: string
  check_out_date: string
  num_guests: number
  status: "Pending" | "Confirmed" | "CheckedIn" | "CheckedOut" | "Cancelled"
  special_requests: string | null
  total_amount: number
  guest: GuestSimple
  room: RoomSimple
  created_at: string
  updated_at: string
}

export interface BookingCreate {
  room_id: string
  check_in_date: string
  check_out_date: string
  num_guests: number
  special_requests?: string
}

// ── Payments ──────────────────────────────────────────────────────────────
export interface BookingSimple {
  id: string
  total_amount: number
  status: string
}

export interface UserSimple {
  id: string
  full_name: string
}

export interface Payment {
  id: string
  amount: number
  payment_method: "Cash" | "Card" | "BankTransfer"
  status: "Pending" | "Completed" | "Refunded"
  transaction_ref: string | null
  notes: string | null
  booking: BookingSimple
  recorded_by: UserSimple | null
  created_at: string
}

export interface PaymentCreate {
  booking_id: string
  amount: number
  payment_method: string
  transaction_ref?: string
  notes?: string
}

// ── Housekeeping ──────────────────────────────────────────────────────────
export interface HousekeepingRoomSimple {
  id: string
  room_number: string
  floor: number
}

export interface HousekeepingUserSimple {
  id: string
  full_name: string
  email: string
}

export interface HousekeepingTask {
  id: string
  title: string
  description: string | null
  status: "Pending" | "InProgress" | "Done"
  priority: "Low" | "Medium" | "High"
  due_date: string | null
  completed_at: string | null
  room: HousekeepingRoomSimple
  assigned_to: HousekeepingUserSimple | null
  created_by: HousekeepingUserSimple | null
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  room_id: string
  assigned_to_id?: string
  title: string
  description?: string
  priority?: string
  due_date?: string
}

// ── Reports ──────────────────────────────────────────────────────────────
export interface OccupancyReport {
  total_rooms: number
  occupied: number
  available: number
  cleaning: number
  maintenance: number
  occupancy_rate: number
}

export interface BookingsSummary {
  Pending: number
  Confirmed: number
  CheckedIn: number
  CheckedOut: number
  Cancelled: number
  Total: number
}

export interface RevenueReport {
  month: string
  revenue: number
  count: number
}
