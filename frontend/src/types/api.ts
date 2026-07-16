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
  status: "Available" | "Occupied" | "Maintenance" | "Cleaning" | "Cleaned"
  notes: string | null
  room_type: RoomType
  room_type_id?: string
  is_available?: boolean
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

export interface BookingRoomRead {
  id: string
  check_in_date: string
  check_out_date: string
  num_guests: number
  special_requests: string | null
  room_price_per_night: number
  total_amount: number
  status: string
  room: RoomSimple
}

export interface BookingRoomCreate {
  room_id: string
  check_in_date: string
  check_out_date: string
  num_guests: number
  special_requests?: string
}

export interface Booking {
  id: string
  status: "Pending" | "Confirmed" | "CheckedIn" | "CheckedOut" | "Cancelled"
  total_amount: number
  paid_amount: number
  guest: GuestSimple
  booking_rooms: BookingRoomRead[]
  created_at: string
  updated_at: string
}

export interface BookingCreate {
  rooms: BookingRoomCreate[]
}

// ── Payments ──────────────────────────────────────────────────────────────
export interface RoomSimpleBooking {
  id: string
  room_number: string
}

export interface BookingRoomSimple {
  id: string
  check_in_date: string
  check_out_date: string
  num_guests: number
  room: RoomSimpleBooking
}

export interface BookingSimple {
  id: string
  total_amount: number
  status: string
  booking_rooms: BookingRoomSimple[]
}

export interface UserSimple {
  id: string
  full_name: string
}

export interface Payment {
  id: string
  amount: number
  payment_method: "Cash" | "Card" | "BankTransfer" | "bKash" | "Nagad" | "Rocket"
  status: "Pending" | "Completed" | "Refunded" | "CancelledFee"
  transaction_ref: string | null
  notes: string | null
  cancellation_fee: number | null
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
  room_type: { id: string; name: string; base_price_per_night: number }
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

export interface StripeIntent {
  client_secret: string
  amount: number
  currency: string
  payment_intent_id: string
  is_mock: boolean
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

// ── Invoices ──────────────────────────────────────────────────────────────
export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface Invoice {
  id: string
  invoice_number: string
  booking_id: string
  guest_id: string
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: "Draft" | "Issued" | "Paid" | "Cancelled" | "Refunded"
  notes: string | null
  created_at: string
  updated_at: string
  items: InvoiceItem[]
}

export interface InvoiceSummary {
  total_invoices: number
  total_paid: number
  total_unpaid: number
  total_cancelled: number
  paid_count: number
  unpaid_count: number
}

// ── Refunds ──────────────────────────────────────────────────────────────
export interface Refund {
  id: string
  payment_id: string
  booking_id: string
  amount: number
  cancellation_fee: number | null
  refund_method: string | null
  status: "Pending" | "Completed" | "Failed"
  transaction_ref: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
}

export interface RevenueSummary {
  total_revenue: number
  net_revenue: number
  total_payments: number
  completed_payments: number
  refunded_payments: number
  cancellation_fees: number
  actual_refunded: number
}

export interface RefundSummary {
  pending_count: number
  total_refunded: number
  total_cancellation_fees: number
}
