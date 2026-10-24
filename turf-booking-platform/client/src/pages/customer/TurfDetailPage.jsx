import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Clock,
  Trophy,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle,
  Tag,
  Plus,
  Minus,
  Info,
} from 'lucide-react'
import customerInventoryService from '../../services/customer/inventory.service'
import customerBookingService from '../../services/customer/booking.service'
import { AvailabilityCalendar } from '../../components/customer/AvailabilityCalendar'
import { useAuth } from '../../hooks/useAuth'

export const TurfDetailPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  // 1. Fetch Turf Details by Slug or ID
  const {
    data: turf,
    isLoading: turfLoading,
    isError: turfError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['publicTurfDetail', slug],
    queryFn: () => customerInventoryService.getTurfBySlug(slug),
    enabled: !!slug,
  })

  // 2. Fetch Available Equipment / Add-Ons
  const { data: addOns = [] } = useQuery({
    queryKey: ['publicAddOns'],
    queryFn: () => customerInventoryService.getAddOns(),
  })

  // 3. Query Real-Time Pricing Quote when slot or add-ons change
  const {
    data: quote,
    isLoading: quoteLoading,
    isError: quoteError,
  } = useQuery({
    queryKey: [
      'pricingQuote',
      {
        turfId: turf?._id,
        date: selectedDate,
        startTime: selectedSlot?.startTime,
        endTime: selectedSlot?.endTime,
        addOns: selectedAddOns,
      },
    ],
    queryFn: () =>
      customerBookingService.getPricingQuote({
        turfId: turf._id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        addOns: selectedAddOns.map((item) => ({
          addOnId: item.addOnId,
          quantity: item.quantity,
        })),
      }),
    enabled: !!turf?._id && !!selectedSlot?.startTime && !!selectedSlot?.endTime,
  })

  const handleAddOnQuantityChange = (addOnId, delta) => {
    setSelectedAddOns((prev) => {
      const existing = prev.find((item) => item.addOnId === addOns.find((a) => a._id === addOnId)?._id)
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

  if (turfLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span>Loading turf arena details and specifications...</span>
      </div>
    )
  }

  if (turfError || !turf) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error?.message || 'Turf arena not found or currently inactive.'}</span>
        </div>
        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white hover:border-slate-700"
        >
          <span>Back to All Turfs</span>
        </Link>
      </div>
    )
  }

  const images = turf.images && turf.images.length > 0
    ? turf.images
    : ['https://images.unsplash.com/photo-1529900245534-47fbf76681e0?auto=format&fit=crop&w=1200&q=80']

  const locationText = [
    turf.address?.street,
    turf.address?.landmark,
    turf.address?.city,
    turf.address?.state,
    turf.address?.zipCode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-emerald-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link to="/turfs" className="hover:text-emerald-400 transition-colors">
          Turfs
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-white font-semibold truncate">{turf.name}</span>
      </nav>

      {/* Hero Header & Gallery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Image Gallery (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Display Image */}
          <div className="relative h-72 sm:h-96 w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
            <img
              src={images[activeImageIdx] || images[0]}
              alt={turf.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

            {/* Top Badge: Operating Hours */}
            {turf.openingHours && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
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
                      ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${turf.name} thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Arena Metadata & Facilities */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6 backdrop-blur-md">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {turf.sports?.map((sport) => {
                  const sName = typeof sport === 'object' ? sport.name : 'Sport'
                  const sId = typeof sport === 'object' ? sport._id : sport
                  return (
                    <span
                      key={sId || sName}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>{sName}</span>
                    </span>
                  )
                })}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white">{turf.name}</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{locationText}</span>
              </p>
            </div>

            {/* Description */}
            {turf.description && (
              <div className="space-y-1.5 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  About this Arena
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {turf.description}
                </p>
              </div>
            )}

            {/* Specs Grid: Size, Surface, Capacity */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
              {turf.size && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Turf Size</span>
                  <span className="text-xs font-bold text-white">{turf.size}</span>
                </div>
              )}

              {turf.surface && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Surface Type</span>
                  <span className="text-xs font-bold text-emerald-400">{turf.surface}</span>
                </div>
              )}

              {turf.capacity && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Player Capacity</span>
                  <span className="text-xs font-bold text-white">
                    {turf.capacity.minPlayers || 2} - {turf.capacity.maxPlayers || 22} players
                  </span>
                </div>
              )}
            </div>

            {/* Facilities Chips */}
            {turf.facilities && turf.facilities.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Facilities & Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {turf.facilities.map((facility, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-slate-950 text-xs font-medium text-slate-200 border border-slate-800"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Quote Estimate Card (1 Col) */}
        <div className="space-y-6">
          {/* Rate Card Preview */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Hourly Pricing Engine (Part 7)
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Standard Weekday Rate</span>
                  <span className="text-[10px] text-slate-400">Regular daytime match hours</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-white">
                    ₹{((turf.pricing?.baseRate || 80000) / 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-500">/hr</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-300 block">Peak-Hour Rate</span>
                  <span className="text-[10px] text-amber-500">
                    Evening matches ({turf.pricing?.peakHours?.start || '18:00'} - {turf.pricing?.peakHours?.end || '23:00'})
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-amber-400">
                    ₹{((turf.pricing?.peakRate || 120000) / 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-amber-500">/hr</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-300 block">Weekend Rate</span>
                  <span className="text-[10px] text-purple-400">Saturday & Sunday sessions</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-black text-purple-300">
                    ₹{((turf.pricing?.weekendRate || 140000) / 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-purple-400">/hr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Add-Ons Selection */}
          {addOns.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 backdrop-blur-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Equipment & Add-Ons
              </h3>

              <div className="space-y-3">
                {addOns.map((addon) => {
                  const qty = getAddOnQuantity(addon._id)
                  const unitText = addon.pricingUnit === 'per_hour' ? '/hr' : '/booking'

                  return (
                    <div
                      key={addon._id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{addon.name}</span>
                        <span className="text-[10px] text-slate-400">
                          ₹{(addon.price / 100).toFixed(0)} {unitText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleAddOnQuantityChange(addon._id, -1)}
                          disabled={qty === 0}
                          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-white w-4 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddOnQuantityChange(addon._id, 1)}
                          className="text-slate-400 hover:text-white cursor-pointer"
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

          {/* Live Pricing Quote Estimate Card */}
          <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              <span>Live Quote Estimate (Part 7)</span>
            </h3>

            {!selectedSlot ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 text-center space-y-1">
                <Calendar className="w-5 h-5 text-slate-500 mx-auto" />
                <p className="font-semibold text-slate-300">Select an available slot below</p>
                <p className="text-[11px]">Dynamic rate breakdown and GST estimate will update automatically.</p>
              </div>
            ) : quoteLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span>Calculating server-verified pricing quote...</span>
              </div>
            ) : quote ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Selected Slot:</span>
                    <span className="font-mono text-white font-bold">
                      {quote.startTime} - {quote.endTime}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Slot Subtotal:</span>
                    <span className="font-mono text-white">
                      ₹{(quote.slotSubtotal / 100).toFixed(2)}
                    </span>
                  </div>

                  {quote.addOnsTotal > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Add-Ons Total:</span>
                      <span className="font-mono text-white">
                        ₹{(quote.addOnsTotal / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>GST ({quote.gstPercentage}%):</span>
                    <span className="font-mono text-white">
                      ₹{(quote.gstAmount / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                    <span className="font-bold text-white">Estimated Total:</span>
                    <span className="font-mono font-black text-emerald-400 text-base">
                      ₹{(quote.totalAmount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    This estimate reflects live base, peak, and weekend rules. Slot reservation and checkout will be finalized in Part 10.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Interactive Slot Availability Calendar (Part 8) */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Select Match Date & Slot</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time availability calendar. Green slots are available, red slots are blocked for maintenance or tournaments, and dark slots are reserved.
          </p>
        </div>

        <AvailabilityCalendar
          turfId={turf._id}
          initialDate={selectedDate}
          selectedSlot={selectedSlot}
          onSlotSelect={(slot) => setSelectedSlot(slot)}
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
