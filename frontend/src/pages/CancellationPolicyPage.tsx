import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const sections = [
  {
    title: "Standard Rate Cancellation",
    content: "Cancellations made 7 or more days before check-in — full refund. Cancellations made 3–6 days before check-in — 50% refund. Cancellations made less than 3 days before check-in — no refund. No-shows will be charged the full amount of the booking.",
  },
  {
    title: "Non-Refundable Rates",
    content: "Bookings made under non-refundable rate plans are not eligible for cancellation or modification. The full amount will be charged at the time of booking and is non-refundable under any circumstances.",
  },
  {
    title: "Early Departure",
    content: "Guests who check out before their scheduled departure date will be charged for the full duration of the original booking. No refunds will be issued for early departure.",
  },
  {
    title: "Modifications",
    content: "Date modifications are subject to availability and may incur additional charges. Modification requests must be submitted at least 3 days before the original check-in date. Rate differences may apply.",
  },
  {
    title: "Group & Event Bookings",
    content: "Separate cancellation terms apply for group bookings (5+ rooms), weddings, and events. Please refer to your event contract or contact us directly for details.",
  },
  {
    title: "Force Majeure",
    content: "In the event of natural disasters, government-mandated closures, or other circumstances beyond our control, we will work with affected guests to reschedule bookings or provide partial refunds on a case-by-case basis.",
  },
  {
    title: "How to Cancel",
    content: "Cancellations can be made through your account dashboard on our website. For assistance, email us at aonontojahan@gmail.com.",
  },
]

export const CancellationPolicyPage: React.FC = () => {
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
