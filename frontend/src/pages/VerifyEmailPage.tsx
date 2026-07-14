import React, { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { api } from "@/services/api"

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Missing verification token. Please use the link from your email.")
      return
    }

    const verify = async () => {
      try {
        await api.post("/auth/verify-email", { token })
        setStatus("success")
        setMessage("Your email has been verified successfully!")
      } catch (err: any) {
        setStatus("error")
        setMessage(err.response?.data?.detail || "Verification failed. The link may have expired.")
      }
    }

    verify()
  }, [token])

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
            Email Verification
          </h1>
          <p className="text-lg text-emerald-100/90 font-light leading-relaxed">
            Confirming your identity to unlock full access.
          </p>
        </div>

        <div className="relative z-10 text-xs text-emerald-400">
          &copy; {new Date().getFullYear()} StayEase Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Status */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Email Verification</h2>
            <p className="text-sm text-muted-foreground">
              {status === "verifying"
                ? "Please wait while we verify your email..."
                : status === "success"
                ? "Verification complete"
                : "Verification failed"}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            {status === "verifying" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying...</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-700" />
                </div>
                <p className="text-center text-sm font-medium text-green-800">{message}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/95"
                >
                  Sign in to continue
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-700" />
                </div>
                <p className="text-center text-sm font-medium text-red-800">{message}</p>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-primary hover:underline hover:text-primary/90"
                >
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
