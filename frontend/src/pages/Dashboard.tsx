import React, { useState, useEffect } from "react"
import { useAuth } from "@/store/AuthContext"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { OccupancyReport, BookingsSummary } from "@/types/api"
import { 
  LogOut, User, Mail, Shield, CheckCircle, Clock, Key, Loader2, 
  Home, BookOpen, BedDouble, Users, Sparkles, CreditCard, Settings as SettingsIcon, Menu, X
} from "lucide-react"

import { StaffManagement } from "@/components/StaffManagement"
import { RoomsPage } from "@/pages/RoomsPage"
import { BookingsPage } from "@/pages/BookingsPage"
import { GuestsPage } from "@/pages/GuestsPage"
import { HousekeepingPage } from "@/pages/HousekeepingPage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { MyBookingsPage } from "@/pages/MyBookingsPage"
import { BrowseRoomsPage } from "@/pages/BrowseRoomsPage"
import { PaymentHistoryPage } from "@/pages/PaymentHistoryPage"
import { HousekeepingTasksPage } from "@/pages/HousekeepingTasksPage"

const passwordSchema = z.object({
  old_password: z.string().min(1, "Old password is required"),
  new_password: z.string().min(6, "New password must be at least 6 characters"),
})

type PasswordFormValues = z.infer<typeof passwordSchema>

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("Dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Live stats
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null)
  const [bookingsSummary, setBookingsSummary] = useState<BookingsSummary | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: "", new_password: "" },
  })

  useEffect(() => {
    if (user && activeTab === "Dashboard" && ["Resort Owner", "Manager", "Accountant"].includes(user.role.name)) {
      api.get<OccupancyReport>("/reports/occupancy").then(res => setOccupancy(res.data)).catch(() => {})
      api.get<BookingsSummary>("/reports/bookings-summary").then(res => setBookingsSummary(res.data)).catch(() => {})
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

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await api.post("/auth/change-password", data)
      setSuccessMsg("Password updated successfully!")
      reset()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update password.")
    }
  }

  if (!user) return null

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const NavLinks = () => (
    <>
      <button onClick={() => handleTabChange("Dashboard")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
        <Home className="h-4 w-4" />
        <span>Dashboard</span>
      </button>
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
          <button onClick={() => handleTabChange("Settings")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
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
        </>
      ) : user.role.name === "Housekeeping" ? (
        <>
          <button onClick={() => handleTabChange("Housekeeping Tasks")} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === "Housekeeping Tasks" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Sparkles className="h-4 w-4" />
            <span>Housekeeping Tasks</span>
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
      case "Payments": return <PaymentsPage />
      case "Settings": return <SettingsPage />
      case "My Bookings": return <MyBookingsPage />
      case "Browse Rooms": return <BrowseRoomsPage />
      case "Payment History": return <PaymentHistoryPage />
      case "Housekeeping Tasks": return <HousekeepingTasksPage />
      case "Dashboard":
      default:
        return (
          <>
            {/* Welcome Panel */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl"></div>
              <div className="absolute left-1/2 top-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 space-y-2">
                <h2 className="text-2xl font-bold md:text-3xl font-serif tracking-wide">Welcome back, {user.full_name}!</h2>
                <p className="text-emerald-100 text-sm md:text-base max-w-xl">
                  StayEase session active. Here is an overview of your resort operations and account settings.
                </p>
              </div>
            </div>

            {/* Status widgets row - Only for analytics roles */}
            {["Resort Owner", "Manager", "Accountant"].includes(user.role.name) && occupancy && bookingsSummary && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupancy Rate</p>
                  <h3 className="text-2xl font-bold">{occupancy.occupancy_rate}%</h3>
                  <p className="text-xs text-muted-foreground font-medium">{occupancy.occupied} / {occupancy.total_rooms} rooms occupied</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Bookings</p>
                  <h3 className="text-2xl font-bold">{bookingsSummary.Total}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{bookingsSummary.Pending} pending · {bookingsSummary.Confirmed} confirmed</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Status</p>
                  <h3 className="text-2xl font-bold text-green-600 flex items-center gap-1.5">
                    <CheckCircle className="h-5 w-5" /> Active
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">All services operational</p>
                </div>
              </div>
            )}

            {/* Detailed Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Profile Attributes Card */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Account Profile</h3>
                  <p className="text-sm text-muted-foreground">Detailed database system metadata.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                      <p className="text-sm font-semibold truncate">{user.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b pb-3">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                      <p className="text-sm font-semibold truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b pb-3">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Security Role</p>
                      <p className="text-sm font-semibold flex items-center gap-1">
                        {user.role.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b pb-3">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Registered On</p>
                      <p className="text-sm font-semibold">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Update Password</h3>
                  <p className="text-sm text-muted-foreground">Manage and secure your credentials.</p>
                </div>

                <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
                  {successMsg && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700">
                      {successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Old Password</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Key className="h-3.5 w-3.5" />
                      </div>
                      <input
                        {...register("old_password")}
                        type="password"
                        className={`block w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-xs shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          errors.old_password ? "border-destructive focus:ring-destructive" : "border-border"
                        }`}
                        placeholder="Current password"
                      />
                    </div>
                    {errors.old_password && (
                      <p className="text-[10px] text-destructive font-medium">{errors.old_password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Key className="h-3.5 w-3.5" />
                      </div>
                      <input
                        {...register("new_password")}
                        type="password"
                        className={`block w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-xs shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          errors.new_password ? "border-destructive focus:ring-destructive" : "border-border"
                        }`}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    {errors.new_password && (
                      <p className="text-[10px] text-destructive font-medium">{errors.new_password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Password"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )
    }
  }

  return (
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

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold truncate max-w-[120px]">{user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold truncate max-w-[120px]">{user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto w-full">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 lg:justify-end shrink-0">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {user.role.name}
            </span>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-all focus:outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 space-y-6 w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
