import React from "react"
import { useAuth } from "@/store/AuthContext"
import { Settings, Shield, Bell, User as UserIcon } from "lucide-react"

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your system preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Settings */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xl">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user.role.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <div className="mt-1 flex items-center gap-2">
                <input readOnly value={user.email} className="block w-full rounded-lg border bg-muted py-2 px-3 text-sm opacity-70 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
              <div className="mt-1">
                <input readOnly value={user.phone_number || "Not provided"} className="block w-full rounded-lg border bg-muted py-2 px-3 text-sm opacity-70 cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Shield className="h-4 w-4" /> Security</h3>
            <p className="text-xs text-muted-foreground">Password changes are handled on the main Dashboard page under "Update Password".</p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 opacity-50 cursor-not-allowed">
            <h3 className="font-bold flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</h3>
            <p className="text-xs text-muted-foreground">Notification preferences coming soon in a future update.</p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 opacity-50 cursor-not-allowed">
            <h3 className="font-bold flex items-center gap-2"><UserIcon className="h-4 w-4" /> Edit Profile</h3>
            <p className="text-xs text-muted-foreground">Profile editing coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
