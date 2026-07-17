import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/store/AuthContext"
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldAlert, User } from "lucide-react"

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone_number: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[!@#$%^&*()_\-+=<>?/{}~|]/, "Must contain a special character"),
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
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-emerald-950">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-950/50 to-emerald-950/90" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="flex w-full items-center justify-between px-8 sm:px-12 lg:px-16 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">StayEase <span className="text-emerald-600 font-normal">Resort</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              <Link to="/" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">Home</Link>
              <Link to="/#about" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">About</Link>
              <Link to="/#rooms" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">Rooms</Link>
              <Link to="/#amenities" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">Amenities</Link>
              <Link to="/#testimonials" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">Testimonials</Link>
              <Link to="/#contact" className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700">Contact</Link>
            </div>
            <div className="hidden items-center gap-2.5 md:flex">
              <Link to="/login" className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50">Sign In</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl px-4 pt-24">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0_0_0_/_0.3)] p-5 sm:p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">Create your account</h1>
            <p className="text-xs text-emerald-100/60 mt-1">Register as a guest to unlock resort experiences</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {serverError && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-emerald-200/50">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-200/40">
                  <User className="h-4 w-4" />
                </div>
                <input
                  {...register("full_name")}
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  className={`block w-full rounded-xl border bg-white/5 py-3 pl-10 pr-3.5 text-sm text-white placeholder-emerald-200/30 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.full_name ? "border-red-400/50 focus:border-red-400 focus:ring-red-500/20" : "border-white/10 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-red-400 mt-1 font-medium">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-emerald-200/50">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-200/40">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full rounded-xl border bg-white/5 py-3 pl-10 pr-3.5 text-sm text-white placeholder-emerald-200/30 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.email ? "border-red-400/50 focus:border-red-400 focus:ring-red-500/20" : "border-white/10 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                  }`}
                  placeholder="guest@stayease.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone_number" className="text-xs font-semibold uppercase tracking-wider text-emerald-200/50">
                Phone Number <span className="font-normal normal-case text-emerald-200/30">(Optional)</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-200/40">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  {...register("phone_number")}
                  id="phone_number"
                  type="tel"
                  autoComplete="tel"
                  className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3.5 text-sm text-white placeholder-emerald-200/30 shadow-sm transition-all focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
              {errors.phone_number && (
                <p className="text-xs text-red-400 mt-1 font-medium">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-emerald-200/50">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-200/40">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`block w-full rounded-xl border bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder-emerald-200/30 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.password ? "border-red-400/50 focus:border-red-400 focus:ring-red-500/20" : "border-white/10 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-emerald-200/40 hover:text-emerald-200/70 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-center text-sm text-emerald-200/50">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-emerald-300 hover:text-emerald-200 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
