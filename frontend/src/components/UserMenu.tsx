import React, { useState, useRef, useEffect } from "react"
import {
  LogOut,
  User,
  Shield,
  Settings,
  ChevronUp,
  UserCircle,
  Lock,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/store/AuthContext"

interface UserMenuProps {
  onEditProfile: () => void
  onSecurity: () => void
}

export const UserMenu: React.FC<UserMenuProps> = ({ onEditProfile, onSecurity }) => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSettingsOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  if (!user) return null

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        id="user-menu-trigger"
        onClick={() => {
          setOpen((v) => !v)
          setSettingsOpen(false)
        }}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary/60 transition-all duration-200 group"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center font-bold text-primary-foreground text-sm border-2 border-primary/30 shrink-0 shadow-md">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold truncate text-foreground group-hover:text-primary transition-colors">
            {user.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Popup Menu — positioned above, flush within sidebar bounds */}
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border bg-card shadow-2xl z-50 overflow-hidden animate-slide-up"
          role="menu"
        >
          {/* User info header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center font-bold text-primary-foreground text-sm shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                <span className="inline-flex items-center mt-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">
                  {user.role.name}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1.5">
            {/* Settings with sub-menu */}
            <div>
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60 transition-all duration-150 group"
                onClick={() => setSettingsOpen((v) => !v)}
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Settings className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span>Settings</span>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                    settingsOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Settings sub-items */}
              {settingsOpen && (
                <div className="bg-secondary/30 border-y border-secondary/40 animate-slide-down">
                  <button
                    className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-all duration-150"
                    onClick={() => {
                      onEditProfile()
                      setOpen(false)
                      setSettingsOpen(false)
                    }}
                    role="menuitem"
                  >
                    <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <UserCircle className="h-3 w-3 text-violet-500" />
                    </div>
                    <span className="text-xs font-medium">Edit Profile</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-all duration-150"
                    onClick={() => {
                      onSecurity()
                      setOpen(false)
                      setSettingsOpen(false)
                    }}
                    role="menuitem"
                  >
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Lock className="h-3 w-3 text-amber-500" />
                    </div>
                    <span className="text-xs font-medium">Security</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="mx-3 border-t border-border/50" />

          {/* Logout */}
          <div className="py-1.5">
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-b-2xl"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              role="menuitem"
            >
              <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-3.5 w-3.5 text-destructive" />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
