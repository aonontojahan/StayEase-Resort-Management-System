import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/store/AuthContext"
import { api, apiGet } from "@/services/api"
import { OccupancyReport, BookingsSummary, RevenueReport } from "@/types/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import { 
  Home, BookOpen, BedDouble, Sparkles, CreditCard, FileText, Menu, X,
  UserCheck, UserCircle, LogIn, LogOut, Loader2, Sun, Moon, BarChart3,
  CalendarCheck, Building2,
} from "lucide-react"

import { StaffManagement } from "@/components/StaffManagement"
import { RoomsPage } from "@/pages/RoomsPage"
import { BookingsPage } from "@/pages/BookingsPage"
import { GuestsPage } from "@/pages/GuestsPage"
import { HousekeepingPage } from "@/pages/HousekeepingPage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { AccountantPage } from "@/pages/AccountantPage"
import { InvoicesPage } from "@/pages/InvoicesPage"
import { MyBookingsPage } from "@/pages/MyBookingsPage"
import { BrowseRoomsPage } from "@/pages/BrowseRoomsPage"
import { PaymentHistoryPage } from "@/pages/PaymentHistoryPage"
import { HousekeepingTasksPage } from "@/pages/HousekeepingTasksPage"
import { StatsGridSkeleton } from "@/components/Skeleton"
import { UserMenu } from "@/components/UserMenu"
import { NotificationBell } from "@/components/NotificationBell"
import { useToast } from "@/components/Toast"
import { EditProfileModal, SecurityModal } from "@/components/ProfileModals"
import { useDarkMode } from "@/hooks/useDarkMode"
import { Badge } from "@/components/ui/Badge"

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const { dark, toggle: toggleDark } = useDarkMode()

  const [activeTab, setActiveTab] = useState<string>("Dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => setActiveTab(e.detail)
    window.addEventListener("navigate-tab", handler as EventListener)
    return () => window.removeEventListener("navigate-tab", handler as EventListener)
  }, [])
  const [todaysArrivals, setTodaysArrivals] = useState<any[]>([])
  const [todaysDepartures, setTodaysDepartures] = useState<any[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)

  // Live stats & lists for ERP dashboard
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null)
  const [bookingsSummary, setBookingsSummary] = useState<BookingsSummary | null>(null)
  const [revenueReport, setRevenueReport] = useState<RevenueReport[]>([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  const fetchDashboardData = async () => {
    if (!user) return
    setLoadingDashboard(true)

    if (user.role.name === "Receptionist") {
      try {
        const [roomsRes, bookingsRes] = await Promise.allSettled([
          apiGet<any[]>("/rooms/"),
          apiGet<any[]>("/bookings/", { params: { limit: 200 } }),
        ])

        if (roomsRes.status === "fulfilled") {
          const rooms = roomsRes.value.data
          const available = rooms.filter((r: any) => r.status !== "Occupied" && r.status !== "Maintenance").length
          const occupied = rooms.filter((r: any) => r.status === "Occupied").length
          const cleaning = rooms.filter((r: any) => r.status === "Cleaning").length
          const maintenance = rooms.filter((r: any) => r.status === "Maintenance").length
          setOccupancy({
            total_rooms: rooms.length,
            available, occupied, cleaning, maintenance,
            occupancy_rate: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
          } as OccupancyReport)
        }

        if (bookingsRes.status === "fulfilled") {
          const bookings = bookingsRes.value.data
          const today = new Date().toISOString().split('T')[0]
          setTodaysArrivals(
            bookings.filter((b: any) =>
              b.booking_rooms?.some((br: any) => br.check_in_date === today)
            )
          )
          setTodaysDepartures(
            bookings.filter((b: any) =>
              b.booking_rooms?.some((br: any) => br.check_out_date === today)
            )
          )
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingDashboard(false)
      }
      return
    }

    if (!["Resort Owner", "Manager", "Accountant"].includes(user.role.name)) {
      setLoadingDashboard(false)
      return
    }

    try {
      const [occRes, summaryRes, revRes] = await Promise.allSettled([
        apiGet<OccupancyReport>("/reports/occupancy"),
        apiGet<BookingsSummary>("/reports/bookings-summary"),
        apiGet<RevenueReport[]>("/reports/revenue"),
      ])
      if (occRes.status === "fulfilled") setOccupancy(occRes.value.data)
      if (summaryRes.status === "fulfilled") setBookingsSummary(summaryRes.value.data)
      if (revRes.status === "fulfilled") setRevenueReport(revRes.value.data)
    } catch {
      // silently ignore — dashboard shows fallback zeros
    } finally {
      setLoadingDashboard(false)
    }
  }

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (activeTab === "Dashboard") {
      fetchDashboardData()
      pollRef.current = setInterval(fetchDashboardData, 30000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [user, activeTab])

  const { toastSuccess, toastError } = useToast()

  const handleCheckIn = async (booking: any) => {
    setUpdatingId(booking.id)
    try {
      await api.post(`/bookings/${booking.id}/check-in`)
      toastSuccess(`${booking.guest?.full_name || "Guest"} checked in successfully.`)
      fetchDashboardData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to check in.")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCheckOut = async (booking: any) => {
    setUpdatingId(booking.id)
    try {
      await api.post(`/bookings/${booking.id}/check-out`)
      toastSuccess(`${booking.guest?.full_name || "Guest"} checked out successfully.`)
      fetchDashboardData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to check out.")
    } finally {
      setUpdatingId(null)
    }
  }

  const { onMessage } = useWebSocket()

  useEffect(() => {
    if (activeTab !== "Dashboard") return
    const unsub = onMessage("dashboard_update", () => {
      fetchDashboardData()
    })
    return unsub
  }, [activeTab])

  // Set default tab based on role if they are on "Dashboard"
  useEffect(() => {
    if (user) {
      if (user.role.name === "Guest" && activeTab === "Dashboard") {
        setActiveTab("Browse Rooms")
      } else if (user.role.name === "Housekeeping" && activeTab === "Dashboard") {
        setActiveTab("Housekeeping Tasks")
      }
    }
  }, [user])

  if (!user) return null

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const navBtn = (tab: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => handleTabChange(tab)}
      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
        activeTab === tab
          ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  const sectionLabel = (label: string) => (
    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold px-3.5 pt-5 pb-1.5 dark:text-gray-500">{label}</p>
  )

  const NavLinks = () => (
    <>
      {["Resort Owner", "Manager", "Accountant"].includes(user.role.name) && (
        navBtn("Dashboard", <Home className="h-4 w-4" />, "Dashboard")
      )}
      {user.role.name === "Resort Owner" || user.role.name === "Manager" ? (
        <>
          {sectionLabel("Operations")}
          {navBtn("Bookings", <BookOpen className="h-4 w-4" />, "Bookings")}
          {navBtn("Rooms", <BedDouble className="h-4 w-4" />, "Rooms")}
          {navBtn("Guests", <UserCircle className="h-4 w-4" />, "Guests")}
          {sectionLabel("Services")}
          {navBtn("Housekeeping", <Sparkles className="h-4 w-4" />, "Housekeeping")}
          {navBtn("Staff Management", <UserCheck className="h-4 w-4" />, "Staff Management")}
          {sectionLabel("Finance")}
          {navBtn("Payments", <CreditCard className="h-4 w-4" />, "Payments")}
          {navBtn("Invoices", <FileText className="h-4 w-4" />, "Invoices")}
        </>
      ) : user.role.name === "Guest" ? (
        <>
          {navBtn("My Bookings", <BookOpen className="h-4 w-4" />, "My Bookings")}
          {navBtn("Browse Rooms", <BedDouble className="h-4 w-4" />, "Browse Rooms")}
          {navBtn("Payment History", <CreditCard className="h-4 w-4" />, "Payment History")}
          {navBtn("Invoices", <FileText className="h-4 w-4" />, "Invoices")}
        </>
      ) : user.role.name === "Housekeeping" ? (
        <>
          {navBtn("Housekeeping Tasks", <Sparkles className="h-4 w-4" />, "Housekeeping Tasks")}
        </>
      ) : user.role.name === "Accountant" ? (
        <>
          {sectionLabel("Finance")}
          {navBtn("Payments", <CreditCard className="h-4 w-4" />, "Payments")}
          {navBtn("Invoices", <FileText className="h-4 w-4" />, "Invoices")}
        </>
      ) : user.role.name === "Receptionist" ? (
        <>
          {sectionLabel("Front Desk")}
          {navBtn("Dashboard", <Home className="h-4 w-4" />, "Dashboard")}
          {navBtn("Bookings", <BookOpen className="h-4 w-4" />, "Bookings")}
          {navBtn("Browse Rooms", <BedDouble className="h-4 w-4" />, "Browse Rooms")}
        </>
      ) : null}
    </>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "Staff Management": return <StaffManagement />
      case "Rooms": return <RoomsPage />
      case "Bookings": return <BookingsPage />
      case "Guests": return <GuestsPage />
      case "Housekeeping": return <HousekeepingPage />
      case "Payments": return user.role.name === "Accountant" ? <AccountantPage /> : <PaymentsPage />
      case "Invoices": return <InvoicesPage />
      case "My Bookings": return <MyBookingsPage />
      case "Browse Rooms": return <BrowseRoomsPage />
      case "Payment History": return <PaymentHistoryPage />
      case "Housekeeping Tasks": return <HousekeepingTasksPage />
      case "Dashboard":
      default:
        // ── Receptionist Dashboard ──
        if (user.role.name === "Receptionist") {
          return (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />
                <div className="relative z-10 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-100/80 text-sm">
                    <CalendarCheck className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                  <h2 className="text-2xl font-bold sm:text-3xl tracking-tight">Welcome back, {user.full_name?.split(" ")[0]}</h2>
                  <p className="text-emerald-100/80 text-sm max-w-xl">Front Desk · {user.role.name}</p>
                </div>
              </div>

              {loadingDashboard ? (
                <StatsGridSkeleton />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <LogIn className="h-3 w-3 text-indigo-500" /> Today's Arrivals
                      </p>
                      <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{todaysArrivals.length}</h3>
                      <p className="text-[10px] text-gray-400">Expected check-ins today</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <LogOut className="h-3 w-3 text-amber-500" /> Today's Departures
                      </p>
                      <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todaysDepartures.length}</h3>
                      <p className="text-[10px] text-gray-400">Expected check-outs today</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BedDouble className="h-3 w-3 text-blue-500" /> Occupied Rooms
                      </p>
                      <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{occupancy?.occupied || 0}</h3>
                      <p className="text-[10px] text-gray-400">Currently checked in</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-emerald-500" /> Available Rooms
                      </p>
                      <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{occupancy?.available || 0}</h3>
                      <p className="text-[10px] text-gray-400">Ready for new guests</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Quick Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setActiveTab("Bookings")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 transition-all">
                        <BookOpen className="h-4 w-4" /> Record Walk-in Booking
                      </button>
                      <button onClick={() => setActiveTab("Bookings")} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                        View All Bookings
                      </button>
                      <button onClick={() => setActiveTab("Browse Rooms")} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                        <BedDouble className="h-4 w-4" /> Browse Rooms
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3 dark:border-gray-800 dark:bg-gray-900">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <LogIn className="h-3 w-3 text-indigo-500" /> Today's Arrivals
                      </h4>
                      {todaysArrivals.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">No arrivals scheduled today.</p>
                      ) : (
                        <div className="space-y-2">
                          {todaysArrivals.slice(0, 5).map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{b.guest?.full_name || "Guest"}</p>
                                <p className="text-gray-400">
                                  Room {b.booking_rooms?.[0]?.room?.room_number || "—"} · {b.booking_rooms?.[0]?.check_in_date}
                                </p>
                              </div>
                              {updatingId === b.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />
                              ) : b.status === "Confirmed" ? (
                                <button onClick={() => handleCheckIn(b)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0">
                                  Check In
                                </button>
                              ) : (
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 shrink-0">
                                  {b.status}
                                </span>
                              )}
                            </div>
                          ))}
                          {todaysArrivals.length > 5 && (
                            <button onClick={() => setActiveTab("Bookings")} className="w-full text-xs text-gray-400 hover:text-emerald-600 text-center transition-colors pt-1">+{todaysArrivals.length - 5} more · View All</button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3 dark:border-gray-800 dark:bg-gray-900">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <LogOut className="h-3 w-3 text-amber-500" /> Today's Departures
                      </h4>
                      {todaysDepartures.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">No departures scheduled today.</p>
                      ) : (
                        <div className="space-y-2">
                          {todaysDepartures.slice(0, 5).map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{b.guest?.full_name || "Guest"}</p>
                                <p className="text-gray-400">
                                  Room {b.booking_rooms?.[0]?.room?.room_number || "—"} · {b.booking_rooms?.[0]?.check_out_date}
                                </p>
                              </div>
                              {updatingId === b.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />
                              ) : b.status === "CheckedIn" ? (
                                <button onClick={() => handleCheckOut(b)} className="rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-500 transition-colors shrink-0">
                                  Check Out
                                </button>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                                  {b.status}
                                </span>
                              )}
                            </div>
                          ))}
                          {todaysDepartures.length > 5 && (
                            <button onClick={() => setActiveTab("Bookings")} className="w-full text-xs text-gray-400 hover:text-emerald-600 text-center transition-colors pt-1">+{todaysDepartures.length - 5} more · View All</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        }

        // ── Owner / Manager / Accountant Dashboard ──
        const totalRevenue = revenueReport.reduce((sum, r) => sum + r.revenue, 0)
        const totalTransactions = revenueReport.reduce((sum, r) => sum + r.count, 0)
        return (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />
              <div className="relative z-10 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-100/80 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span>Executive Overview</span>
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl tracking-tight">StayEase Resort</h2>
                <p className="text-emerald-100/80 text-sm max-w-xl">{user.full_name}, {user.role.name}</p>
              </div>
            </div>

            {loadingDashboard ? (
              <StatsGridSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupancy Rate</p>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{occupancy?.occupancy_rate || 0}%</h3>
                      <span className="text-[10px] text-gray-400">· {occupancy?.occupied || 0}/{occupancy?.total_rooms || 0} rooms</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden dark:bg-gray-800">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${occupancy?.occupancy_rate || 0}%` }} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Bookings</p>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bookingsSummary?.Confirmed || 0}</h3>
                      <span className="text-[10px] text-gray-400">confirmed</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{bookingsSummary?.CheckedIn || 0} checked in · {bookingsSummary?.CheckedOut || 0} checked out</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">TK {totalRevenue.toLocaleString()}</h3>
                    </div>
                    <p className="text-[10px] text-gray-400">From {totalTransactions} completed checkouts</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Queue</p>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{(occupancy?.cleaning || 0) + (occupancy?.maintenance || 0)}</h3>
                    </div>
                    <p className="text-[10px] text-gray-400">{occupancy?.cleaning || 0} cleaning · {occupancy?.maintenance || 0} maintenance</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LogIn className="h-3 w-3 text-indigo-500" /> Pending Check-ins
                    </p>
                    <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{bookingsSummary?.Confirmed || 0}</h3>
                    <p className="text-[10px] text-gray-400">Awaiting arrival</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BedDouble className="h-3 w-3 text-blue-500" /> Active Stays
                    </p>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{occupancy?.occupied || 0}</h3>
                    <p className="text-[10px] text-gray-400">Currently checked in</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-2 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LogOut className="h-3 w-3 text-amber-500" /> Due Check-outs
                    </p>
                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bookingsSummary?.CheckedIn || 0}</h3>
                    <p className="text-[10px] text-gray-400">Expected to depart today</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 dark:border-gray-800 dark:bg-gray-900 lg:col-span-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Room Inventory Status</h4>
                    <div className="space-y-4">
                      {[
                        { label: "Available", value: occupancy?.available || 0, color: "bg-emerald-500", textColor: "text-emerald-600" },
                        { label: "Occupied", value: occupancy?.occupied || 0, color: "bg-blue-500", textColor: "text-blue-600" },
                        { label: "Cleaning", value: occupancy?.cleaning || 0, color: "bg-yellow-500", textColor: "text-yellow-600" },
                        { label: "Maintenance", value: occupancy?.maintenance || 0, color: "bg-red-500", textColor: "text-red-600" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className={`font-bold ${item.textColor} dark:opacity-80`}>{item.value}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div className={`${item.color} h-full rounded-full transition-all duration-500`}
                              style={{ width: `${occupancy?.total_rooms ? (item.value / occupancy.total_rooms) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Sales & Bookings Report</h4>
                    {revenueReport.length === 0 ? (
                      <p className="text-xs text-gray-400 py-8 text-center">No payment history recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold dark:border-gray-800">
                              <th className="py-2.5">Month</th>
                              <th className="py-2.5 text-right">Transactions</th>
                              <th className="py-2.5 text-right">Gross Income</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {revenueReport.map((rep, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="py-2.5 font-medium text-gray-800 dark:text-gray-200">{rep.month}</td>
                                <td className="py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{rep.count}</td>
                                <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">TK {rep.revenue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )
    }
  }

  return (
    <>
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 lg:flex lg:flex-col lg:justify-between shrink-0">
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">StayEase</span>
              <span className="text-[10px] font-medium text-emerald-600 block -mt-0.5">Management</span>
            </div>
          </div>
          <nav className="space-y-0.5">
            <NavLinks />
          </nav>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
          <button onClick={toggleDark} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <UserMenu onEditProfile={() => setEditProfileOpen(true)} onSecurity={() => setSecurityOpen(true)} />
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 p-5 shadow-xl transition-transform lg:hidden flex flex-col justify-between ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">StayEase</span>
                <span className="text-[10px] font-medium text-emerald-600 block -mt-0.5">Management</span>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-0.5">
            <NavLinks />
          </nav>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
          <button onClick={toggleDark} className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all dark:text-gray-400 dark:hover:bg-gray-800/50">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <UserMenu onEditProfile={() => { setEditProfileOpen(true); setMobileMenuOpen(false) }} onSecurity={() => { setSecurityOpen(true); setMobileMenuOpen(false) }} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto w-full">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{activeTab}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 font-medium px-3 py-1">
              {user.role.name}
            </Badge>
            <NotificationBell />
          </div>
        </header>

        <main className="px-6 py-6 md:px-8 md:pb-8 md:pt-4 pt-3 space-y-6 w-full max-w-7xl mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>

    {/* Profile Modals */}
    <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    <SecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </>
  )
}
