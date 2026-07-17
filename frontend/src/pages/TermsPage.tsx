import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-[40vh] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1742106850925-7aeec2fb1ce9?q=80&w=2070&auto=format&fit=crop"
          alt="Terms of Service" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
              Terms of Service
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
              Welcome to StayEase Sylhet Resort. By accessing our website or making a reservation, you agree to be bound by the following terms and conditions.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Booking and Reservation</h3>
            <p>
              All bookings are subject to availability and confirmation. A valid government-issued ID and credit/debit card are required at the time of check-in. We reserve the right to refuse service to anyone.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Payment Terms</h3>
            <p>
              Full payment or a deposit may be required to secure a reservation. Prices are quoted in BDT and include applicable taxes unless stated otherwise. We accept major credit cards, debit cards, and mobile payment methods.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Guest Responsibilities</h3>
            <p>
              Guests are responsible for any damage caused to resort property during their stay. Smoking is prohibited in all indoor areas. Quiet hours are observed from 10:00 PM to 7:00 AM.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Liability</h3>
            <p>
              StayEase Sylhet Resort shall not be held liable for any loss, damage, or injury sustained during your stay, except where caused by our negligence. We recommend guests obtain appropriate travel insurance.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Modification of Terms</h3>
            <p>
              We reserve the right to update these terms at any time. Changes will be posted on this page, and continued use of our services after such changes constitutes acceptance of the new terms.
            </p>
            <h3 className="text-base font-semibold text-gray-900 pt-2">Contact</h3>
            <p>
              For questions regarding these terms, please contact us at <span className="text-emerald-600">support@stayease.com</span> or call +880 1234-567890.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
