import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, User, Mail, Phone, Save, Loader2, Lock, Key, Shield, Eye, EyeOff, CheckCircle } from "lucide-react"
import { useAuth } from "@/store/AuthContext"
import { api } from "@/services/api"

// ─── Edit Profile Modal ────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onClose }) => {
  const { user, updateUser } = useAuth()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      phone_number: user?.phone_number || "",
    },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await api.patch("/auth/me", data)
      updateUser(res.data)
      setSuccessMsg("Profile updated successfully!")
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update profile.")
    }
  }

  if (!open || !user) return null

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-500/10 via-primary/5 to-transparent px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center font-bold text-primary text-lg border border-primary/20 shadow-inner">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Update your personal information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Read-only email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Email Address
            </label>
            <input
              readOnly
              value={user.email}
              className="block w-full rounded-xl border bg-muted py-2.5 px-3.5 text-sm opacity-60 cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" /> Full Name
            </label>
            <input
              {...register("full_name")}
              type="text"
              className={`block w-full rounded-xl border bg-background py-2.5 px-3.5 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.full_name ? "border-destructive focus:ring-destructive/20" : "border-border"
              }`}
              placeholder="Your full name"
            />
            {errors.full_name && (
              <p className="text-[10px] text-destructive font-medium">{errors.full_name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone Number
            </label>
            <input
              {...register("phone_number")}
              type="tel"
              className="block w-full rounded-xl border border-border bg-background py-2.5 px-3.5 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3.5 py-2.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Role:</span>
            <span className="text-xs font-semibold text-foreground">{user.role.name}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-secondary/40 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Security Modal ─────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(6, "New password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

interface SecurityModalProps {
  open: boolean
  onClose: () => void
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ open, onClose }) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: "", new_password: "", confirm_password: "" },
  })

  const onSubmit = async (data: PasswordFormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await api.post("/auth/change-password", {
        old_password: data.old_password,
        new_password: data.new_password,
      })
      setSuccessMsg("Password updated successfully!")
      reset()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update password.")
    }
  }

  if (!open) return null

  const PasswordField = ({
    id,
    label,
    placeholder,
    fieldKey,
    show,
    toggleShow,
    error,
  }: {
    id: string
    label: string
    placeholder: string
    fieldKey: keyof PasswordFormValues
    show: boolean
    toggleShow: () => void
    error?: string
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Key className="h-3 w-3" /> {label}
      </label>
      <div className="relative">
        <input
          id={id}
          {...register(fieldKey)}
          type={show ? "text" : "password"}
          className={`block w-full rounded-xl border bg-background py-2.5 pl-3.5 pr-10 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            error ? "border-destructive focus:ring-destructive/20" : "border-border"
          }`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Security Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Update your password & security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          <PasswordField
            id="old-password"
            label="Current Password"
            placeholder="Enter your current password"
            fieldKey="old_password"
            show={showOld}
            toggleShow={() => setShowOld((v) => !v)}
            error={errors.old_password?.message}
          />
          <PasswordField
            id="new-password"
            label="New Password"
            placeholder="At least 6 characters"
            fieldKey="new_password"
            show={showNew}
            toggleShow={() => setShowNew((v) => !v)}
            error={errors.new_password?.message}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            placeholder="Repeat new password"
            fieldKey="confirm_password"
            show={showConfirm}
            toggleShow={() => setShowConfirm((v) => !v)}
            error={errors.confirm_password?.message}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-secondary/40 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
