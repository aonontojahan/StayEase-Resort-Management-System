import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/store/AuthContext"
import { api, apiGet } from "@/services/api"
import { OccupancyReport, BookingsSummary, RevenueReport } from "@/types/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import { 
  Home, BookOpen, BedDouble, Sparkles, CreditCard, FileText, Menu, X,
  UserCheck, UserCircle, LogIn, LogOut, Loader2, Sun, Moon
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

  const NavLinks = () => (
    <>
      {["Resort Owner", "Manager", "Accountant"].includes(user.role.name) && (
        <button onClick={() => handleTabChange("Dashboard")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </button>
      )}
      {user.role.name === "Resort Owner" || user.role.name === "Manager" ? (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">Operations</p>
          <button onClick={() => handleTabChange("Bookings")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Bookings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BookOpen className="h-4 w-4" />
            <span>Bookings</span>
          </button>
          <button onClick={() => handleTabChange("Rooms")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Rooms" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BedDouble className="h-4 w-4" />
            <span>Rooms</span>
          </button>
          <button onClick={() => handleTabChange("Guests")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Guests" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <UserCircle className="h-4 w-4" />
            <span>Guests</span>
          </button>

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">Services</p>
          <button onClick={() => handleTabChange("Housekeeping")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Housekeeping" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Sparkles className="h-4 w-4" />
            <span>Housekeeping</span>
          </button>
          <button onClick={() => handleTabChange("Staff Management")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Staff Management" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <UserCheck className="h-4 w-4" />
            <span>Staff Management</span>
          </button>

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">Finance</p>
          <button onClick={() => handleTabChange("Payments")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Payments" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </button>
          <button onClick={() => handleTabChange("Invoices")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Invoices" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </button>

        </>
      ) : user.role.name === "Guest" ? (
        <>
          <button onClick={() => handleTabChange("My Bookings")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "My Bookings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BookOpen className="h-4 w-4" />
            <span>My Bookings</span>
          </button>
          <button onClick={() => handleTabChange("Browse Rooms")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Browse Rooms" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BedDouble className="h-4 w-4" />
            <span>Browse Rooms</span>
          </button>
          <button onClick={() => handleTabChange("Payment History")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Payment History" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <CreditCard className="h-4 w-4" />
            <span>Payment History</span>
          </button>
          <button onClick={() => handleTabChange("Invoices")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Invoices" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </button>
        </>
      ) : user.role.name === "Housekeeping" ? (
        <>
          <button onClick={() => handleTabChange("Housekeeping Tasks")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Housekeeping Tasks" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Sparkles className="h-4 w-4" />
            <span>Housekeeping Tasks</span>
          </button>
        </>
      ) : user.role.name === "Accountant" ? (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">Finance</p>
          <button onClick={() => handleTabChange("Payments")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Payments" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </button>
          <button onClick={() => handleTabChange("Invoices")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Invoices" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </button>
        </>
      ) : user.role.name === "Receptionist" ? (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">Front Desk</p>
          <button onClick={() => handleTabChange("Dashboard")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => handleTabChange("Bookings")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Bookings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BookOpen className="h-4 w-4" />
            <span>Bookings</span>
          </button>
          <button onClick={() => handleTabChange("Browse Rooms")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Browse Rooms" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BedDouble className="h-4 w-4" />
            <span>Browse Rooms</span>
          </button>
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
              {/* Welcome Header */}
              <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-emerald-900 p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"></div>
                <div className="relative z-10 space-y-1">
                  <h2 className="text-2xl font-bold md:text-3xl font-serif tracking-wide">Front Desk</h2>
                  <p className="text-emerald-100 text-xs md:text-sm max-w-xl">
                    {user.full_name}, {user.role.name}
                  </p>
                </div>
              </div>

              {loadingDashboard ? (
                <StatsGridSkeleton />
              ) : (
                <>
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <LogIn className="h-3 w-3" /> Today's Arrivals
                      </p>
                      <h3 className="text-2xl font-bold text-indigo-600">{todaysArrivals.length}</h3>
                      <p className="text-[10px] text-muted-foreground">Expected check-ins today</p>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <LogOut className="h-3 w-3" /> Today's Departures
                      </p>
                      <h3 className="text-2xl font-bold text-amber-600">{todaysDepartures.length}</h3>
                      <p className="text-[10px] text-muted-foreground">Expected check-outs today</p>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <BedDouble className="h-3 w-3" /> Occupied Rooms
                      </p>
                      <h3 className="text-2xl font-bold text-blue-600">{occupancy?.occupied || 0}</h3>
                      <p className="text-[10px] text-muted-foreground">Currently checked in</p>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Home className="h-3 w-3" /> Available Rooms
                      </p>
                      <h3 className="text-2xl font-bold text-green-600">{occupancy?.available || 0}</h3>
                      <p className="text-[10px] text-muted-foreground">Ready for new guests</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Quick Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setActiveTab("Bookings")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all">
                        <BookOpen className="h-4 w-4" />
                        Record Walk-in Booking
                      </button>
                      <button onClick={() => setActiveTab("Bookings")} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-secondary transition-all">
                        View All Bookings
                      </button>
                      <button onClick={() => setActiveTab("Browse Rooms")} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-secondary transition-all">
                        <BedDouble className="h-4 w-4" />
                        Browse Rooms
                      </button>
                    </div>
                  </div>

                  {/* Today's Arrivals & Departures Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <LogIn className="h-3 w-3" /> Today's Arrivals
                      </h4>
                      {todaysArrivals.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No arrivals scheduled today.</p>
                      ) : (
                        <div className="space-y-2">
                          {todaysArrivals.slice(0, 5).map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{b.guest?.full_name || "Guest"}</p>
                                <p className="text-muted-foreground">
                                  Room {b.booking_rooms?.[0]?.room?.room_number || "—"} · {b.booking_rooms?.[0]?.check_in_date}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {updatingId === b.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : b.status === "Confirmed" ? (
                                  <button onClick={() => handleCheckIn(b)} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 transition-colors" title="Check in guest">
                                    <LogIn className="h-3 w-3 inline mr-0.5" /> Check In
                                  </button>
                                ) : (
                                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                                    {b.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {todaysArrivals.length > 5 && (
                            <button onClick={() => setActiveTab("Bookings")} className="w-full text-xs text-muted-foreground hover:text-primary text-center transition-colors">+{todaysArrivals.length - 5} more · View All</button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <LogOut className="h-3 w-3" /> Today's Departures
                      </h4>
                      {todaysDepartures.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No departures scheduled today.</p>
                      ) : (
                        <div className="space-y-2">
                          {todaysDepartures.slice(0, 5).map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{b.guest?.full_name || "Guest"}</p>
                                <p className="text-muted-foreground">
                                  Room {b.booking_rooms?.[0]?.room?.room_number || "—"} · {b.booking_rooms?.[0]?.check_out_date}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {updatingId === b.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : b.status === "CheckedIn" ? (
                                  <button onClick={() => handleCheckOut(b)} className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 transition-colors" title="Check out guest">
                                    <LogOut className="h-3 w-3 inline mr-0.5" /> Check Out
                                  </button>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                                    {b.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {todaysDepartures.length > 5 && (
                            <button onClick={() => setActiveTab("Bookings")} className="w-full text-xs text-muted-foreground hover:text-primary text-center transition-colors">+{todaysDepartures.length - 5} more · View All</button>
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
            {/* Welcome ERP Summary */}
            <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-emerald-900 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"></div>
              <div className="relative z-10 space-y-1">
                <h2 className="text-2xl font-bold md:text-3xl font-serif tracking-wide">StayEase Resort</h2>
                <p className="text-emerald-100 text-xs md:text-sm max-w-xl">
                  {user.full_name}, {user.role.name}
                </p>
              </div>
            </div>


            {loadingDashboard ? (
              <StatsGridSkeleton />
            ) : (
              <>
                {/* Metrics Cards Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {/* Occupancy Rate */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Occupancy Rate</p>
                      <h3 className="text-2xl font-bold mt-1 text-primary">{occupancy?.occupancy_rate || 0}%</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {occupancy?.occupied || 0} of {occupancy?.total_rooms || 0} rooms booked
                    </p>
                  </div>

                  {/* Booking Volume */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Bookings</p>
                      <h3 className="text-2xl font-bold mt-1 text-blue-600">{bookingsSummary?.Confirmed || 0}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Confirmed
                    </p>
                  </div>

                  {/* Revenue Summary */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                      <h3 className="text-2xl font-bold mt-1 text-emerald-600">TK {totalRevenue.toLocaleString()}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      From {totalTransactions} completed checkouts
                    </p>
                  </div>

                  {/* Cleaning Queue */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Queue</p>
                      <h3 className="text-2xl font-bold mt-1 text-amber-600">
                        {(occupancy?.cleaning || 0) + (occupancy?.maintenance || 0)}
                      </h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {occupancy?.cleaning || 0} cleaning · {occupancy?.maintenance || 0} maintenance
                    </p>
                  </div>
                </div>

                {/* Quick Actions - Check-in/Check-out */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <LogIn className="h-3 w-3" /> Pending Check-ins
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-indigo-600">{bookingsSummary?.Confirmed || 0}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Awaiting arrival</p>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <BedDouble className="h-3 w-3" /> Active Stays
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-blue-600">{occupancy?.occupied || 0}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Currently checked in</p>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <LogOut className="h-3 w-3" /> Due Check-outs
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-amber-600">{bookingsSummary?.CheckedIn || 0}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Expected to depart today</p>
                  </div>
                </div>

                {/* Detailed Analytics Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Room status distribution */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:col-span-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Inventory Status</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Available</span>
                          <span className="text-green-600 font-bold">{occupancy?.available || 0}</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${occupancy ? (occupancy.available / occupancy.total_rooms) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Occupied</span>
                          <span className="text-blue-600 font-bold">{occupancy?.occupied || 0}</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${occupancy ? (occupancy.occupied / occupancy.total_rooms) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>In Service / Cleaning</span>
                          <span className="text-yellow-600 font-bold">{occupancy?.cleaning || 0}</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-yellow-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${occupancy ? (occupancy.cleaning / occupancy.total_rooms) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Maintenance Check</span>
                          <span className="text-red-600 font-bold">{occupancy?.maintenance || 0}</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${occupancy ? (occupancy.maintenance / occupancy.total_rooms) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Revenue chart list */}
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Sales & Bookings Report</h4>
                    {revenueReport.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">No payment history recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b text-muted-foreground uppercase font-semibold">
                              <th className="py-2">Month</th>
                              <th className="py-2 text-right">Transactions</th>
                              <th className="py-2 text-right">Gross Income</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {revenueReport.map((rep, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                <td className="py-2.5 font-medium">{rep.month}</td>
                                <td className="py-2.5 text-right font-mono">{rep.count}</td>
                                <td className="py-2.5 text-right font-bold text-emerald-600">TK {rep.revenue.toLocaleString()}</td>
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
    <div className="flex h-screen bg-background overflow-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 border-r bg-card p-6 lg:flex lg:flex-col lg:justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>StayEase</span>
          </div>
          <nav className="space-y-1">
            <NavLinks />
          </nav>
        </div>

        <div className="border-t pt-4 mt-auto space-y-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <UserMenu
            onEditProfile={() => setEditProfileOpen(true)}
            onSecurity={() => setSecurityOpen(true)}
          />
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card p-6 shadow-xl transition-transform lg:hidden flex flex-col justify-between ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>StayEase</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1">
            <NavLinks />
          </nav>
        </div>

        <div className="border-t pt-4 mt-auto space-y-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <UserMenu
            onEditProfile={() => { setEditProfileOpen(true); setMobileMenuOpen(false) }}
            onSecurity={() => { setSecurityOpen(true); setMobileMenuOpen(false) }}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto w-full">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          {/* Page title on mobile */}
          <div className="hidden sm:block lg:hidden">
            <span className="text-sm font-semibold text-foreground">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <Badge className="hidden sm:inline-flex">{user.role.name}</Badge>
            <NotificationBell />
          </div>
        </header>

        <main className="px-6 py-6 md:px-6 md:pb-8 md:pt-3 pt-3 space-y-6 w-full">
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
