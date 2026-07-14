import React from "react"

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral"

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-muted text-muted-foreground",
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANT_STYLES[variant]} ${className}`}
  >
    {children}
  </span>
)

export const STATUS_BADGE: Record<string, BadgeVariant> = {
  Available: "success",
  Occupied: "warning",
  Maintenance: "danger",
  Cleaning: "info",
  Cleaned: "success",
  Pending: "warning",
  Confirmed: "info",
  CheckedIn: "default",
  CheckedOut: "neutral",
  Cancelled: "danger",
  Active: "success",
  Inactive: "neutral",
  Paid: "success",
  Unpaid: "warning",
  Overdue: "danger",
  Completed: "success",
  Refunded: "info",
  Failed: "danger",
}

export const statusBadgeVariant = (status: string): BadgeVariant =>
  STATUS_BADGE[status] || "neutral"
