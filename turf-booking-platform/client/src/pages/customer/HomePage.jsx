import React, { useState, useMemo } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
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
  Filter,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import customerInventoryService from '../../services/customer/inventory.service'
import { TurfCard } from '../../components/customer/TurfCard'

export const HomePage = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedSportSlug, setSelectedSportSlug] = useState('')

  // 1. Fetch Active Sports Categories
  const { data: sports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
    refetchInterval: 5000,
  })

  // Deduplicate sports so only unique categories appear (no duplicate "Box Cricket" variants)
  const uniqueSports = useMemo(() => {
    const seen = new Map()
    for (const sport of sports) {
      if (!sport?.name) continue
      const baseName = sport.name.replace(/\s*\d+$/, '').trim().toLowerCase()
      if (!seen.has(baseName)) {
        seen.set(baseName, {
          ...sport,
          cleanName: sport.name.replace(/\s*\d+$/, '').trim(),
        })
      }
    }
    return Array.from(seen.values())
  }, [sports])

  // 2. Fetch Active Promotional Banners
  const { data: banners = [] } = useQuery({
    queryKey: ['publicBanners'],
    queryFn: () => customerInventoryService.getBanners(),
    refetchInterval: 5000,
  })

  // 3. Fetch Featured / Recent Turfs (dynamically filters when a sport is selected)
  const { data: turfsData, isLoading: turfsLoading, isError: turfsError, error } = useQuery({
    queryKey: ['homeFeaturedTurfs', selectedSportSlug],
    queryFn: () =>
      customerInventoryService.getTurfs({
        limit: 12,
        sort: 'newest',
        sportSlug: selectedSportSlug || undefined,
      }),
    refetchInterval: 5000,
  })

  const turfs = turfsData?.turfs || []
  const activeSportObj = uniqueSports.find((s) => s.slug === selectedSportSlug)

  // Extract unique cities from actual turfs data
  const availableCities = Array.from(
    new Set(turfs.map((t) => t.address?.city).filter(Boolean))
  )

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('search', searchTerm.trim())
    if (selectedCity) params.set('city', selectedCity)
    const queryString = params.toString()
    const targetUrl = queryString ? `/turfs?${queryString}` : '/turfs'

    if (!isAuthenticated) {
      navigate('/register', { state: { from: targetUrl } })
    } else {
      navigate(targetUrl)
    }
  }

  // Handle session restoration loading to prevent brief flash of wrong screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#267A45] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#526258] font-medium">Verifying session...</p>
        </div>
      </div>
    )
  }

  // Returning authenticated admin must land on /admin dashboard, not customer homepage
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#267A45]" />
            <span>Real-Time Turf Availability & Dynamic Rates</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#17231B] tracking-tight leading-[1.1]">
            Sports Turf Booking. <br />
            <span className="text-[#267A45]">
              Own the Game.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#46564A] max-w-2xl mx-auto leading-relaxed">
            Find and book premier sports turfs for Cricket, Football, Pickleball, and Badminton. Inspect live available slots, transparent peak/weekend rates, and play without conflicts.
          </p>

          {/* Conditional Hero Feature Area */}
          {isAuthenticated ? (
            <form
              onSubmit={handleSearchSubmit}
              className="p-2 sm:p-2.5 rounded-3xl bg-white border border-[#D7E0D9] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-left max-w-2xl mx-auto"
            >
              {/* Search Input */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                <Search className="w-4 h-4 text-[#267A45] shrink-0" />
                <input
                  type="text"
                  placeholder="Search turf name, area, or landmark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-[#17231B] placeholder-[#647168] focus:outline-none"
                />
              </div>

              {/* City Selector if available */}
              {availableCities.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 border-t sm:border-t-0 sm:border-l border-[#E2E8E3] text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#647168] shrink-0" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent text-[#17231B] focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="" className="bg-white text-[#17231B]">
                      All Areas
                    </option>
                    {availableCities.map((city) => (
                      <option key={city} value={city} className="bg-white text-[#17231B]">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="py-3 px-6 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Find Turfs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#D7E0D9] shadow-sm max-w-xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F3E9] text-[#1D6537] text-xs font-semibold border border-[#C9DFCE]">
                <Lock className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Protected Booking Features</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-[#17231B]">
                  Sign Up to Search & Book Slots
                </h3>
                <p className="text-xs sm:text-sm text-[#526258] max-w-md mx-auto">
                  To protect slot availability and manage reservations, live slot schedules and turf bookings are accessible to registered members.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/register"
                  state={{ from: '/turfs' }}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
                <Link
                  to="/login"
                  state={{ from: '/turfs' }}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-white hover:bg-[#F0F6F1] text-[#17231B] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-[#D7E0D9] cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#267A45]" />
                  <span>Sign In</span>
                </Link>
              </div>
            </div>
          )}

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-[#526258]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
              <span className="text-[#46564A] font-medium">Verified Sports Arenas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
              <span className="text-[#46564A] font-medium">Live Conflict-Free Slots</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
              <span className="text-[#46564A] font-medium">Automated Rate Engine</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Ongoing Tournaments, Announcements & Live Activities */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#267A45] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#267A45]"></span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#17231B] flex items-center gap-2">
                <span>Ongoing Tournaments & Happenings</span>
              </h2>
            </div>
            <p className="text-xs text-[#526258] mt-1">
              Active promotional banners, featured tournaments, and special arena offers.
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-semibold text-[#1D6537] bg-[#E7F3E9] px-3 py-1 rounded-full border border-[#C9DFCE]">
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
                  className="relative overflow-hidden rounded-3xl border border-[#D7E0D9] bg-[#17231B] p-6 sm:p-8 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] shadow-sm group transition-all duration-300 hover:shadow-md"
                >
                  <img
                    src={bannerImage || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'}
                    alt={banner.title}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'
                    }}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 z-0 brightness-[0.65]"
                  />

                  {/* Dark overlay for contrast on photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 z-[1] pointer-events-none" />

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md flex items-center gap-1.5 shadow-xs">
                        <Radio className="w-3 h-3 text-[#E7F3E9] animate-pulse" />
                        <span>Featured Banner</span>
                      </span>

                      {banner.order !== undefined && (
                        <span className="text-[10px] text-white/90 font-mono bg-black/40 px-2 py-0.5 rounded backdrop-blur-md border border-white/20">
                          #{banner.order}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                      {banner.title}
                    </h3>

                    {banner.subtitle && (
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg drop-shadow font-medium">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 relative z-10 flex items-center justify-between">
                    <Link
                      to={isAuthenticated ? bannerLink : '/register'}
                      state={{ from: bannerLink }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs transition-all shadow-xs cursor-pointer group-hover:translate-x-1 duration-200"
                    >
                      <span>{banner.ctaText || 'Explore & Book'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {!isAuthenticated && (
                      <span className="text-[10px] text-white/90 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/20">
                        Sign up to reserve
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#D7E0D9] text-[#526258] text-xs">
            No active promotional banners scheduled at this time.
          </div>
        )}
      </section>

      {/* 3. Sports Categories Section */}
      <section id="sports" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#17231B] flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#267A45]" />
              <span>Popular Sports</span>
            </h2>
            <p className="text-xs text-[#526258] mt-1">
              Select your preferred sport to filter specialized turf arenas and specifications.
            </p>
          </div>

          <Link
            to={isAuthenticated ? '/turfs' : '/register'}
            state={{ from: '/turfs' }}
            className="text-xs font-semibold text-[#267A45] hover:text-[#1E6338] flex items-center gap-1 transition-colors"
          >
            <span>{isAuthenticated ? 'View all sports' : 'Sign up to view all sports'}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {sportsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-white border border-[#D7E0D9] animate-pulse" />
            ))}
          </div>
        ) : uniqueSports.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#D7E0D9] text-[#526258] text-xs">
            No sports categories currently registered.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {uniqueSports.map((sport) => {
              const isSelected = selectedSportSlug === sport.slug
              const targetRoute = `/turfs?sport=${sport.slug}`

              return (
                <div
                  key={sport._id}
                  onClick={() => {
                    // Toggle selection to filter arenas right on the homepage
                    setSelectedSportSlug((prev) => (prev === sport.slug ? '' : sport.slug))
                    const arenasEl = document.getElementById('arenas')
                    if (arenasEl) {
                      arenasEl.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className={`group p-5 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-4 shadow-2xs select-none ${
                    isSelected
                      ? 'bg-[#E7F3E9] border-2 border-[#267A45] shadow-xs'
                      : 'bg-white border border-[#D7E0D9] hover:border-[#267A45] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-[#267A45] text-white border border-[#267A45]'
                          : 'bg-[#E7F3E9] border border-[#C9DFCE] text-[#267A45]'
                      }`}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#267A45] text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <Link
                          to={isAuthenticated ? targetRoute : '/register'}
                          state={{ from: targetRoute }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-semibold text-[#526258] hover:text-[#267A45] hover:underline"
                          title="View on Turfs page"
                        >
                          Explore →
                        </Link>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-bold text-sm transition-colors ${
                        isSelected ? 'text-[#1D6537]' : 'text-[#17231B] group-hover:text-[#267A45]'
                      }`}
                    >
                      {sport.cleanName || sport.name}
                    </h3>
                    {sport.description && (
                      <p className="text-[11px] text-[#526258] line-clamp-1 mt-0.5">
                        {sport.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. Featured Arenas Showcase */}
      <section id="arenas" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#17231B] flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#267A45]" />
                <span>
                  {activeSportObj ? `${activeSportObj.cleanName || activeSportObj.name} Arenas` : 'Featured Sports Arenas'}
                </span>
              </h2>
              {selectedSportSlug && (
                <button
                  type="button"
                  onClick={() => setSelectedSportSlug('')}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  title="Clear sport filter"
                >
                  <span>Clear filter</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-[#526258] mt-1">
              {activeSportObj
                ? `Showing all verified turf arenas specialized for ${activeSportObj.cleanName || activeSportObj.name}.`
                : 'Top-rated turf facilities equipped with floodlights, player amenities, and verified slots.'}
            </p>
          </div>

          <Link
            to={
              selectedSportSlug
                ? isAuthenticated
                  ? `/turfs?sport=${selectedSportSlug}`
                  : '/register'
                : isAuthenticated
                ? '/turfs'
                : '/register'
            }
            state={{ from: selectedSportSlug ? `/turfs?sport=${selectedSportSlug}` : '/turfs' }}
            className="text-xs font-semibold text-[#267A45] hover:text-[#1E6338] flex items-center gap-1 transition-colors"
          >
            <span>
              {selectedSportSlug
                ? `Explore all ${activeSportObj?.cleanName || ''} arenas`
                : isAuthenticated
                ? `Explore all ${turfsData?.pagination?.total || ''} arenas`
                : 'Sign up to explore all arenas'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {turfsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-white border border-[#D7E0D9] animate-pulse" />
            ))}
          </div>
        ) : turfsError ? (
          <div className="p-6 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Failed to load featured turfs: {error?.message}</span>
          </div>
        ) : turfs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#D7E0D9] text-[#526258] text-xs">
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D6537] bg-[#E7F3E9] px-3 py-1 rounded-full border border-[#C9DFCE]">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#17231B]">How Turf Booking Works</h2>
          <p className="text-xs sm:text-sm text-[#526258]">
            Reserve your arena slot with guaranteed live availability and instant pricing transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-3 relative overflow-hidden shadow-xs">
            <div className="text-4xl font-black text-[#E2E8E3] absolute right-4 top-4 select-none">
              01
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17231B] text-base">1. Discover Your Arena</h3>
            <p className="text-xs text-[#526258] leading-relaxed">
              Create an account, search by turf name or area, and filter by sport, floodlights, and price ranges.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-3 relative overflow-hidden shadow-xs">
            <div className="text-4xl font-black text-[#E2E8E3] absolute right-4 top-4 select-none">
              02
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17231B] text-base">2. Check Live Slot Schedule</h3>
            <p className="text-xs text-[#526258] leading-relaxed">
              Inspect real-time slot availability for any date. Base, peak-hour, and weekend rates calculate automatically.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-3 relative overflow-hidden shadow-xs">
            <div className="text-4xl font-black text-[#E2E8E3] absolute right-4 top-4 select-none">
              03
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17231B] text-base">3. Instant Match Confirmation</h3>
            <p className="text-xs text-[#526258] leading-relaxed">
              Confirm your reservation with zero double-booking conflicts. Show up with your squad and play!
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
