import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '../../hooks/useApi'
import {
  Search,
  MapPin,
  Trophy,
  ArrowRight,
  Sparkles,
  Zap,
  Calendar,
  CheckCircle2,
  Compass,
  Layers,
  ChevronRight,
  AlertCircle,
  Lock,
  UserPlus,
  LogIn,
  Radio,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import customerInventoryService from '../../services/customer/inventory.service'
import { TurfCard } from '../../components/customer/TurfCard'

export const HomePage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // 1. Fetch Active Sports Categories (auto-synced with DB)
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
    refetchInterval: 5000,
  })

  // 2. Fetch Active Promotional Banners (auto-synced with DB)
  const { data: banners = [] } = useQuery({
    queryKey: ['publicBanners'],
    queryFn: () => customerInventoryService.getBanners(),
    refetchInterval: 5000,
  })

  // 3. Fetch Featured / Recent Turfs (auto-synced with DB)
  const { data: turfsData, isLoading: turfsLoading, isError: turfsError, error } = useQuery({
    queryKey: ['homeFeaturedTurfs'],
    queryFn: () => customerInventoryService.getTurfs({ limit: 6, sort: 'newest' }),
    refetchInterval: 5000,
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
    const targetUrl = `/turfs?${params.toString()}`

    if (!isAuthenticated) {
      navigate('/register', { state: { from: targetUrl } })
    } else {
      navigate(targetUrl)
    }
  }

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

          {/* Conditional Hero Feature Area:
              - If Logged In: Show live interactive search & filter controls.
              - If Not Logged In: Hide interactive booking features and display a clear member registration callout. */}
          {isAuthenticated ? (
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
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl backdrop-blur-xl max-w-xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected Booking Features</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Sign Up to Search & Book Slots
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  To protect slot availability and manage reservations, live slot schedules and turf bookings are accessible to registered members.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/register"
                  state={{ from: '/turfs' }}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/20 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
                <Link
                  to="/login"
                  state={{ from: '/turfs' }}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </Link>
              </div>
            </div>
          )}

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
      </section>

      {/* 2. Ongoing Tournaments, Announcements & Live Activities (Always Visible) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Ongoing Tournaments & Happenings</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active promotional banners, featured tournaments, and special arena offers.
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Featured Banners
          </span>
        </div>

        {/* Live Visual Banners Grid */}
        {banners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((banner) => {
              const bannerImage = banner.image || banner.imageUrl
              const bannerLink = banner.link || banner.linkUrl || '/turfs'

              return (
                <div
                  key={banner._id}
                  className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 sm:p-8 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] shadow-2xl group transition-all duration-300 hover:border-emerald-400 hover:shadow-emerald-500/10"
                >
                  {/* Full Visual Banner Image Backdrop - z-0 ensures it is rendered in front of the container background */}
                  <img
                    src={bannerImage || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'}
                    alt={banner.title}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'
                    }}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 z-0 brightness-[0.70]"
                  />

                  {/* High contrast gradient overlay at z-[1] so white text remains perfectly legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20 z-[1] pointer-events-none" />

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>Featured Banner</span>
                      </span>

                      {banner.order !== undefined && (
                        <span className="text-[10px] text-slate-300 font-mono bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-md border border-slate-700">
                          #{banner.order}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-lg">
                      {banner.title}
                    </h3>

                    {banner.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-lg drop-shadow font-medium">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 relative z-10 flex items-center justify-between">
                    <Link
                      to={isAuthenticated ? bannerLink : '/register'}
                      state={{ from: bannerLink }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/30 cursor-pointer group-hover:translate-x-1 duration-200"
                    >
                      <span>{banner.ctaText || 'Explore & Book'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {!isAuthenticated && (
                      <span className="text-[10px] text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-lg backdrop-blur-md border border-slate-700/80">
                        Sign up to reserve
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No active promotional banners scheduled at this time.
          </div>
        )}
      </section>

      {/* 3. Sports Categories Section */}
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
            to={isAuthenticated ? '/turfs' : '/register'}
            state={{ from: '/turfs' }}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>{isAuthenticated ? 'View all sports' : 'Sign up to view all sports'}</span>
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
            {sports.map((sport) => {
              const targetRoute = `/turfs?sport=${sport.slug}`
              return (
                <Link
                  key={sport._id}
                  to={isAuthenticated ? targetRoute : '/register'}
                  state={{ from: targetRoute }}
                  className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Trophy className="w-6 h-6" />
                    </div>
                    {!isAuthenticated && (
                      <span className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700 transition-colors" title="Sign up required to book">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
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
              )
            })}
          </div>
        )}
      </section>

      {/* 4. Featured Arenas Showcase */}
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
            to={isAuthenticated ? '/turfs' : '/register'}
            state={{ from: '/turfs' }}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>
              {isAuthenticated
                ? `Explore all ${turfsData?.pagination?.total || ''} arenas`
                : 'Sign up to explore all arenas'}
            </span>
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

      {/* 5. How Booking Works Section */}
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
              Create an account, search by turf name or area, and filter by sport, floodlights, and price ranges.
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
              Inspect real-time slot availability for any date. Base, peak-hour, and weekend rates calculate automatically.
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
              Confirm your reservation with zero double-booking conflicts. Show up with your squad and play!
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
