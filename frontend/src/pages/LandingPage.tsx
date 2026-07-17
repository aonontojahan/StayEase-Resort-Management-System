import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Menu, X, ChevronRight, BedDouble, Sparkles, Waves,
  Coffee, Dumbbell, Users, Star, Shield, Mail, Phone, MapPin,
  Facebook, Instagram, Twitter, Linkedin, ArrowUpRight,
  Utensils, TreePine, Clock, Wind, Heart, Check, Mountain, Quote,
} from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Rooms", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
]

const roomTypes = [
  {
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop",
    name: "Lake View Suite",
    price: "Tk 7,500",
    size: "550 sq ft",
    capacity: "2 Adults + 1 Child",
    description: "King-sized bed, sitting area, tea-coffee maker, and a balcony with panoramic lake and hill views.",
    perks: ["Lake View Balcony", "Breakfast Included", "LED TV & WiFi"],
  },
  {
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
    name: "Presidential Suite",
    price: "Tk 18,000",
    size: "1,200 sq ft",
    capacity: "4 Adults + 1 Child",
    description: "Separate living room, master bedroom with hill-view window, luxury bathroom with Jacuzzi, and a private dining area.",
    perks: ["Jacuzzi", "Living Room", "VIP Airport Transfer", "Complimentary Mini Bar"],
  },
  {
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop",
    name: "Deluxe Double Room",
    price: "Tk 4,500",
    size: "350 sq ft",
    capacity: "2 Adults",
    description: "Premium queen bed, attached bathroom with rain shower, work desk, and garden-view window.",
    perks: ["Garden View", "Complimentary WiFi", "Work Desk"],
  },
  {
    image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=2074&auto=format&fit=crop",
    name: "Family Cottage",
    price: "Tk 6,500",
    size: "600 sq ft",
    capacity: "3 Adults + 1 Child",
    description: "Two bedrooms, a common sitting area, porch with seating, and direct access to the resort's walking trails.",
    perks: ["Two Bedrooms", "Walking Trail Access", "Daily Housekeeping", "Parking"],
  },
]

const features = [
  { icon: Waves, title: "Swimming Pool", description: "Temperature-controlled outdoor pool with children's section, poolside loungers, and shisha lounge." },
  { icon: Sparkles, title: "Spa & Wellness", description: "Traditional Bangladeshi and Thai massages, Ayurvedic treatments, steam room, sauna, and yoga pavilion." },
  { icon: Utensils, title: "Panorama Restaurant", description: "Multi-cuisine restaurant serving authentic Sylheti dishes, Bengali, Indian, Chinese, and Continental cuisine." },
  { icon: Coffee, title: "The Tea Lounge", description: "Premium seven-colour tea, freshly brewed coffee, and light snacks overlooking the lush green hills." },
  { icon: Dumbbell, title: "Fitness Centre", description: "Modern gym with cardio and strength machines, free weights, and a dedicated yoga studio." },
  { icon: TreePine, title: "Tea Garden Tours", description: "Guided tours of nearby tea estates — witness tea plucking, processing, and enjoy fresh Sylheti tea." },
  { icon: Mountain, title: "Hill Trekking", description: "Organized treks to Madhabkunda, Bichanakandi, and the lush forests of Moulovibazar." },
  { icon: Heart, title: "Bonfire & BBQ Nights", description: "Weekly live BBQ dinners with bonfire, traditional music, and starlit dining in the garden courtyard." },
]

const testimonials = [
  { name: "Rafiqul Islam", location: "Dhaka", text: "Waking up to the misty hills and calm lake was surreal. The staff decorated our room with flowers without asking. Truly world-class.", rating: 5 },
  { name: "Sarah Thompson", location: "London, UK", text: "The Presidential Suite was stunning, the food exceptional, and the tea garden tour was a highlight. Rivals any five-star resort I've been to.", rating: 5 },
  { name: "Shahriar & Tanya Khan", location: "Chittagong", text: "Our family loved the pool and bonfire night, while we enjoyed the spa. The staff were incredibly warm. Coming back every year.", rating: 5 },
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
      { label: "Spa & Wellness", href: "#amenities" },
      { label: "Tea Garden Tours", href: "#amenities" },
      { label: "Hill Trekking", href: "#amenities" },
      { label: "Weddings & Events", href: "#" },
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

const heroImage = "https://images.unsplash.com/photo-1762395146044-edf5314d331e?q=80&w=2080&auto=format&fit=crop"

export const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [roomCount, setRoomCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/rooms/public/count`)
      .then((res) => res.json())
      .then((data) => setRoomCount(data.total_rooms))
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">StayEase <span className="text-emerald-600 font-normal">Resort</span></span>
          </Link>

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
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img src={heroImage} alt="StayEase Resort" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative z-10 w-full px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-5 py-1.5 text-sm font-medium text-emerald-200 backdrop-blur-sm border border-emerald-400/30 mb-8 shadow-lg">
            <Sparkles className="h-3.5 w-3.5" /> Sylhet — Moulovibazar
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight drop-shadow-lg max-w-5xl mx-auto">
            Escape to the
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-yellow-200 to-amber-200 bg-clip-text text-transparent">Hills of Serenity</span>
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
          <div className="mt-10 flex flex-wrap gap-5 justify-center text-white/60 text-sm">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-400" /> Best Rate Guarantee</span>
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-400" /> 4.9 TripAdvisor</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-emerald-400" /> 12K+ Happy Guests</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400" /> 24/7 Concierge</span>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="h-1.5 w-1 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* ─── STATS ─────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-10 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 px-5 py-6 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-emerald-600">{roomCount ?? "—"}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Total Rooms</p>
            </div>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 px-5 py-6 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-emerald-600">12K+</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Happy Guests</p>
            </div>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 px-5 py-6 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-emerald-600">14</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Years of Service</p>
            </div>
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 px-5 py-6 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-emerald-600">4.9</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">TripAdvisor Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <div className="aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
                <img src="https://images.unsplash.com/photo-1599137248983-e6061c27ec80?q=80&w=2070&auto=format&fit=crop"
                  alt="Bisnakandi, Sylhet" className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-5 -right-5 rounded-2xl bg-emerald-600 px-6 py-4 shadow-lg hidden sm:block">
                <p className="text-2xl font-bold text-white">14</p>
                <p className="text-xs font-medium text-emerald-100">Years of Excellence</p>
              </div>
            </div>
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" /> About StayEase
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Sylhet's Finest <span className="text-emerald-600">Hill Resort</span>
              </h2>
              <p className="text-base leading-relaxed text-gray-600">
                Founded in 2010, StayEase Resort brings world-class hospitality to the heart of Sylhet's tea country — Moulovibazar. What began as a boutique property has grown into a {roomCount ? `${roomCount}-room` : "multi-room"} award-winning resort spread across 12 acres of landscaped gardens and natural woodlands.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                We offer multiple accommodation categories, two restaurants, a tea lounge, full-service spa, temperature-controlled pool, and a dedicated events pavilion. Certified by the Bangladesh Tourism Board.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: "Rooms & Suites", value: roomCount ? `${roomCount}` : "—" },
                  { label: "Dining Venues", value: "3" },
                  { label: "Staff Members", value: "150+" },
                  { label: "Tea Garden View", value: "Panoramic" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100">
                    <p className="text-lg font-bold text-emerald-700">{item.value}</p>
                    <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROOMS ─────────────────────────────────────────────── */}
      <section id="rooms" className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
              <BedDouble className="h-3.5 w-3.5" /> Accommodations
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Choose Your <span className="text-emerald-600">Retreat</span>
            </h2>
            <p className="mt-3 text-gray-600">From cozy doubles to presidential suites — each room offers stunning tea garden and hill views.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {roomTypes.map((room) => (
              <div key={room.name} className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300">
                <div className="relative h-56 sm:h-60 overflow-hidden">
                  <img src={room.image} alt={room.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-4 right-4 rounded-full bg-white/95 px-3.5 py-1 text-sm font-bold text-emerald-700 shadow-sm">
                    {room.price}<span className="text-xs font-normal text-gray-400"> / night</span>
                  </div>
                </div>
                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{room.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{room.size} · {room.capacity}</p>
                    </div>
                    <div className="flex gap-0.5 text-yellow-400">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{room.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.perks.map((perk) => (
                      <span key={perk} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                        <Check className="h-2.5 w-2.5" /> {perk}
                      </span>
                    ))}
                  </div>
                  <Link to="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors pt-1">
                    Book This Room <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AMENITIES ──────────────────────────────────────────── */}
      <section id="amenities" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1762395150248-a3016aa974d5?q=80&w=2070&auto=format&fit=crop" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-emerald-950/85" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold text-emerald-200 border border-white/10">
              <Wind className="h-3.5 w-3.5" /> Amenities
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Elevated <span className="text-emerald-400">Experiences</span>
            </h2>
            <p className="mt-3 text-emerald-200/70">Every detail thoughtfully crafted for your comfort and delight.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 transition-all hover:bg-white/15 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/30 text-emerald-300 group-hover:bg-emerald-600/40 transition-all">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-emerald-200/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
              <Quote className="h-3.5 w-3.5" /> Testimonials
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              What <span className="text-emerald-600">Guests</span> Say
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex gap-1 text-yellow-400 mb-3">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3 border-t border-gray-50 pt-4">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-emerald-800/85" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready for a Hill Retreat?</h2>
          <p className="mt-3 text-emerald-100/80">Book direct for the best rates, complimentary breakfast, and free cancellation.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 active:scale-[0.98]">
              Check Availability <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3 text-base font-semibold text-white transition-all hover:bg-white/10">
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-xs text-emerald-200/50 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" /> Free cancellation up to 48 hours before check-in
          </p>
        </div>
      </section>

      {/* ─── CONTACT ────────────────────────────────────────────── */}
      <section id="contact" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
              <Mail className="h-3.5 w-3.5" /> Contact
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Get in <span className="text-emerald-600">Touch</span>
            </h2>
            <p className="mt-3 text-gray-600">Questions about bookings, planning your stay, or weddings & events — we're here to help.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md">
              <div className="mx-auto h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-sm">Address</h3>
              <p className="mt-1 text-sm text-gray-500">Sherpur Road, Rajnagar<br />Moulovibazar, Sylhet</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md">
              <div className="mx-auto h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-sm">Phone</h3>
              <p className="mt-1 text-sm text-gray-500">+880 1700-111222<br />+880 1711-333444</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
              <div className="mx-auto h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-sm">Email</h3>
              <p className="mt-1 text-sm text-gray-500">reservations@stayease.com<br />concierge@stayease.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span className="text-base font-bold text-white">StayEase <span className="text-emerald-400 font-normal">Resort</span></span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-gray-400 leading-relaxed">
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
              <div key={section.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">{section.title}</h4>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <button onClick={() => scrollTo(link.href)} className="text-sm text-gray-500 transition-colors hover:text-emerald-400">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
