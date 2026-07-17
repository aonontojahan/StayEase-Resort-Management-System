import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-8">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>
        <div className="mt-8 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>We collect personal information you provide when making a reservation, including your name, email address, phone number, payment details, and any special requests. We also collect non-personal information such as browser type, IP address, and page visits to improve our services.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>Your information is used to process bookings, communicate with you about your stay, send promotional offers (with your consent), improve our services, and comply with legal obligations.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Data Protection</h2>
            <p>We implement industry-standard security measures to protect your personal data. All payment transactions are encrypted using SSL technology. We do not store full credit card details on our servers.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share necessary information with trusted partners (payment processors, travel agents) solely for booking fulfilment.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Cookies</h2>
            <p>Our website uses cookies to enhance your browsing experience. You can control cookie settings through your browser preferences.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact</h2>
            <p>If you have questions about this privacy policy, please contact us at <a href="mailto:aonontojahan@gmail.com" className="text-emerald-600 hover:text-emerald-700">aonontojahan@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
