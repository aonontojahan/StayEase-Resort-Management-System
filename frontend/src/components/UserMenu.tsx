import React, { useState, useRef, useEffect } from "react"
import {
  LogOut,
  ChevronUp,
  UserCircle,
  Key,
} from "lucide-react"
import { useAuth } from "@/store/AuthContext"

interface UserMenuProps {
  onEditProfile: () => void
  onSecurity: () => void
}

export const UserMenu: React.FC<UserMenuProps> = ({ onEditProfile, onSecurity }) => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
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
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                <span className="inline-flex items-center mt-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">
                  {user.role.name}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1 px-1 space-y-0.5">
            {/* Edit Profile */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-all duration-150 rounded-lg"
              onClick={() => {
                setOpen(false)
                onEditProfile()
              }}
              role="menuitem"
            >
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span>Edit Profile Details</span>
            </button>

            {/* Change Password */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-all duration-150 rounded-lg"
              onClick={() => {
                setOpen(false)
                onSecurity()
              }}
              role="menuitem"
            >
              <Key className="h-4 w-4 text-muted-foreground" />
              <span>Change Password</span>
            </button>

            <div className="border-t border-border/50 my-1 mx-1" />

            {/* Sign Out */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-all duration-150 rounded-lg"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              role="menuitem"
            >
              <LogOut className="h-4 w-4 text-destructive" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
