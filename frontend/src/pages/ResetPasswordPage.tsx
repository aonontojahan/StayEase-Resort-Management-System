import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Lock, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react"
import { useToast } from "@/components/Toast"
import { api } from "@/services/api"

const resetSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const { toastSuccess, toastError } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  })

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      toastError("Invalid or missing reset token")
      return
    }
    setServerError(null)
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: data.new_password,
      })
      toastSuccess("Password reset successfully. Please sign in.")
      navigate("/login")
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to reset password. The link may have expired."
      setServerError(msg)
      toastError(msg)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-background">
        <div className="mx-auto w-full max-w-md space-y-4 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-extrabold tracking-tight">Invalid Reset Link</h2>
          <p className="text-sm text-muted-foreground">
            This reset link is missing or invalid. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/95"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-screen bg-background">
      {/* Left side: Branding (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-emerald-950 p-12 text-white lg:flex overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-c6a4d1409362?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury Resort"
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent"></div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xl font-bold tracking-tight">
          <svg className="h-6 w-6 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="font-serif text-2xl">StayEase <span className="text-emerald-200/75 font-sans font-normal text-sm ml-2">Resort System</span></span>
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl font-serif tracking-wide leading-tight lg:text-5xl text-yellow-50">
            Choose a new password
          </h1>
          <p className="text-lg text-emerald-100/90 font-light leading-relaxed">
            Make sure it's at least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>

        <div className="relative z-10 text-xs text-emerald-400">
          &copy; {new Date().getFullYear()} StayEase Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Reset your password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="new_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("new_password")}
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-10 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.new_password ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                  }`}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.new_password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("confirm_password")}
                  id="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-10 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.confirm_password ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                  }`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] duration-150"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline hover:text-primary/90">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
