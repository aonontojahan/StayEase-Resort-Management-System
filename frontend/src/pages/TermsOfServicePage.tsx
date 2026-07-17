import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const sections = [
  {
    title: "Reservation & Booking",
    content: "All reservations are subject to availability. A valid government-issued photo ID and credit/debit card are required at check-in. The person making the reservation must be at least 18 years of age.",
  },
  {
    title: "Payment",
    content: "Full payment is required at the time of booking for non-refundable rates. For standard rates, a deposit may be required with the remaining balance due at check-in. We accept major credit cards, debit cards, and mobile banking.",
  },
  {
    title: "Guest Conduct",
    content: "Guests are expected to behave respectfully towards staff and other guests. The resort reserves the right to refuse service or ask any guest to leave without refund for disruptive behaviour, exceeding maximum occupancy, or violating resort policies.",
  },
  {
    title: "Property Damage",
    content: "Guests are responsible for any damage caused to the resort property during their stay. A damages deposit may be requested at check-in and will be refunded upon satisfactory inspection.",
  },
  {
    title: "Liability",
    content: "StayEase Resort is not liable for loss, theft, or damage to personal belongings. Guests are encouraged to use the in-room safe for valuables. The resort is not responsible for injuries sustained during activities or use of facilities.",
  },
  {
    title: "Modifications",
    content: "We reserve the right to update these terms at any time. Changes will be posted on this page with an updated revision date. Continued use of our services constitutes acceptance of the modified terms.",
  },
]

export const TermsOfServicePage: React.FC = () => {
  const [openSet, setOpenSet] = React.useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

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
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-6">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Home
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((section, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden transition-all self-start">
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex-1">{section.title}</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ml-3 ${openSet.has(i) ? "rotate-90" : ""}`} />
                </button>
                {openSet.has(i) && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{section.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
