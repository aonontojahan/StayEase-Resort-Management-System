import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export const CancellationPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-[40vh] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1742106850925-7aeec2fb1ce9?q=80&w=2070&auto=format&fit=crop"
          alt="Cancellation Policy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
              Cancellation Policy
            </h1>
            <div className="mt-3 mx-auto w-16 h-0.5 bg-emerald-400 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-6">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
          </Link>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-sm text-gray-600 leading-relaxed space-y-4">
            <p><strong>Last updated:</strong> March 2024</p>
            <p>
              We understand that plans may change. Below is our cancellation policy for direct bookings made through StayEase Sylhet Resort.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Standard Cancellation</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Free cancellation</strong> up to 7 days before check-in — full refund.</li>
              <li><strong>50% refund</strong> for cancellations made between 3 and 7 days before check-in.</li>
              <li><strong>No refund</strong> for cancellations made less than 3 days before check-in.</li>
            </ul>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Early Check-Out</h3>
            <p>
              If you check out before your scheduled departure date, the remaining nights will be charged at 50% of the booking value.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">No-Show Policy</h3>
            <p>
              If you do not arrive on the scheduled check-in date and have not notified us, the full booking amount will be charged and the reservation will be cancelled.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Special Events &amp; Peak Season</h3>
            <p>
              Bookings made during public holidays, New Year, or special events are subject to a separate cancellation policy. Please refer to your booking confirmation for details.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">How to Cancel</h3>
            <p>
              You can cancel your booking through your account dashboard on our website. Alternatively, contact us at <span className="text-emerald-600">support@stayease.com</span> or call +880 1234-567890.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
