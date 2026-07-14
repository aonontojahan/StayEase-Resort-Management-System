import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Mail, Loader2, ArrowLeft, ShieldAlert } from "lucide-react"
import { useToast } from "@/components/Toast"
import { api } from "@/services/api"

export const ForgotPasswordPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await api.post("/auth/forgot-password", { email })
      toastSuccess("If that email exists, a reset link has been sent")
      setSubmitted(true)
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Something went wrong. Please try again."
      setError(msg)
      toastError(msg)
    } finally {
      setIsSubmitting(false)
    }
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
            Forgot your password?
          </h1>
          <p className="text-lg text-emerald-100/90 font-light leading-relaxed">
            No worries — we'll send you a link to reset it.
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
            <h2 className="text-3xl font-extrabold tracking-tight">Reset password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and we'll send you a recovery link.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 mx-auto">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-sm text-green-800 font-medium">
                If that email exists, a reset link has been sent. Please check your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline hover:text-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="name@resort.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] duration-150"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline hover:text-primary/90">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
