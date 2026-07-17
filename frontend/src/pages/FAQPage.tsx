import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const faqs = [
  {
    q: "What are the check-in and check-out times?",
    a: "Check-in is from 2:00 PM and check-out is until 11:00 AM. Early check-in and late check-out are available upon request, subject to availability.",
  },
  {
    q: "Can I cancel or modify my booking?",
    a: "Yes, bookings can be modified or cancelled through your account dashboard. Please refer to our Cancellation Policy for detailed terms and applicable charges.",
  },
  {
    q: "Do you offer airport or railway station transfers?",
    a: "Yes, we provide pickup and drop-off services from Sylhet Osmani International Airport and Sylhet Railway Station at an additional charge. Please mention your travel details during booking.",
  },
  {
    q: "Is breakfast included in the room rate?",
    a: "Complimentary breakfast is included with all direct bookings. Guests who book through third-party platforms should check their booking confirmation for meal inclusions.",
  },
  {
    q: "What dining options are available at the resort?",
    a: "We offer Panorama Restaurant (multi-cuisine), The Tea Lounge (seven-colour tea, coffee, and snacks), and weekly Bonfire & BBQ nights. In-room dining is also available 24/7.",
  },
  {
    q: "Do you have facilities for weddings and events?",
    a: "Yes, we have a dedicated events pavilion that can host weddings, corporate retreats, and private celebrations. Please contact us for customized packages.",
  },
  {
    q: "Is the resort child-friendly?",
    a: "Absolutely. We have a children's pool section, indoor games, and dedicated play areas. Family cottages with two bedrooms are available for guests travelling with children.",
  },
  {
    q: "What activities can guests enjoy at the resort?",
    a: "Guests can enjoy the swimming pool, spa & wellness centre, tea garden tours, hill trekking, bonfire nights, and guided tours to nearby attractions including Madhabkunda and Bichanakandi.",
  },
]

export const FAQPage: React.FC = () => {
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
          alt="FAQ" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
              Frequently Asked Questions
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
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden transition-all self-start">
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex-1">{faq.q}</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ml-3 ${openSet.has(i) ? "rotate-90" : ""}`} />
                </button>
                {openSet.has(i) && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
