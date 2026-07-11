import React, { useState, useEffect } from "react"
import { useAuth } from "@/store/AuthContext"
import { api } from "@/services/api"
import { OccupancyReport, BookingsSummary } from "@/types/api"
import { 
  Loader2, 
  Home, BookOpen, BedDouble, Users, Sparkles, CreditCard, FileText, Menu, X
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
import { UserMenu } from "@/components/UserMenu"
import { NotificationBell } from "@/components/NotificationBell"
import { EditProfileModal, SecurityModal } from "@/components/ProfileModals"


export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<string>("Dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)

  // Live stats & lists for ERP dashboard
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null)
  const [bookingsSummary, setBookingsSummary] = useState<BookingsSummary | null>(null)
  const [revenueReport, setRevenueReport] = useState<any[]>([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  const fetchDashboardData = async () => {
    if (!user || !["Resort Owner", "Manager", "Accountant"].includes(user.role.name)) return
    setLoadingDashboard(true)
    try {
      const [occRes, summaryRes, revRes] = await Promise.all([
        api.get<OccupancyReport>("/reports/occupancy"),
        api.get<BookingsSummary>("/reports/bookings-summary"),
        api.get<any[]>("/reports/revenue"),
      ])
      setOccupancy(occRes.data)
      setBookingsSummary(summaryRes.data)
      setRevenueReport(revRes.data)
    } catch (err) {
      console.error("Error loading ERP metrics", err)
    } finally {
      setLoadingDashboard(false)
    }
  }

  useEffect(() => {
    if (activeTab === "Dashboard") {
      fetchDashboardData()
    }
  }, [user, activeTab])

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
          <button onClick={() => handleTabChange("Staff Management")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Staff Management" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Users className="h-4 w-4" />
            <span>Staff Management</span>
          </button>
          <button onClick={() => handleTabChange("Bookings")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Bookings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BookOpen className="h-4 w-4" />
            <span>Bookings</span>
          </button>
          <button onClick={() => handleTabChange("Rooms")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Rooms" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <BedDouble className="h-4 w-4" />
            <span>Rooms</span>
          </button>
          <button onClick={() => handleTabChange("Guests")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Guests" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Users className="h-4 w-4" />
            <span>Guests</span>
          </button>
          <button onClick={() => handleTabChange("Housekeeping")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Housekeeping" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Sparkles className="h-4 w-4" />
            <span>Housekeeping</span>
          </button>
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
          <button onClick={() => handleTabChange("Payments")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Payments" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </button>
          <button onClick={() => handleTabChange("Invoices")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Invoices" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
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
      case "Settings":
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your resort credentials and user profile information.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-44">
                <div>
                  <h3 className="font-semibold text-base">Account Profile</h3>
                  <p className="text-xs text-muted-foreground mt-1">Update your full name, profile picture, phone number, and contact info.</p>
                </div>
                <button 
                  onClick={() => setEditProfileOpen(true)}
                  className="w-full mt-4 bg-primary text-primary-foreground text-xs font-semibold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Edit Profile Details
                </button>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-44">
                <div>
                  <h3 className="font-semibold text-base">Security & Password</h3>
                  <p className="text-xs text-muted-foreground mt-1">Change your account password regularly to keep your resort logs safe.</p>
                </div>
                <button 
                  onClick={() => setSecurityOpen(true)}
                  className="w-full mt-4 bg-secondary text-secondary-foreground text-xs font-semibold py-2 px-4 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )
      case "My Bookings": return <MyBookingsPage />
      case "Browse Rooms": return <BrowseRoomsPage />
      case "Payment History": return <PaymentHistoryPage />
      case "Housekeeping Tasks": return <HousekeepingTasksPage />
      case "Dashboard":
      default:
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
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
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
                      {bookingsSummary?.Pending || 0} pending confirmation
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

        <div className="border-t pt-4 mt-auto">
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

        <div className="border-t pt-4 mt-auto">
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
            <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {user.role.name}
            </span>
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
