import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '../../hooks/useApi'
import {
  MapPin,
  Clock,
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Tag,
  Plus,
  Minus,
  Info,
  Heart,
  Zap,
} from 'lucide-react'
import customerInventoryService from '../../services/customer/inventory.service'
import customerBookingService from '../../services/customer/booking.service'
import { AvailabilityCalendar } from '../../components/customer/AvailabilityCalendar'
import { useAuth } from '../../hooks/useAuth'

export const TurfDetailPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [playerCount, setPlayerCount] = useState(10)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isTogglingFav, setIsTogglingFav] = useState(false)

  // 1. Fetch Turf Details by Slug or ID
  const {
    data: turf,
    isLoading: turfLoading,
    isError: turfError,
    error,
  } = useQuery({
    queryKey: ['publicTurfDetail', slug],
    queryFn: () => customerInventoryService.getTurfBySlug(slug),
    enabled: !!slug,
    refetchInterval: 5000,
  })

  // Set default player count based on turf capacity when turf data loads
  useEffect(() => {
    if (turf?.capacity) {
      const minP = turf.capacity.minPlayers || 2
      const maxP = turf.capacity.maxPlayers || 22
      setPlayerCount((prev) => {
        if (prev < minP) return minP
        if (prev > maxP) return maxP
        return prev
      })
    }
  }, [turf])

  // Check if turf is in user's favorites
  useEffect(() => {
    if (user && turf?._id && Array.isArray(user.favorites)) {
      const hasFav = user.favorites.some(
        (f) => (typeof f === 'object' ? f._id : f).toString() === turf._id.toString()
      )
      setIsFavorited(hasFav)
    }
  }, [user, turf])

  // 2. Fetch Available Equipment / Add-Ons
  const { data: addOns = [] } = useQuery({
    queryKey: ['publicAddOns'],
    queryFn: () => customerInventoryService.getAddOns(),
    refetchInterval: 5000,
  })

  // 3. Query Real-Time Authoritative Pricing Quote
  const {
    data: quote,
    isLoading: quoteLoading,
  } = useQuery({
    queryKey: [
      'pricingQuote',
      {
        turfId: turf?._id,
        date: selectedDate,
        startTime: selectedSlot?.startTime,
        endTime: selectedSlot?.endTime,
        playerCount,
        addOns: selectedAddOns,
      },
    ],
    queryFn: () =>
      customerBookingService.getPricingQuote({
        turfId: turf._id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        playerCount,
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
      }),
    enabled: !!turf?._id && !!selectedSlot?.startTime && !!selectedSlot?.endTime,
  })

  const handleAddOnQuantityChange = (addOnId, delta) => {
    setSelectedAddOns((prev) => {
      const existing = prev.find((item) => item.addOnId === addOnId)
      const currentQty = existing ? existing.quantity : 0
      const newQty = Math.max(0, currentQty + delta)

      if (newQty === 0) {
        return prev.filter((item) => item.addOnId !== addOnId)
      }

      if (existing) {
        return prev.map((item) =>
          item.addOnId === addOnId ? { ...item, quantity: newQty } : item
        )
      } else {
        return [...prev, { addOnId, quantity: newQty }]
      }
    })
  }

  const getAddOnQuantity = (addOnId) => {
    const item = selectedAddOns.find((i) => i.addOnId === addOnId)
    return item ? item.quantity : 0
  }

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/register', { state: { from: `/turfs/${slug}` } })
      return
    }

    if (!turf?._id || isTogglingFav) return

    try {
      setIsTogglingFav(true)
      const res = await customerInventoryService.toggleFavorite(turf._id)
      setIsFavorited(Boolean(res?.isFavorited))
    } catch (err) {
      console.error('Failed to toggle favourite:', err)
    } finally {
      setIsTogglingFav(false)
    }
  }

  if (turfLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#526258] text-xs">
        <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
        <span>Loading turf arena details and specifications...</span>
      </div>
    )
  }

  if (turfError || !turf) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-6 rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error?.message || 'Turf arena not found or currently inactive.'}</span>
        </div>
        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D7E0D9] text-xs font-semibold text-[#17231B] hover:bg-[#F0F6F1]"
        >
          <span>Back to All Turfs</span>
        </Link>
      </div>
    )
  }

  const images = turf.images && turf.images.length > 0 ? turf.images : []

  const locationText = [
    turf.address?.street,
    turf.address?.landmark,
    turf.address?.city,
    turf.address?.state,
    turf.address?.zipCode,
  ]
    .filter(Boolean)
    .join(', ')

  const minPlayers = turf.capacity?.minPlayers || 2
  const maxPlayers = turf.capacity?.maxPlayers || 22

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs text-[#526258]">
          <Link to="/" className="hover:text-[#267A45] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-[#647168]" />
          <Link to="/turfs" className="hover:text-[#267A45] transition-colors">
            Turfs
          </Link>
          <ChevronRight className="w-3 h-3 text-[#647168]" />
          <span className="text-[#17231B] font-semibold truncate">{turf.name}</span>
        </nav>

        {/* Favorite & Share Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isTogglingFav}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFavorited
                ? 'bg-[#FDF0EF] border-[#F8D2CE] text-[#922B27] shadow-xs'
                : 'bg-white border-[#D7E0D9] text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-[#922B27] text-[#922B27]' : ''}`} />
            <span>{isFavorited ? 'Saved to Favourites' : 'Save to Favourites'}</span>
          </button>
        </div>
      </div>

      {/* Hero Header & Gallery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Image Gallery & Specs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Display Image */}
          <div className="relative h-72 sm:h-96 w-full rounded-3xl overflow-hidden bg-[#EDF5EF] border border-[#D7E0D9] shadow-xs flex items-center justify-center">
            {images.length > 0 ? (
              <img
                src={images[activeImageIdx] || images[0]}
                alt={turf.name}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full bg-[#EDF5EF] flex flex-col items-center justify-center gap-3 text-[#526258]">
                <Trophy className="w-16 h-16 text-[#267A45]/30" />
                <span className="text-sm font-semibold text-[#526258]">{turf.name}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Top Badge: Operating Hours */}
            {turf.openingHours && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#D7E0D9] text-xs font-semibold text-[#17231B] flex items-center gap-1.5 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-[#267A45]" />
                <span>
                  {turf.openingHours.open} - {turf.openingHours.close} ({turf.timezone || 'Asia/Kolkata'})
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails if multiple images exist */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIdx === idx
                      ? 'border-[#267A45] ring-2 ring-[#267A45]/20'
                      : 'border-[#D7E0D9] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${turf.name} thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Arena Metadata & Facilities */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-6 shadow-xs">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {turf.sports?.map((sport) => {
                  const sName = typeof sport === 'object' ? sport.name : 'Sport'
                  const sId = typeof sport === 'object' ? sport._id : sport
                  return (
                    <span
                      key={sId || sName}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]"
                    >
                      <Trophy className="w-3 h-3 text-[#267A45]" />
                      <span>{sName}</span>
                    </span>
                  )
                })}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[#17231B]">{turf.name}</h1>
              <p className="text-xs sm:text-sm text-[#46564A] mt-1 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
                <span>{locationText}</span>
              </p>
            </div>

            {/* Description */}
            {turf.description && (
              <div className="space-y-1.5 pt-4 border-t border-[#E2E8E3]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
                  About this Arena
                </h3>
                <p className="text-xs text-[#46564A] leading-relaxed whitespace-pre-line">
                  {turf.description}
                </p>
              </div>
            )}

            {/* Specs Grid: Size, Surface, Capacity */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E2E8E3]">
              {turf.size && (
                <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                  <span className="text-[10px] text-[#526258] uppercase block font-semibold">Turf Size</span>
                  <span className="text-xs font-bold text-[#17231B]">{turf.size}</span>
                </div>
              )}

              {turf.surface && (
                <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                  <span className="text-[10px] text-[#526258] uppercase block font-semibold">Surface Type</span>
                  <span className="text-xs font-bold text-[#267A45]">{turf.surface}</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9]">
                <span className="text-[10px] text-[#526258] uppercase block font-semibold">Player Capacity</span>
                <span className="text-xs font-bold text-[#17231B]">
                  {minPlayers} - {maxPlayers} max players
                </span>
              </div>
            </div>

            {/* Facilities Chips */}
            {turf.facilities && turf.facilities.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-[#E2E8E3]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
                  Facilities & Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {turf.facilities.map((facility, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-[#F0F4F1] text-xs font-medium text-[#46564A] border border-[#D7E0D9]"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Players, Equipment & Live Quote Estimate */}
        <div className="space-y-6">
          {/* Rate Card Overview */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B] flex items-center justify-between">
              <span>Hourly Dynamic Pricing</span>
              <span className="text-[10px] text-[#267A45] font-semibold bg-[#E7F3E9] px-2 py-0.5 rounded-full border border-[#C9DFCE]">Live Synced</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#17231B] block">Standard Weekday Rate</span>
                  <span className="text-[10px] text-[#526258]">Normal daytime hours</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-[#17231B]">
                    {turf.pricing?.baseRate != null ? `₹${(turf.pricing.baseRate / 100).toFixed(0)}` : '₹0'}
                  </span>
                  <span className="text-[10px] text-[#647168]">/hr</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FDF4E7] border border-[#F6E1C4] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#79420D] block">Peak-Hour Rate</span>
                  <span className="text-[10px] text-[#79420D]">
                    {turf.pricing?.peakHours?.start && turf.pricing?.peakHours?.end
                      ? `Evening matches (${turf.pricing.peakHours.start} - ${turf.pricing.peakHours.end})`
                      : 'Evening prime-time'}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-[#79420D]">
                    {turf.pricing?.peakRate != null ? `₹${(turf.pricing.peakRate / 100).toFixed(0)}` : '₹0'}
                  </span>
                  <span className="text-[10px] text-[#79420D]">/hr</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1D6537] block">Weekend Rate</span>
                  <span className="text-[10px] text-[#1D6537]">Saturday & Sunday sessions</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-[#267A45]">
                    {turf.pricing?.weekendRate != null
                      ? `₹${(turf.pricing.weekendRate / 100).toFixed(0)}`
                      : '₹0'}
                  </span>
                  <span className="text-[10px] text-[#1D6537]">/hr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Player Squad Size & Capacity Limit Selector */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#267A45]" />
                <span>Player Count</span>
              </h3>
              <span className="text-[10px] font-bold text-[#1D6537] bg-[#E7F3E9] border border-[#C9DFCE] px-2 py-0.5 rounded-full">
                Max Capacity: {maxPlayers} Players
              </span>
            </div>

            <p className="text-[11px] text-[#526258]">
              Specify your team or squad size. The arena strictly limits attendance up to {maxPlayers} players maximum.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-between">
              <span className="text-xs font-bold text-[#17231B]">Playing Squad Members:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerCount((p) => Math.max(minPlayers, p - 1))}
                  disabled={playerCount <= minPlayers}
                  className="w-8 h-8 rounded-xl bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed text-[#17231B] flex items-center justify-center transition-colors cursor-pointer"
                  title={`Minimum ${minPlayers} players`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-base text-[#267A45] w-8 text-center">
                  {playerCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerCount((p) => Math.min(maxPlayers, p + 1))}
                  disabled={playerCount >= maxPlayers}
                  className="w-8 h-8 rounded-xl bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed text-[#17231B] flex items-center justify-center transition-colors cursor-pointer"
                  title={`Maximum ${maxPlayers} players`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {playerCount >= maxPlayers && (
              <div className="p-2.5 rounded-xl bg-[#FDF4E7] border border-[#F6E1C4] text-[#79420D] text-[11px] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Maximum arena capacity reached ({maxPlayers} players). Cannot book for more than {maxPlayers} players.</span>
              </div>
            )}
          </div>

          {/* Equipment Rental */}
          {addOns.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#D7E0D9] space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17231B] flex items-center justify-between">
                <span>Sports Equipment Rental</span>
                <span className="text-[10px] text-[#647168] font-normal">Optional</span>
              </h3>

              <div className="space-y-3">
                {addOns.map((addon) => {
                  const qty = getAddOnQuantity(addon._id)
                  const unitText =
                    addon.pricingUnit === 'per_hour'
                      ? '/hr'
                      : addon.pricingUnit === 'per_player'
                      ? '/player'
                      : '/booking'

                  return (
                    <div
                      key={addon._id}
                      className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#D7E0D9] flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#17231B] block">{addon.name}</span>
                        <span className="text-[10px] text-[#526258]">
                          ₹{(addon.price / 100).toFixed(0)} {unitText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-white border border-[#D7E0D9] rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleAddOnQuantityChange(addon._id, -1)}
                          disabled={qty === 0}
                          className="text-[#647168] hover:text-[#17231B] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-[#17231B] w-4 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddOnQuantityChange(addon._id, 1)}
                          className="text-[#647168] hover:text-[#17231B] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Dynamic Pricing Quote Estimate Card */}
          <div className="p-6 rounded-3xl bg-[#EDF5EF] border border-[#C9DFCE] space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D6537] flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#267A45]" />
              <span>Live Pricing Calculation</span>
            </h3>

            {!selectedSlot ? (
              <div className="p-4 rounded-2xl bg-white border border-[#D7E0D9] text-xs text-[#526258] text-center space-y-1">
                <Calendar className="w-5 h-5 text-[#647168] mx-auto" />
                <p className="font-semibold text-[#17231B]">Select an available slot below</p>
                <p className="text-[11px]">Choose starting time and hours. Rates update automatically.</p>
              </div>
            ) : quoteLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-[#526258] text-xs">
                <Loader2 className="w-5 h-5 text-[#267A45] animate-spin" />
                <span>Calculating server-verified pricing quote...</span>
              </div>
            ) : quote ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-white rounded-2xl border border-[#D7E0D9] space-y-2.5">
                  <div className="flex justify-between text-[#526258]">
                    <span>Selected Window:</span>
                    <span className="font-mono text-[#17231B] font-bold">
                      {quote.timeRange?.startTime || selectedSlot.startTime} -{' '}
                      {quote.timeRange?.endTime || selectedSlot.endTime} (
                      {quote.timeRange?.durationHours || selectedSlot.durationHours || 1}{' '}
                      {(quote.timeRange?.durationHours || selectedSlot.durationHours || 1) === 1
                        ? 'Hour'
                        : 'Hours'}
                      )
                    </span>
                  </div>

                  {/* Hourly Segment Breakdown */}
                  {Array.isArray(quote.hourlySegments) && quote.hourlySegments.length > 0 && (
                    <div className="py-2 border-y border-[#E2E8E3] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#647168] block">
                        Hourly Rate Segments:
                      </span>
                      {quote.hourlySegments.map((seg, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-[#46564A] font-mono">
                            {seg.startTime} - {seg.endTime}{' '}
                            <span className="text-[#267A45] capitalize font-sans">
                              ({seg.rateType.replace('_', ' ')})
                            </span>
                            :
                          </span>
                          <span className="font-mono text-[#17231B] font-bold">
                            ₹{(seg.segmentPrice / 100).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between text-[#526258]">
                    <span>Slot Subtotal:</span>
                    <span className="font-mono text-[#17231B] font-bold">
                      ₹{((quote.turfSubtotal ?? quote.slotSubtotal ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  {(quote.addOnsSubtotal > 0 || quote.addOnsTotal > 0) && (
                    <div className="flex justify-between text-[#526258]">
                      <span>Add-Ons & Equipment:</span>
                      <span className="font-mono text-[#17231B] font-bold">
                        ₹{((quote.addOnsSubtotal ?? quote.addOnsTotal ?? 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#526258]">
                    <span>
                      GST ({quote.tax?.taxPercentage ?? quote.gstPercentage ?? 18}%):
                    </span>
                    <span className="font-mono text-[#17231B] font-bold">
                      ₹{((quote.tax?.taxAmount ?? quote.gstAmount ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E2E8E3] flex justify-between items-center text-sm">
                    <span className="font-bold text-[#17231B]">Estimated Total:</span>
                    <span className="font-mono font-black text-[#267A45] text-base">
                      ₹{((quote.finalTotal ?? quote.totalAmount ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/checkout', {
                      state: {
                        turfId: turf._id,
                        turf,
                        date: selectedDate,
                        startTime: selectedSlot.startTime,
                        endTime: selectedSlot.endTime,
                        durationHours: selectedSlot.durationHours || 1,
                        playerCount,
                        selectedAddOns,
                        quote,
                      },
                    })
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white text-white" />
                  <span>Proceed to Checkout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Interactive Slot Availability Calendar */}
      <section className="space-y-4 pt-4 border-t border-[#E2E8E3]">
        <div>
          <h2 className="text-xl font-bold text-[#17231B] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#267A45]" />
            <span>Select Match Date & Time Slots</span>
          </h2>
          <p className="text-xs text-[#526258] mt-0.5">
            Real-time availability calendar. Green slots are available, red slots are blocked for maintenance, and grey slots are reserved. Pick a starting slot and select 1 to 5 continuous hours.
          </p>
        </div>

        <AvailabilityCalendar
          turfId={turf._id}
          initialDate={selectedDate}
          selectedSlot={selectedSlot}
          onSlotSelect={(slotRange) => setSelectedSlot(slotRange)}
          onDateChange={(newDate) => {
            setSelectedDate(newDate)
            setSelectedSlot(null)
          }}
        />
      </section>
    </div>
  )
}

export default TurfDetailPage
