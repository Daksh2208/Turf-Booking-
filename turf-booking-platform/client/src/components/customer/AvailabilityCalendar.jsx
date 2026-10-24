import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Clock,
  RefreshCw,
  Wrench,
  Trophy,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Tag,
  ChevronRight,
} from 'lucide-react'
import customerBookingService from '../../services/customer/booking.service'

/**
 * Reusable Availability Calendar Component for Customers
 * Displays real-time slot availability, status (available/booked/blocked),
 * and dynamic price estimates from the Availability API.
 */
export const AvailabilityCalendar = ({
  turfId,
  initialDate,
  selectedSlot = null,
  onSlotSelect,
  onDateChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0]
  const [currentDate, setCurrentDate] = useState(initialDate || todayStr)

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate)
    if (onDateChange) onDateChange(newDate)
  }

  // 1. Query Availability from backend API: GET /api/v1/availability?turfId=...&date=...
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['turfAvailability', { turfId, date: currentDate }],
    queryFn: () => customerBookingService.getAvailability(turfId, currentDate),
    enabled: !!turfId && !!currentDate,
    refetchInterval: 10000, // Poll every 10s to keep slots synchronized
  })

  const slots = data?.slots || []
  const timezone = data?.timezone || 'Asia/Kolkata'

  const getReasonIcon = (reason) => {
    switch (reason) {
      case 'tournament':
        return <Trophy className="w-3 h-3 text-purple-400" />
      case 'maintenance':
        return <Wrench className="w-3 h-3 text-amber-400" />
      default:
        return <ShieldAlert className="w-3 h-3 text-rose-400" />
    }
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl backdrop-blur-xl">
      {/* Calendar Header: Date selector, Timezone, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Select Time Slot</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Times displayed in <strong className="text-slate-300 font-mono">{timezone}</strong>. Prices reflect base, peak, and weekend rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-emerald-500">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <input
              type="date"
              value={currentDate}
              min={todayStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none cursor-pointer text-xs"
            />
          </label>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Refresh availability snapshot"
            aria-label="Refresh availability"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Availability Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          <span>Available (Click to select)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
          <span>Booked (Reserved)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
          <span>Blocked (Maintenance / Tournament)</span>
        </span>
      </div>

      {/* Slot Grid States */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <span>Fetching real-time slot availability and rate estimates...</span>
        </div>
      ) : isError ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Failed to load availability: {error?.message}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No operating slots generated for this turf schedule on {currentDate}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {slots.map((slot) => {
            const isAvailable = slot.status === 'available'
            const isBlocked = slot.status === 'blocked'
            const isBooked = slot.status === 'booked'
            const isSelected = selectedSlot?.startTime === slot.startTime

            return (
              <div
                key={`${slot.startTime}-${slot.endTime}`}
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all select-none ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                    : isAvailable
                    ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer'
                    : isBlocked
                    ? 'bg-rose-950/20 border-rose-500/30 cursor-not-allowed opacity-90'
                    : 'bg-slate-950/40 border-slate-800/60 cursor-not-allowed opacity-60'
                }`}
                onClick={() => {
                  if (isAvailable && onSlotSelect) {
                    onSlotSelect(slot)
                  }
                }}
              >
                <div>
                  {/* Time Range */}
                  <div className="flex items-center justify-between font-mono font-bold text-xs text-white mb-2">
                    <span>{slot.startTime}</span>
                    <span className="text-[10px] text-slate-500 font-normal">to {slot.endTime}</span>
                  </div>

                  {/* Status Indicator */}
                  {isBlocked ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {getReasonIcon(slot.reason)}
                        <span className="capitalize">{slot.reason || 'Blocked'}</span>
                      </span>
                      {slot.note && (
                        <p className="text-[10px] text-rose-300/80 truncate" title={slot.note}>
                          {slot.note}
                        </p>
                      )}
                    </div>
                  ) : isBooked ? (
                    <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                      Reserved
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-emerald-400">
                          {slot.priceFormatted || `₹${(slot.price / 100).toFixed(0)}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            slot.rateType === 'weekend_peak'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : slot.rateType === 'weekend'
                              ? 'bg-purple-500/15 text-purple-300'
                              : slot.rateType === 'peak'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {slot.rateType}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Selection Button / Label */}
                <div className="mt-3">
                  {isAvailable ? (
                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                          : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
                      }`}
                    >
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                      {!isSelected && <ChevronRight className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div className="py-1 text-center text-[10px] font-medium text-slate-500">
                      {isBlocked ? 'Unavailable' : 'Occupied'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AvailabilityCalendar
