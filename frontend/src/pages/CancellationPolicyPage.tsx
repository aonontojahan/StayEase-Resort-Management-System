import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export const CancellationPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-8">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Cancellation Policy</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>
        <div className="mt-8 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Standard Rate Cancellation</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Cancellations made 7 or more days before check-in — full refund.</li>
              <li>Cancellations made 3–6 days before check-in — 50% refund.</li>
              <li>Cancellations made less than 3 days before check-in — no refund.</li>
              <li>No-shows will be charged the full amount of the booking.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Non-Refundable Rates</h2>
            <p>Bookings made under non-refundable rate plans are not eligible for cancellation or modification. The full amount will be charged at the time of booking and is non-refundable under any circumstances.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Early Departure</h2>
            <p>Guests who check out before their scheduled departure date will be charged for the full duration of the original booking. No refunds will be issued for early departure.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Modifications</h2>
            <p>Date modifications are subject to availability and may incur additional charges. Modification requests must be submitted at least 3 days before the original check-in date. Rate differences may apply.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Group & Event Bookings</h2>
            <p>Separate cancellation terms apply for group bookings (5+ rooms), weddings, and events. Please refer to your event contract or contact us directly for details.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Force Majeure</h2>
            <p>In the event of natural disasters, government-mandated closures, or other circumstances beyond our control, we will work with affected guests to reschedule bookings or provide partial refunds on a case-by-case basis.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">How to Cancel</h2>
            <p>Cancellations can be made through your account dashboard on our website. For assistance, email us at <a href="mailto:aonontojahan@gmail.com" className="text-emerald-600 hover:text-emerald-700">aonontojahan@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
