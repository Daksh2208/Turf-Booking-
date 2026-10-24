import React, { useState } from 'react'
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
  onSlotSelect,
  onDateChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0]
  const [currentDate, setCurrentDate] = useState(initialDate || todayStr)
  const [startSlotTime, setStartSlotTime] = useState(selectedSlot?.startTime || null)
  const [durationHours, setDurationHours] = useState(selectedSlot?.durationHours || 1)
  const [rangeError, setRangeError] = useState('')

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate)
    setStartSlotTime(null)
    setRangeError('')
    if (onDateChange) onDateChange(newDate)
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

  // Helper to validate and calculate range
  const evaluateRange = (startKey, targetDuration) => {
    if (!startKey || slots.length === 0) return null

    const startIndex = slots.findIndex((s) => s.startTime === startKey)
    if (startIndex === -1) return null

    const selectedSlotsList = []
    let currentEnd = null

    for (let i = 0; i < targetDuration; i++) {
      const slotIndex = startIndex + i
      if (slotIndex >= slots.length) {
        return {
          valid: false,
          maxContinuous: i,
          reason: 'Selected duration extends past the arena closing time.',
        }
      }

      const slot = slots[slotIndex]
      if (slot.status !== 'available') {
        return {
          valid: false,
          maxContinuous: i,
          reason: `Slot ${slot.startTime} - ${slot.endTime} is ${slot.status}. Multi-hour bookings must be continuous available slots.`,
        }
      }

      selectedSlotsList.push(slot)
      currentEnd = slot.endTime
    }

    return {
      valid: true,
      startSlot: slots[startIndex],
      endSlot: selectedSlotsList[selectedSlotsList.length - 1],
      startTime: slots[startIndex].startTime,
      endTime: currentEnd,
      durationHours: targetDuration,
      selectedSlots: selectedSlotsList.map((s) => s.startTime),
      slotList: selectedSlotsList,
    }
  }

  // Handle slot card click
  const handleSlotClick = (slot) => {
    if (slot.status !== 'available') return

    setRangeError('')

    if (!startSlotTime) {
      setStartSlotTime(slot.startTime)
      setDurationHours(1)
      if (onSlotSelect) {
        onSlotSelect({
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationHours: 1,
          selectedSlots: [slot.startTime],
          rateType: slot.rateType,
          price: slot.price,
        })
      }
      return
    }

    const startIndex = slots.findIndex((s) => s.startTime === startSlotTime)
    const clickedIndex = slots.findIndex((s) => s.startTime === slot.startTime)

    if (clickedIndex < startIndex) {
      setStartSlotTime(slot.startTime)
      setDurationHours(1)
      if (onSlotSelect) {
        onSlotSelect({
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationHours: 1,
          selectedSlots: [slot.startTime],
          rateType: slot.rateType,
          price: slot.price,
        })
      }
    } else if (clickedIndex === startIndex) {
      setDurationHours(1)
      if (onSlotSelect) {
        onSlotSelect({
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationHours: 1,
          selectedSlots: [slot.startTime],
          rateType: slot.rateType,
          price: slot.price,
        })
      }
    } else {
      const newDuration = clickedIndex - startIndex + 1
      const evalRes = evaluateRange(startSlotTime, newDuration)

      if (evalRes && evalRes.valid) {
        setDurationHours(newDuration)
        if (onSlotSelect) {
          onSlotSelect(evalRes)
        }
      } else {
        setRangeError(
          evalRes?.reason || 'Some hours in between are occupied. Please select contiguous slots.'
        )
      }
    }
  }

  // Handle duration button changes
  const handleDurationChange = (newHours) => {
    if (newHours < 1) return
    if (!startSlotTime) return

    setRangeError('')
    const evalRes = evaluateRange(startSlotTime, newHours)

    if (evalRes && evalRes.valid) {
      setDurationHours(newHours)
      if (onSlotSelect) {
        onSlotSelect(evalRes)
      }
    } else {
      setRangeError(
        evalRes?.reason ||
        `Cannot extend to ${newHours} hours because an intermediate slot is booked or blocked.`
      )
    }
  }

  const activeRange = evaluateRange(startSlotTime, durationHours)

  const isSlotInSelection = (slot) => {
    if (!activeRange || !activeRange.valid) {
      return slot.startTime === startSlotTime
    }
    return activeRange.selectedSlots.includes(slot.startTime)
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
            <span>Select Available Time Slot</span>
          </h3>
          <p className="text-[11px] text-[#526258] mt-0.5">
            Times displayed in <strong className="text-[#17231B] font-mono">{timezone}</strong>. Select start slot and book 1 to 5 continuous hours.
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

      {/* Multi-Hour Booking Selector Tool */}
      {startSlotTime && (
        <div className="p-4 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] space-y-3 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D6537]">
                <Clock className="w-4 h-4 text-[#267A45]" />
                <span>
                  Booking Window: <span className="font-mono text-[#17231B] text-sm">{activeRange?.startTime || startSlotTime}</span> to{' '}
                  <span className="font-mono text-[#17231B] text-sm">{activeRange?.endTime || '...'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE] text-[10px] font-black">
                  {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
                </span>
              </div>
              <p className="text-[11px] text-[#526258]">
                Dynamic pricing applies per hourly segment (regular base rates and peak evening rates).
              </p>
            </div>

            {/* Stepper + Quick Hour Chips */}
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="text-[11px] font-semibold text-[#526258] mr-1 hidden sm:inline">
                Duration:
              </span>
              <button
                type="button"
                onClick={() => handleDurationChange(durationHours - 1)}
                disabled={durationHours <= 1}
                className="w-8 h-8 rounded-lg bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed text-[#17231B] flex items-center justify-center transition-colors cursor-pointer"
                title="Decrease 1 hour"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {[1, 2, 3, 4, 5].map((hr) => (
                <button
                  key={hr}
                  type="button"
                  onClick={() => handleDurationChange(hr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    durationHours === hr
                      ? 'bg-[#267A45] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F0F6F1] text-[#46564A] border border-[#D7E0D9]'
                  }`}
                >
                  {hr}h
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleDurationChange(durationHours + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-[#D7E0D9] hover:bg-[#F0F6F1] text-[#17231B] flex items-center justify-center transition-colors cursor-pointer"
                title="Increase 1 hour"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Range Error Alert */}
          {rangeError && (
            <div className="p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
              <span>{rangeError}</span>
            </div>
          )}
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
            const isSelected = isSlotInSelection(slot)
            const isStart = slot.startTime === startSlotTime

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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#267A45]">
                          {slot.priceFormatted || `₹${(slot.price / 100).toFixed(0)}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            slot.rateType === 'weekend_peak' || slot.rateType === 'weekend' || slot.rateType === 'peak'
                              ? 'bg-[#FDF4E7] text-[#79420D] border-[#F6E1C4]'
                              : 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
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
                          ? 'bg-[#267A45] text-white shadow-xs font-black'
                          : 'bg-[#E7F3E9] hover:bg-[#267A45] text-[#1D6537] hover:text-white border border-[#C9DFCE]'
                      }`}
                    >
                      <span>
                        {isStart
                          ? durationHours > 1
                            ? 'Start Slot'
                            : 'Selected'
                          : isSelected
                            ? 'Included'
                            : 'Select'}
                      </span>
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
