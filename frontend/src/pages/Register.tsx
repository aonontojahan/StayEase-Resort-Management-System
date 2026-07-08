import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/store/AuthContext"
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldAlert, UserPlus } from "lucide-react"

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone_number: z.string().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export const Register: React.FC = () => {
  const { register: registerGuest } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", full_name: "", phone_number: "", password: "" },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null)
    // Filter empty string for optional phone_number
    const payload = {
      ...data,
      phone_number: data.phone_number || undefined,
    }
    try {
      await registerGuest(payload)
      navigate("/dashboard")
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Registration failed. Please try again."
      setServerError(errMsg)
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-background">
      {/* Left side: Premium Branding & Visual Backdrop (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex overflow-hidden">
        {/* Radial ambient glow */}
        <div className="absolute -left-1/4 -top-1/4 h-[70%] w-[70%] rounded-full bg-primary/20 blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-1/4 -right-1/4 h-[70%] w-[70%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>

        {/* Header Logo */}
        <div className="relative z-10 flex items-center gap-2 text-xl font-bold tracking-tight">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>StayEase <span className="text-primary-foreground/75 font-normal text-sm">Resort System</span></span>
        </div>

        {/* Content Showcase */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight lg:text-5xl">
            Begin your seamless stay journey today.
          </h1>
          <p className="text-lg text-slate-300">
            Create an guest account to access online bookings, download invoices, review billing history, and communicate directly with resort operators.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} StayEase Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          
          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Create your Account</h2>
            <p className="text-sm text-muted-foreground">
              Register as a Guest to unlock bookings.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Server error alert */}
            {serverError && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                </div>
                <input
                  {...register("full_name")}
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-3 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.full_name ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-3 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.email ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                  }`}
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <label htmlFor="phone_number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  {...register("phone_number")}
                  id="phone_number"
                  type="tel"
                  autoComplete="tel"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-3 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 border-border`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              {errors.phone_number && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border bg-card py-2.5 pl-10 pr-10 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.password ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] duration-150"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Bottom link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline hover:text-primary/90">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
