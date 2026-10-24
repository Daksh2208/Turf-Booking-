import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  MapPin,
  Trophy,
  ArrowRight,
  Sparkles,
  Zap,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import customerInventoryService from '../../services/customer/inventory.service'
import { TurfCard } from '../../components/customer/TurfCard'

export const HomePage = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // 1. Fetch Active Sports Categories
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
  })

  // 2. Fetch Active Promotional Banners
  const { data: banners = [] } = useQuery({
    queryKey: ['publicBanners'],
    queryFn: () => customerInventoryService.getBanners(),
  })

  // 3. Fetch Featured / Recent Turfs
  const { data: turfsData, isLoading: turfsLoading, isError: turfsError, error } = useQuery({
    queryKey: ['homeFeaturedTurfs'],
    queryFn: () => customerInventoryService.getTurfs({ limit: 6, sort: 'newest' }),
  })

  const turfs = turfsData?.turfs || []

  // Extract unique cities from actual turfs data
  const availableCities = Array.from(
    new Set(turfs.map((t) => t.address?.city).filter(Boolean))
  )

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('search', searchTerm.trim())
    if (selectedCity) params.set('city', selectedCity)
    navigate(`/turfs?${params.toString()}`)
  }

  const activeBanner = banners.length > 0 ? banners[0] : null

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Ambient Glow & Grid background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] -z-10 rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-Time Turf Availability & Dynamic Rates</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Sports Turf Booking. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              Own the Game.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Find and book premier sports turfs for Cricket, Football, Pickleball, and Badminton. Inspect live available slots, transparent peak/weekend rates, and play without conflicts.
          </p>

          {/* Hero Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="p-2 sm:p-2.5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-left max-w-2xl mx-auto"
          >
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
              <Search className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                placeholder="Search turf name, area, or landmark..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* City Selector if available */}
            {availableCities.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 border-t sm:border-t-0 sm:border-l border-slate-800 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="" className="bg-slate-900 text-white">
                    All Areas
                  </option>
                  {availableCities.map((city) => (
                    <option key={city} value={city} className="bg-slate-900 text-white">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>Find Turfs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified Sports Arenas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Live Conflict-Free Slots</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Automated Rate Engine</span>
            </span>
          </div>
        </div>

        {/* Hero Active Banner (if configured by Admin) */}
        {activeBanner && (
          <div className="mt-12 max-w-5xl mx-auto rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl bg-slate-900/60 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-left">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                Featured Announcement
              </span>
              <h3 className="text-xl font-bold text-white">{activeBanner.title}</h3>
              {activeBanner.subtitle && (
                <p className="text-xs text-slate-300">{activeBanner.subtitle}</p>
              )}
            </div>
            {activeBanner.linkUrl && (
              <a
                href={activeBanner.linkUrl}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <span>Learn More</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </section>

      {/* 2. Sports Categories Section */}
      <section id="sports" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-400" />
              <span>Popular Sports</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your preferred sport to filter specialized turf arenas and specifications.
            </p>
          </div>

          <Link
            to="/turfs"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>View all sports</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {sportsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : sports.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No sports categories currently registered.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sports.map((sport) => (
              <Link
                key={sport._id}
                to={`/turfs?sport=${sport.slug}`}
                className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {sport.name}
                  </h3>
                  {sport.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {sport.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured Turfs Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-emerald-400" />
              <span>Featured Sports Arenas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Top-rated turf facilities equipped with floodlights, player amenities, and verified slots.
            </p>
          </div>

          <Link
            to="/turfs"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>Explore all {turfsData?.pagination?.total || ''} arenas</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {turfsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-slate-900/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : turfsError ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Failed to load featured turfs: {error?.message}</span>
          </div>
        ) : turfs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No active turf arenas available yet. Visit the Admin Console to register turfs.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {turfs.map((turf) => (
              <TurfCard key={turf._id} turf={turf} />
            ))}
          </div>
        )}
      </section>

      {/* 4. How Booking Works Section */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How Turf Booking Works</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Reserve your arena slot with guaranteed live availability and instant pricing transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="text-4xl font-black text-slate-800 absolute right-4 top-4 select-none">
              01
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">1. Discover Your Arena</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Search by turf name, city, or area. Filter by sport, facilities like floodlights & parking, and price ranges.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="text-4xl font-black text-slate-800 absolute right-4 top-4 select-none">
              02
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">2. Check Live Slot Schedule</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect real-time slot availability for any date. Base, peak-hour, and weekend rates are calculated automatically.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="text-4xl font-black text-slate-800 absolute right-4 top-4 select-none">
              03
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">3. Instant Match Confirmation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Confirm your reservation with venue payment and zero double-booking conflicts. Show up and play!
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
