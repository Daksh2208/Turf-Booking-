import React, { useState, useEffect } from 'react'
import { useQuery } from '../../hooks/useApi'
import {
  Calendar,
  Clock,
  RefreshCw,
  Wrench,
  Trophy,
  ShieldAlert,
  Loader2,
  AlertCircle,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react'
import customerBookingService from '../../services/customer/booking.service'

/**
 * World-Class Sports Turf Availability Calendar Component
 *
 * Supports:
 * 1. Showing each slot's exact start and end times, status, and live pricing rate
 * 2. Multi-hour slot selection with duration stepper & chips
 * 3. Contiguous availability validation
 * 4. Transparent base, peak, weekend rate badges in light theme
 */
export const AvailabilityCalendar = ({
  turfId,
  initialDate,
  selectedSlot = null,
  selectedSlots: propSelectedSlots = null,
  onSlotSelect,
  onDateChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0]
  const [currentDate, setCurrentDate] = useState(initialDate || todayStr)
  
  // Track array of selected slot start times
  const [selectedSlotTimes, setSelectedSlotTimes] = useState(() => {
    if (Array.isArray(propSelectedSlots) && propSelectedSlots.length > 0) {
      return propSelectedSlots.map((s) => (typeof s === 'string' ? s : s.startTime))
    }
    if (Array.isArray(selectedSlot?.selectedSlots) && selectedSlot.selectedSlots.length > 0) {
      return selectedSlot.selectedSlots
    }
    if (selectedSlot?.startTime) {
      return [selectedSlot.startTime]
    }
    return []
  })

  // Synchronize when parent prop updates
  useEffect(() => {
    if (Array.isArray(propSelectedSlots)) {
      setSelectedSlotTimes(propSelectedSlots.map((s) => (typeof s === 'string' ? s : s.startTime)))
    } else if (Array.isArray(selectedSlot?.selectedSlots)) {
      setSelectedSlotTimes((prev) => {
        const incoming = selectedSlot.selectedSlots
        if (
          prev.length === incoming.length &&
          prev.every((v, i) => v === incoming[i])
        ) {
          return prev
        }
        return incoming
      })
    } else if (selectedSlot?.startTime) {
      setSelectedSlotTimes((prev) => {
        if (prev.length === 1 && prev[0] === selectedSlot.startTime) return prev
        if (prev.includes(selectedSlot.startTime)) return prev
        return [selectedSlot.startTime]
      })
    } else if (selectedSlot === null && (propSelectedSlots === null || propSelectedSlots === undefined)) {
      setSelectedSlotTimes([])
    }
  }, [selectedSlot, propSelectedSlots])

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate)
    setSelectedSlotTimes([])
    if (onDateChange) onDateChange(newDate)
    if (onSlotSelect) onSlotSelect(null)
  }

  // Query Availability from backend API
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['turfAvailability', { turfId, date: currentDate }],
    queryFn: () => customerBookingService.getAvailability(turfId, currentDate),
    enabled: !!turfId && !!currentDate,
    refetchInterval: 4000,
  })

  const slots = data?.slots || []
  const timezone = data?.timezone || 'Asia/Kolkata'

  // Handle slot card click (toggle selection for any clicked slot)
  const handleSlotClick = (slot) => {
    if (slot.status !== 'available') return

    setSelectedSlotTimes((prev) => {
      let updated
      if (prev.includes(slot.startTime)) {
        updated = prev.filter((t) => t !== slot.startTime)
      } else {
        updated = [...prev, slot.startTime].sort()
      }

      if (onSlotSelect) {
        if (updated.length === 0) {
          onSlotSelect(null)
        } else {
          const selectedList = updated.map((timeStr) => {
            const found = slots.find((s) => s.startTime === timeStr)
            return (
              found || {
                startTime: timeStr,
                endTime: `${String(Number(timeStr.split(':')[0]) + 1).padStart(2, '0')}:00`,
                rateType: slot.rateType,
                price: slot.price,
              }
            )
          })

          onSlotSelect({
            startTime: selectedList[0].startTime,
            endTime: selectedList[selectedList.length - 1].endTime,
            durationHours: selectedList.length,
            selectedSlots: updated,
            slots: selectedList,
            rateType: selectedList[0].rateType,
            price: selectedList.reduce((sum, s) => sum + (s.price || 0), 0),
          })
        }
      }

      return updated
    })
  }

  const getReasonIcon = (reason) => {
    switch (reason) {
      case 'tournament':
        return <Trophy className="w-3 h-3 text-[#79420D]" />
      case 'maintenance':
        return <Wrench className="w-3 h-3 text-[#79420D]" />
      default:
        return <ShieldAlert className="w-3 h-3 text-[#922B27]" />
    }
  }

  return (
    <div className="bg-white border border-[#D7E0D9] rounded-3xl p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Calendar Header: Date selector, Timezone, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8E3]">
        <div>
          <h3 className="text-base font-bold text-[#17231B] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#267A45]" />
            <span>Select Available Time Slots</span>
          </h3>
          <p className="text-[11px] text-[#526258] mt-0.5">
            Times displayed in <strong className="text-[#17231B] font-mono">{timezone}</strong>. Click any available slot to select or unselect. You can pick multiple slots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#17231B] bg-[#F6F8F6] px-3 py-1.5 rounded-xl border border-[#D7E0D9] focus-within:border-[#267A45]">
            <Calendar className="w-3.5 h-3.5 text-[#267A45]" />
            <input
              type="date"
              value={currentDate}
              min={todayStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none text-[#17231B] focus:outline-none cursor-pointer text-xs"
            />
          </label>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
            title="Refresh availability snapshot"
            aria-label="Refresh availability"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#267A45]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Slots Confirmation Strip */}
      {selectedSlotTimes.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] space-y-2.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D6537]">
              <Clock className="w-4 h-4 text-[#267A45]" />
              <span>
                Selected ({selectedSlotTimes.length}{' '}
                {selectedSlotTimes.length === 1 ? 'Slot' : 'Slots'} • {selectedSlotTimes.length}{' '}
                {selectedSlotTimes.length === 1 ? 'Hour' : 'Hours'}):
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSlotTimes([])
                if (onSlotSelect) onSlotSelect(null)
              }}
              className="text-xs text-[#526258] hover:text-[#922B27] font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#D7E0D9] hover:border-[#F8D2CE] transition-all cursor-pointer self-start sm:self-auto"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#C9DFCE]/60">
            {selectedSlotTimes.map((st) => {
              const foundSlot = slots.find((s) => s.startTime === st)
              const label = foundSlot ? `${foundSlot.startTime} - ${foundSlot.endTime}` : st
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#C9DFCE] text-xs font-mono font-bold text-[#1D6537] shadow-2xs"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      const updated = selectedSlotTimes.filter((t) => t !== st)
                      setSelectedSlotTimes(updated)
                      if (onSlotSelect) {
                        if (updated.length === 0) onSlotSelect(null)
                        else {
                          const selectedList = updated.map(
                            (timeStr) =>
                              slots.find((s) => s.startTime === timeStr) || {
                                startTime: timeStr,
                                endTime: `${String(Number(timeStr.split(':')[0]) + 1).padStart(2, '0')}:00`,
                              }
                          )
                          onSlotSelect({
                            startTime: selectedList[0].startTime,
                            endTime: selectedList[selectedList.length - 1].endTime,
                            durationHours: selectedList.length,
                            selectedSlots: updated,
                            slots: selectedList,
                          })
                        }
                      }
                    }}
                    className="text-[#647168] hover:text-[#922B27] cursor-pointer text-sm font-sans"
                    title="Remove slot"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Availability Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#526258]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#267A45]"></span>
          <span>Available (Click to select)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#69756D]"></span>
          <span>Booked (Reserved)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#922B27]"></span>
          <span>Blocked (Maintenance)</span>
        </span>
      </div>

      {/* Slot Grid States */}
      {isLoading ? (
        <div className="py-16 text-center text-[#526258] text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-[#267A45] animate-spin" />
          <span>Fetching real-time slot availability and rate estimates...</span>
        </div>
      ) : isError ? (
        <div className="p-4 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
            <span>Failed to load availability: {error?.message}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 rounded-xl bg-white border border-[#F8D2CE] text-[#922B27] hover:bg-[#FDF0EF] text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-12 text-center text-[#526258] text-xs">
          No operating slots generated for this turf schedule on {currentDate}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {slots.map((slot) => {
            const isAvailable = slot.status === 'available'
            const isBlocked = slot.status === 'blocked'
            const isBooked = slot.status === 'booked'
            const isSelected = selectedSlotTimes.includes(slot.startTime)

            return (
              <div
                key={`${slot.startTime}-${slot.endTime}`}
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all select-none ${
                  isSelected
                    ? 'bg-[#E1F0E5] border-2 border-[#267A45] shadow-xs'
                    : isAvailable
                      ? 'bg-white border-[#D7E0D9] hover:border-[#267A45] hover:bg-[#F0F6F1] cursor-pointer'
                      : isBlocked
                        ? 'bg-[#FDF0EF] border-[#F8D2CE] cursor-not-allowed opacity-90'
                        : 'bg-[#EDF1EE] border-[#D7E0D9] cursor-not-allowed opacity-80'
                }`}
                onClick={() => handleSlotClick(slot)}
              >
                <div>
                  {/* Time Range */}
                  <div className="flex items-center justify-between font-mono font-bold text-xs text-[#17231B] mb-2">
                    <span className={isSelected ? 'text-[#1D6537] font-black' : ''}>{slot.startTime}</span>
                    <span className="text-[10px] text-[#526258] font-normal">to {slot.endTime}</span>
                  </div>

                  {/* Status Indicator */}
                  {isBlocked ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#FDF0EF] text-[#922B27] border border-[#F8D2CE]">
                        {getReasonIcon(slot.reason)}
                        <span className="capitalize">{slot.reason || 'Blocked'}</span>
                      </span>
                      {slot.note && (
                        <p className="text-[10px] text-[#922B27] truncate" title={slot.note}>
                          {slot.note}
                        </p>
                      )}
                    </div>
                  ) : isBooked ? (
                    <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#EDF1EE] text-[#69756D] border border-[#D7E0D9]">
                      Reserved
                    </span>
                  ) : (
                    <div className="flex items-center">
                      <span className="font-mono font-black text-sm text-[#267A45]">
                        {slot.priceFormatted || `₹${(slot.price / 100).toFixed(0)}`}
                      </span>
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
                          ? 'bg-[#267A45] text-white shadow-xs font-black'
                          : 'bg-[#E7F3E9] hover:bg-[#267A45] text-[#1D6537] hover:text-white border border-[#C9DFCE]'
                      }`}
                    >
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                      {!isSelected && <ChevronRight className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div className="py-1 text-center text-[10px] font-semibold text-[#69756D]">
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
