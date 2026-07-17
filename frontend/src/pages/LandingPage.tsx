import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Menu, X, ChevronRight, Users, Star, Shield, Phone, MapPin,
  Facebook, Instagram, Twitter, Linkedin, ArrowUpRight,
  Clock, Check,
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Rooms", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
]

const features = [
  {
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=600&auto=format",
    title: "Swimming Pool",
    description: "Temperature-controlled outdoor pool with children's section, poolside loungers, and shisha lounge.",
    icon: "🌊",
  },
  {
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format",
    title: "Panorama Restaurant",
    description: "Multi-cuisine restaurant serving authentic Sylheti dishes, Bengali, Indian, Chinese, and Continental cuisine.",
    icon: "🍽",
  },
  {
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format",
    title: "The Tea Lounge",
    description: "Premium seven-colour tea, freshly brewed coffee, and light snacks overlooking the lush green hills.",
    icon: "🍵",
  },
  {
    image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=600&auto=format",
    title: "Tea Garden Tours",
    description: "Guided tours of nearby tea estates — witness tea plucking, processing, and enjoy fresh Sylheti tea.",
    icon: "🌿",
  },
  {
    image: "https://images.unsplash.com/photo-1739524540015-bec48533f9a9?q=80&w=600&auto=format",
    title: "Hill Trekking",
    description: "Organized treks to Madhabkunda, Bichanakandi, and the lush forests of Moulovibazar.",
    icon: "⛰",
  },
  {
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=600&auto=format",
    title: "Bonfire & BBQ Nights",
    description: "Weekly live BBQ dinners with bonfire, traditional music, and starlit dining in the garden courtyard.",
    icon: "🔥",
  },
]

const testimonials = [
  { name: "Rafiqul Islam", location: "Dhaka", text: "Waking up to the misty hills and calm lake was surreal. The staff decorated our room with flowers without asking. Truly world-class.", rating: 5 },
  { name: "Sarah Thompson", location: "London, UK", text: "The Presidential Suite was stunning, the food exceptional, and the tea garden tour was a highlight. Rivals any five-star resort I've been to.", rating: 5 },
  { name: "Shahriar & Tanya Khan", location: "Chittagong", text: "Our family loved the pool and bonfire night. The staff were incredibly warm. Coming back every year.", rating: 5 },
  { name: "Priya Nair", location: "Mumbai, India", text: "Spotlessly clean, comfortable bed, garden view — perfect weekend getaway. The seven-colour tea at The Tea Lounge is a must-try.", rating: 5 },
  { name: "Mohammad Ali", location: "Sylhet", text: "Didn't think I needed a staycation — but StayEase changed my mind. The BBQ night by the bonfire was unforgettable.", rating: 5 },
  { name: "Emily & James Cooper", location: "Sydney, Australia", text: "Every staff member knew our names, the food was incredible, the tea garden views breathtaking. A hidden gem in Moulovibazar.", rating: 5 },
]

const footerSections = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "#hero" },
      { label: "Rooms & Suites", href: "#rooms" },
      { label: "Amenities", href: "#amenities" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Experiences",
    links: [
      { label: "Tea Garden Tours", href: "#amenities" },
      { label: "Hill Trekking", href: "#amenities" },
      { label: "Weddings & Events", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ",               href: "/faq" },
      { label: "Privacy Policy",    href: "/privacy-policy" },
      { label: "Terms of Service",  href: "/terms-of-service" },
      { label: "Cancellation Policy", href: "/cancellation-policy" },
    ],
  },
]

const heroImage = "https://images.unsplash.com/photo-1758775150908-45951c9bbe71?q=80&w=2080&auto=format&fit=crop"

interface FetchedRoom {
  image: string
  name: string
  price: string
  size: string
  capacity: string
  description: string
  perks: string[]
}

export const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [roomCount, setRoomCount] = useState<number | null>(null)
  const [dbRoomTypes, setDbRoomTypes] = useState<FetchedRoom[]>([])
  useEffect(() => {
    fetch(`${API_BASE}/rooms/public/count`)
      .then((res) => res.json())
      .then((data) => setRoomCount(data.total_rooms))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/rooms/public/types`)
      .then((res) => res.json())
      .then((data: any[]) => {
        const order = ["Superior Room", "Deluxe Room", "Luxury Suite"]
        const mapped: FetchedRoom[] = data
          .slice()
          .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
          .map((r) => ({
            image: r.image_urls?.[0] || "https://images.unsplash.com/photo-1759148539656-9296426a3f9e?q=80&w=2070&auto=format&fit=crop",
            name: r.name,
            price: `Tk ${Number(r.base_price_per_night).toLocaleString("en-BD")}`,
            size: "",
            capacity: `${r.max_occupancy} Guest${r.max_occupancy > 1 ? "s" : ""}`,
            description: r.description || "",
            perks: r.amenities || [],
          }))
        setDbRoomTypes(mapped)
      })
      .catch(() => {})
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ─── NAVBAR ───────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-white/20 shadow-sm">
        <div className="flex w-full items-center justify-between px-8 sm:px-12 lg:px-16 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">StayEase <span className="text-emerald-600 font-normal">Resort</span></span>
          </Link>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <button key={link.href} onClick={() => scrollTo(link.href)}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-2.5 md:flex">
              <Link to="/login" className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50">Sign In</Link>
              <Link to="/register" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md">Book Now</Link>
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-gray-600 hover:bg-emerald-50 md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-emerald-50"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
              <Link to="/login" className="flex-1 rounded-lg border border-emerald-200 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700">Sign In</Link>
              <Link to="/register" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Book Now</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex flex-col overflow-hidden">
        <img src={heroImage} alt="StayEase Resort" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        <div className="relative z-10 flex flex-1 flex-col w-full">
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight drop-shadow-lg max-w-5xl mx-auto">
                Escape to the <span className="bg-gradient-to-r from-emerald-300 via-yellow-200 to-amber-200 bg-clip-text text-transparent">Hills of Serenity</span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-emerald-50/90 max-w-2xl mx-auto leading-relaxed drop-shadow">
                Nestled amidst the lush tea gardens of Moulovibazar, StayEase Resort offers a tranquil retreat with world-class amenities and authentic Bangladeshi hospitality.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl active:scale-[0.98]">
                  Book Your Stay <ChevronRight className="h-4 w-4" />
                </Link>
                <button onClick={() => scrollTo("#rooms")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
                  Explore Rooms
                </button>
              </div>
              <div className="mt-10 flex flex-wrap gap-5 justify-center text-white/85 text-sm font-medium">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-300" /> Best Rate Guarantee</span>
                <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-300" /> 4.9 TripAdvisor</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-emerald-300" /> 3000+ Happy Guests</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-300" /> 24/7 Concierge</span>
              </div>
            </div>
          </div>
          <div className="px-4 pb-6 sm:pb-8">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-white/70 px-4 py-4 sm:px-5 sm:py-5 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{roomCount ?? "—"}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Total Rooms</p>
                </div>
                <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-white/70 px-4 py-4 sm:px-5 sm:py-5 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700">3000+</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Happy Guests</p>
                </div>
                <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-white/70 px-4 py-4 sm:px-5 sm:py-5 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700">14</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Years of Service</p>
                </div>
                <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-white/70 px-4 py-4 sm:px-5 sm:py-5 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700">4.9</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600">TripAdvisor Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
      </section>

      {/* ─── ABOUT ─────────────────────────────────────────────── */}
      <section id="about" className="flex flex-col">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
        <div className="relative h-[40vh] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1599137248983-e6061c27ec80?q=80&w=2070&auto=format&fit=crop"
            alt="Bisnakandi, Sylhet" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
                About StayEase
              </h2>
              <div className="mt-3 mx-auto w-16 h-0.5 bg-emerald-400 rounded-full" />
            </div>
          </div>

        </div>
        <div className="bg-gradient-to-b from-emerald-700 to-emerald-800 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="space-y-5">
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  Sylhet's Finest <span className="text-emerald-300">Hill Resort</span>
                </h3>
                <p className="text-base leading-relaxed text-emerald-100/85">
                  Founded in 2010, StayEase Resort brings world-class hospitality to the heart of Sylhet's tea country — Moulovibazar. What began as a boutique property has grown into a {roomCount ? `${roomCount}-room` : "multi-room"} award-winning resort spread across 12 acres of landscaped gardens and natural woodlands.
                </p>
                <p className="text-base leading-relaxed text-emerald-100/85">
                  We offer multiple accommodation categories, two restaurants, a tea lounge, temperature-controlled pool, and a dedicated events pavilion. Certified by the Bangladesh Tourism Board.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Rooms & Suites", value: roomCount ? `${roomCount}` : "—" },
                  { label: "Dining Venues", value: "3" },
                  { label: "Staff Members", value: "150+" },
                  { label: "Tea Garden View", value: "Panoramic" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-5 text-center hover:bg-white/15 transition-all">
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
      </section>

      {/* ─── ROOMS ─────────────────────────────────────────────── */}
      <section id="rooms" className="flex flex-col">
        <div className="relative h-[40vh] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1764938257230-26d3d589c212?q=80&w=2070&auto=format&fit=crop"
            alt="Our Rooms" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
                Our Rooms
              </h2>
              <div className="mt-3 mx-auto w-16 h-0.5 bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>
        <div className="relative bg-gradient-to-b from-white via-emerald-50/20 to-white py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-emerald-100/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-100/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-emerald-50/40 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {dbRoomTypes.length > 0 ? dbRoomTypes.slice(0, 3).map((room, i) => (
                <div key={room.name}
                  className="group relative rounded-2xl bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] hover:shadow-[0_20px_60px_rgb(5_150_105_/_0.12)] border border-emerald-100/30 overflow-hidden transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-emerald-50/0 to-amber-50/0 group-hover:via-emerald-50/20 group-hover:to-amber-50/30 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                  <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative h-56 overflow-hidden">
                    <img src={room.image} alt={room.name} className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-[0.5deg]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-3 right-3">
                      <div className="rounded-xl bg-white/90 backdrop-blur-sm px-3.5 py-1.5 shadow-lg ring-1 ring-white/20">
                        <p className="text-sm font-bold text-emerald-700 leading-none">{room.price}</p>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">per night</p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-lg ring-1 ring-white/20">
                          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white drop-shadow-lg tracking-tight">{room.name}</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative px-6 pb-6 pt-5">
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-emerald-200/0 via-emerald-300/50 to-emerald-200/0" />
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="h-1 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />
                      <span className="h-1 w-2 rounded-full bg-amber-300" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      {room.size && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                          {room.size}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                        {room.capacity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 group-hover:text-gray-600 transition-colors duration-300">{room.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {room.perks.slice(0, 3).map((perk) => (
                        <span key={perk} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100/50">
                          <Check className="h-2.5 w-2.5 text-emerald-500" /> {perk}
                        </span>
                      ))}
                    </div>
                    <Link to="/register" className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md active:scale-[0.97] group/btn">
                      Book Now <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="md:col-span-3 text-center py-10 text-gray-400">Loading rooms...</div>
              )}
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
      </section>

      {/* ─── AMENITIES ──────────────────────────────────────────── */}
      <section id="amenities" className="flex flex-col">
        <div className="relative h-[40vh] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1742106850925-7aeec2fb1ce9?q=80&w=2070&auto=format&fit=crop"
            alt="Amenities" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
                Amenities
              </h2>
              <div className="mt-3 mx-auto w-16 h-0.5 bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>
        <div className="relative bg-gradient-to-b from-gray-50 via-white to-emerald-50/30 py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-100/30 blur-3xl" />
            <div className="absolute top-1/3 left-1/4 h-48 w-48 rounded-full bg-emerald-50/50 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <div key={feature.title}
                  className="group relative rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] hover:shadow-[0_20px_60px_rgb(5_150_105_/_0.12)] border border-emerald-100/40 overflow-hidden transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-emerald-50/0 to-emerald-50/0 group-hover:via-emerald-50/30 group-hover:to-emerald-100/40 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                  <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-300 translate-y-0 group-hover:translate-y-0 transition-transform duration-500" style={{ boxShadow: '0 0 20px rgba(5,150,105,0.3)' }} />
                  <div className="relative h-56 overflow-hidden">
                    <img src={feature.image} alt={feature.title} className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-[0.5deg]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md text-lg shadow-lg ring-1 ring-white/20 group-hover:bg-white/30 transition-all duration-300">
                          {feature.icon}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-white drop-shadow-lg tracking-tight">{feature.title}</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative px-6 pb-6 pt-5">
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-emerald-200/0 via-emerald-300/50 to-emerald-200/0" />
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="h-1 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />
                      <span className="h-1 w-2 rounded-full bg-amber-300" />
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors duration-300">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section id="testimonials" className="flex flex-col">
        <div className="relative h-[40vh] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1742106850925-7aeec2fb1ce9?q=80&w=2070&auto=format&fit=crop"
            alt="Testimonials" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-emerald-900/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide">
                Testimonials
              </h2>
              <div className="mt-3 mx-auto w-16 h-0.5 bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="group relative rounded-2xl bg-gradient-to-br from-white to-emerald-50/40 shadow-lg border border-emerald-100/60 overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(5_150_105_/_0.12)] hover:-translate-y-1.5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-300" />
                  <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-100/40 blur-3xl group-hover:bg-emerald-200/50 transition-all duration-700" />
                  <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-50/30 blur-3xl group-hover:bg-amber-100/40 transition-all duration-700" />
                  <div className="relative p-7">
                    <div className="absolute top-6 right-7 select-none">
                      <span className="text-7xl leading-none font-serif text-emerald-300/50 group-hover:text-emerald-400/70 transition-colors duration-500">&ldquo;</span>
                    </div>
                    <div className="flex items-start justify-between mb-5 relative">
                      <div className="flex gap-1">
                        {[...Array(t.rating)].map((_, ri) => (
                          <Star key={ri} className="h-4 w-4 text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(251_191_36_/_0.3)]" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 mb-5 relative z-10">
                      <div className="relative shrink-0">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-emerald-100/80">
                          {t.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-[2.5px] border-white shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{t.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block h-0.5 w-3 rounded-full bg-emerald-300" />
                          {t.location}
                        </p>
                      </div>
                    </div>
                    <p className="relative text-[15px] text-gray-700 leading-relaxed font-medium italic z-10">
                      <span className="text-emerald-600/60 font-serif text-2xl leading-none mr-0.5">&ldquo;</span>
                      {t.text}
                      <span className="text-emerald-600/60 font-serif text-2xl leading-none ml-0.5">&rdquo;</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-emerald-800/85" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready for a Hill Retreat?</h2>
          <p className="mt-3 text-emerald-100/80">Book direct for the best rates, complimentary breakfast, and exclusive resort packages.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 active:scale-[0.98]">
              Check Availability <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3 text-base font-semibold text-white transition-all hover:bg-white/10">
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-xs text-emerald-200/50 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" /> Secure booking &bull; Best rate guaranteed &bull; Complimentary breakfast included
          </p>
        </div>
      </section>

      <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />

      {/* ─── CONTACT ────────────────────────────────────────────── */}
      <section id="contact" className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Get In Touch
            </h2>
            <p className="mt-5 text-base sm:text-lg text-gray-500 leading-relaxed">
              Have a question about bookings, weddings, or planning your perfect hill retreat? Feel free to reach out — we'd love to hear from you.
            </p>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=aonontojahan@gmail.com&su=Inquiry%20from%20StayEase%20Resort" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500 hover:shadow-xl active:scale-[0.98]">
              Send Us a Message <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <div className="h-1 bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400" />

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
            <div className="sm:col-span-2 lg:col-span-3">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span className="text-base font-bold text-white">StayEase <span className="text-emerald-400 font-normal">Resort</span></span>
              </Link>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                Since 2010, the finest hill resort experience in Moulovibazar, Sylhet — amidst the breathtaking tea gardens of northeastern Bangladesh.
              </p>
              <div className="mt-4 flex gap-2">
                {[
                  { icon: Facebook, label: "Facebook" },
                  { icon: Instagram, label: "Instagram" },
                  { icon: Twitter, label: "Twitter" },
                  { icon: Linkedin, label: "LinkedIn" },
                ].map((s) => (
                  <a key={s.label} href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-500 transition-all hover:border-emerald-600 hover:text-emerald-400" title={s.label}>
                    <s.icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.title} className="lg:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">{section.title}</h4>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? (
                        <Link to={link.href} className="text-sm text-gray-500 transition-colors hover:text-emerald-400">
                          {link.label}
                        </Link>
                      ) : (
                        <button onClick={() => scrollTo(link.href)} className="text-sm text-gray-500 transition-colors hover:text-emerald-400">
                          {link.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Reach Us</h4>
              <ul className="mt-3 space-y-3.5">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-emerald-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Address</p>
                    <p className="text-sm text-gray-500">Sherpur Road, Rajnagar<br />Moulovibazar, Sylhet</p>
                  </div>
                </li>
                <li>
                  <a href="https://wa.me/8801723740704" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">WhatsApp us</p>
                      <p className="text-sm text-green-400 group-hover:text-green-300 transition-colors">+8801723740704</p>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} StayEase Resort. All rights reserved.</p>
            <p className="text-xs text-gray-600">Bangladesh Tourism Board Certified</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
