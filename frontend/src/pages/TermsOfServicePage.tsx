import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-8">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>
        <div className="mt-8 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Reservation & Booking</h2>
            <p>All reservations are subject to availability. A valid government-issued photo ID and credit/debit card are required at check-in. The person making the reservation must be at least 18 years of age.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Payment</h2>
            <p>Full payment is required at the time of booking for non-refundable rates. For standard rates, a deposit may be required with the remaining balance due at check-in. We accept major credit cards, debit cards, and mobile banking.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Guest Conduct</h2>
            <p>Guests are expected to behave respectfully towards staff and other guests. The resort reserves the right to refuse service or ask any guest to leave without refund for disruptive behaviour, exceeding maximum occupancy, or violating resort policies.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Property Damage</h2>
            <p>Guests are responsible for any damage caused to the resort property during their stay. A damages deposit may be requested at check-in and will be refunded upon satisfactory inspection.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Liability</h2>
            <p>StayEase Resort is not liable for loss, theft, or damage to personal belongings. Guests are encouraged to use the in-room safe for valuables. The resort is not responsible for injuries sustained during activities or use of facilities.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Modifications</h2>
            <p>We reserve the right to update these terms at any time. Changes will be posted on this page with an updated revision date. Continued use of our services constitutes acceptance of the modified terms.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
