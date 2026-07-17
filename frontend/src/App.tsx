import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/store/AuthContext"
import { ToastProvider } from "@/components/Toast"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ProtectedRoute, PublicRoute } from "@/components/RouteGuards"
import { LandingPage } from "@/pages/LandingPage"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { Dashboard } from "@/pages/Dashboard"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { ResetPasswordPage } from "@/pages/ResetPasswordPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { FAQPage } from "@/pages/FAQPage"
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage"
import { TermsOfServicePage } from "@/pages/TermsOfServicePage"
import { CancellationPolicyPage } from "@/pages/CancellationPolicyPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
                {/* Public guest-only routes */}
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>

                {/* Protected dashboard routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>

                {/* Public pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/cancellation-policy" element={<CancellationPolicyPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
