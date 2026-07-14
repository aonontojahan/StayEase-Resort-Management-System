import React, { useState } from "react"
import { Link } from "react-router-dom"
import {
  Menu, X, ChevronRight, BedDouble, Sparkles, Waves, Wifi,
  Coffee, Dumbbell, Car, Users, Star, Shield, Mail, Phone, MapPin,
  Facebook, Instagram, Twitter, Linkedin, ArrowUpRight,
} from "lucide-react"

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Rooms & Suites", href: "#services" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
]

const stats = [
  { label: "Luxury Rooms", value: "120+" },
  { label: "Happy Guests", value: "50K+" },
  { label: "Years of Service", value: "15+" },
  { label: "5-Star Reviews", value: "4.9" },
]

const features = [
  { icon: BedDouble, title: "Premium Rooms", description: "Deluxe suites with panoramic views, king-sized beds, and premium linens for ultimate comfort." },
  { icon: Sparkles, title: "Spa & Wellness", description: "Full-service spa with traditional treatments, sauna, steam room, and professional therapists." },
  { icon: Waves, title: "Infinity Pool", description: "Temperature-controlled infinity pool overlooking the bay with dedicated cabana service." },
  { icon: Coffee, title: "Fine Dining", description: "Award-winning restaurant serving local and international cuisine prepared by master chefs." },
  { icon: Dumbbell, title: "Fitness Center", description: "State-of-the-art gym with personal trainers, yoga studio, and wellness programs." },
  { icon: Car, title: "Concierge Service", description: "24/7 concierge for transportation, tour bookings, and any special requests." },
  { icon: Wifi, title: "High-Speed WiFi", description: "Complimentary gigabit internet throughout the property with dedicated work spaces." },
  { icon: Shield, title: "Secure Booking", description: "SSL-encrypted payments with full PCI compliance and instant booking confirmation." },
]

const testimonials = [
  { name: "Sarah Ahmed", location: "Dhaka, Bangladesh", text: "An absolutely breathtaking experience. The staff anticipated our every need and the ocean-view suite was immaculate.", rating: 5 },
  { name: "James Mitchell", location: "London, UK", text: "We spent our honeymoon here and it exceeded every expectation. The private dinner on the beach was unforgettable.", rating: 5 },
  { name: "Aisha Rahman", location: "Kuala Lumpur, Malaysia", text: "The perfect family getaway. The kids' club kept our children entertained while we enjoyed the spa. Will definitely return.", rating: 5 },
]

const footerSections = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "#hero" },
      { label: "About Us", href: "#about" },
      { label: "Rooms & Suites", href: "#services" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Spa & Wellness", href: "#services" },
      { label: "Fine Dining", href: "#services" },
      { label: "Event Planning", href: "#services" },
      { label: "Concierge", href: "#services" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cancellation Policy", href: "#" },
    ],
  },
]

export const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── NAVBAR ───────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100/50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              StayEase <span className="text-emerald-600 font-normal">Resort</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link to="/login"
              className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50 hover:border-emerald-300"
            >
              Sign In
            </Link>
            <Link to="/register"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
            >
              Register
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-gray-600 hover:bg-emerald-50 md:hidden">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="border-t border-emerald-100 bg-white px-4 pb-4 pt-2 md:hidden">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
              <Link to="/login" className="flex-1 rounded-lg border border-emerald-200 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO SECTION ─────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2080&auto=format&fit=crop"
            alt="Luxury Resort" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/80 to-emerald-950/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-200 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4" /> Luxury Redefined Since 2010
            </div>
            <h1 className="text-4xl font-serif font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
              Escape to{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-yellow-200 bg-clip-text text-transparent">
                Paradise
              </span>
              <br />Where Every Stay Matters
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-emerald-100/85">
              Experience world-class hospitality at StayEase Resort. From luxurious accommodations to exceptional dining and rejuvenating spa treatments — your perfect getaway awaits.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl active:scale-[0.98]"
              >
                Book Your Stay <ChevronRight className="h-4 w-4" />
              </Link>
              <button onClick={() => scrollTo("#about")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Explore More
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-emerald-100/70">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">Secure Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">4.9 Average Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">50K+ Happy Guests</span>
              </div>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="h-10 w-6 rounded-full border-2 border-white/40 flex items-start justify-center pt-2">
            <div className="h-2 w-1 rounded-full bg-white/70" />
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─────────────────────────────────────────── */}
      <section className="relative -mt-16 z-20 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-emerald-200 shadow-xl md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white px-6 py-7 text-center transition-colors hover:bg-emerald-50/80">
              <p className="text-3xl font-bold text-emerald-700">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ABOUT SECTION ────────────────────────────────────── */}
      <section id="about" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop"
                  alt="Resort pool area" className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl bg-white p-5 shadow-lg hidden sm:block">
                <p className="text-3xl font-bold text-emerald-600">15+</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Years of Excellence</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                <Sparkles className="h-4 w-4" /> About StayEase
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A Legacy of <span className="text-emerald-600">Luxury</span> Hospitality
              </h2>
              <p className="text-base leading-relaxed text-gray-600">
                Nestled along the pristine coastline, StayEase Resort has been the epitome of luxury hospitality for over a decade. Our award-winning property combines breathtaking natural beauty with world-class amenities and impeccable service.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                From our meticulously designed rooms and suites to our gourmet dining experiences and rejuvenating spa, every aspect of your stay is crafted to create unforgettable memories. Our dedicated team of hospitality professionals ensures that your every need is anticipated and exceeded.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {["Award Winning", "Eco Certified", "24/7 Service", "Beachfront"].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES / ROOMS SECTION ─────────────────────────── */}
      <section id="services" className="bg-emerald-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              <BedDouble className="h-4 w-4" /> World-Class Amenities
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything You Need for the Perfect Stay
            </h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-200/75">
              From luxurious accommodations to exceptional amenities, every detail is designed for your comfort and enjoyment.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title}
                className="group rounded-xl border border-emerald-800/60 bg-emerald-900/40 p-6 transition-all hover:border-emerald-600/60 hover:bg-emerald-900/60 hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30 group-hover:text-emerald-300 transition-all">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-200/65">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section id="testimonials" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <Star className="h-4 w-4" /> Guest Testimonials
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              What Our <span className="text-emerald-600">Guests</span> Say
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex gap-1 text-yellow-400 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-600 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-800 py-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready for an Unforgettable Experience?</h2>
          <p className="mt-4 text-lg text-emerald-100/85">Book your stay today and discover the StayEase difference.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 hover:shadow-xl active:scale-[0.98]"
            >
              Book Now <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CONTACT SECTION ──────────────────────────────────── */}
      <section id="contact" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <Mail className="h-4 w-4" /> Get In Touch
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              We'd Love to <span className="text-emerald-600">Hear</span> From You
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Whether you have a question about bookings, special requests, or just want to say hello — our team is here for you.
            </p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold">Address</h3>
              <p className="mt-1.5 text-sm text-gray-600">123 Beachfront Avenue<br />Cox's Bazar, Bangladesh</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold">Phone</h3>
              <p className="mt-1.5 text-sm text-gray-600">+880 1700-000000<br />+880 1700-000001</p>
            </div>
            <div className="rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold">Email</h3>
              <p className="mt-1.5 text-sm text-gray-600">reservations@stayease.com<br />support@stayease.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight">
                  StayEase <span className="text-emerald-600 font-normal">Resort</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
                Experience world-class hospitality at StayEase Resort. Luxury accommodations, exceptional dining, and unforgettable memories await.
              </p>
              <div className="mt-5 flex gap-3">
                {[
                  { icon: Facebook, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Twitter, href: "#" },
                  { icon: Linkedin, href: "#" },
                ].map((s) => (
                  <a key={s.href} href={s.href}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900">{section.title}</h4>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <button onClick={() => scrollTo(link.href)}
                        className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} StayEase Resort. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Made with care in Bangladesh
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
