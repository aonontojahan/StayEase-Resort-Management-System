import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

const sections = [
  {
    title: "Information We Collect",
    content: "We collect personal information you provide directly, such as your name, email address, phone number, payment details, and any preferences you share during the booking process. We also automatically collect certain data when you visit our website, including your IP address, browser type, device information, and browsing behaviour through cookies and similar technologies.",
  },
  {
    title: "How We Use Your Information",
    content: "Your information is used to process and manage your bookings, communicate with you about your reservation, improve our services, send promotional offers (with your consent), and comply with legal obligations.",
  },
  {
    title: "Data Sharing and Disclosure",
    content: "We do not sell your personal information to third parties. We may share your data with trusted service providers who assist us in operating our website and processing payments, subject to strict confidentiality agreements.",
  },
  {
    title: "Security",
    content: "We implement industry-standard security measures including SSL encryption, firewalls, and secure payment gateways to protect your personal information against unauthorised access or disclosure.",
  },
  {
    title: "Your Rights",
    content: "You have the right to access, correct, or delete your personal data held by you. You may also opt out of marketing communications at any time by contacting us or using the unsubscribe link in our emails.",
  },
  {
    title: "Contact Us",
    content: 'If you have any questions about this Privacy Policy, please contact us at privacy@stayease.com or call +880 1234-567890.',
  },
]

export const PrivacyPage: React.FC = () => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 self-start">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{section.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
