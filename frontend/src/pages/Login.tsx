import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/store/AuthContext"
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldAlert } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    try {
      await login(data)
      navigate("/dashboard")
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Invalid email or password. Please try again."
      setServerError(errMsg)
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-background">
      {/* Left side: Premium Branding & Visual Backdrop (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-emerald-950 p-12 text-white lg:flex overflow-hidden">
        {/* Background Image with overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1542314831-c6a4d1409362?q=80&w=2070&auto=format&fit=crop" 
            alt="Luxury Resort" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent"></div>
        </div>
        
        {/* Header Logo */}
        <div className="relative z-10 flex items-center gap-2 text-xl font-bold tracking-tight">
          <svg className="h-6 w-6 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="font-serif text-2xl">StayEase <span className="text-emerald-200/75 font-sans font-normal text-sm ml-2">Resort System</span></span>
        </div>

        {/* Content Showcase */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl font-serif tracking-wide leading-tight lg:text-5xl text-yellow-50">
            Streamlining resort hospitality, globally.
          </h1>
          <p className="text-lg text-emerald-100/90 font-light leading-relaxed">
            A comprehensive, cloud-native platform for reservations, guest profiling, payments, housekeeping, and real-time operations.
          </p>
          <div className="flex gap-4 items-center pt-2">
            <div className="flex -space-x-2">
              <span className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-950 bg-emerald-800 flex items-center justify-center text-xs font-semibold text-yellow-500">SA</span>
              <span className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-950 bg-emerald-800 flex items-center justify-center text-xs font-semibold text-yellow-500">RO</span>
              <span className="inline-block h-8 w-8 rounded-full ring-2 ring-emerald-950 bg-emerald-800 flex items-center justify-center text-xs font-semibold text-yellow-500">MG</span>
            </div>
            <span className="text-sm text-emerald-200">Trusted by top-tier hotel managers.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-emerald-400">
          © {new Date().getFullYear()} StayEase Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          
          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Sign in to StayEase</h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to manage operations.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Server side error alert */}
            {serverError && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

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
                  placeholder="name@resort.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                  Verifying Identity...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Bottom link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have a guest account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline hover:text-primary/90">
              Register as Guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
