import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const sections = [
  {
    title: "Information We Collect",
    content: "We collect personal information you provide when making a reservation, including your name, email address, phone number, payment details, and any special requests. We also collect non-personal information such as browser type, IP address, and page visits to improve our services.",
  },
  {
    title: "How We Use Your Information",
    content: "Your information is used to process bookings, communicate with you about your stay, send promotional offers (with your consent), improve our services, and comply with legal obligations.",
  },
  {
    title: "Data Protection",
    content: "We implement industry-standard security measures to protect your personal data. All payment transactions are encrypted using SSL technology. We do not store full credit card details on our servers.",
  },
  {
    title: "Third-Party Sharing",
    content: "We do not sell, trade, or rent your personal information to third parties. We may share necessary information with trusted partners (payment processors, travel agents) solely for booking fulfilment.",
  },
  {
    title: "Cookies",
    content: "Our website uses cookies to enhance your browsing experience. You can control cookie settings through your browser preferences.",
  },
  {
    title: "Contact",
    content: "If you have questions about this privacy policy, please contact us at aonontojahan@gmail.com.",
  },
]

export const PrivacyPolicyPage: React.FC = () => {
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
          alt="Privacy Policy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
              Privacy Policy
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
