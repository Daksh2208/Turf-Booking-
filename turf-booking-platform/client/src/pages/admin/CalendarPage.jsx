import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '../../hooks/useApi'
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  DollarSign,
  TrendingUp,
  MapPin,
  Activity,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  Flame,
  Hourglass,
  Tag,
  ExternalLink,
  Layers,
  Sparkles,
  Eye,
  PlusCircle,
  X,
} from 'lucide-react'
import adminCalendarService from '../../services/admin/calendar.service'
import adminInventoryService from '../../services/admin/inventory.service'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { useBookingReservation } from '../../context/BookingReservationContext'

// Helper: Get today's YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper: Format YYYY-MM-DD to human readable string
function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Helper: Format month & year
function formatMonthYear(dateStr) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Weekday names
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const CalendarPage = () => {
  const queryClient = useQueryClient()
  const { subscribeToTurfDate } = useBookingReservation()

  // Main state
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week' | 'day'
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString())
  const [selectedTurf, setSelectedTurf] = useState('')
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [copiedBookingId, setCopiedBookingId] = useState(false)

  // Block Slot Modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [blockFormTurf, setBlockFormTurf] = useState('')
  const [blockFormDate, setBlockFormDate] = useState(getLocalDateString())
  const [blockFormStart, setBlockFormStart] = useState('09:00')
  const [blockFormEnd, setBlockFormEnd] = useState('10:00')
  const [blockFormReason, setBlockFormReason] = useState('maintenance')
  const [blockFormNote, setBlockFormNote] = useState('')
  const [blockFormError, setBlockFormError] = useState('')

  // Unblock Slot Confirmation Modal state
  const [unblockTarget, setUnblockTarget] = useState(null)
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false)

  // Feedback toasts
  const [toastMessage, setToastMessage] = useState(null)
  const [serverError, setServerError] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  // 1. Fetch available turfs list for filter dropdowns
  const { data: turfsData } = useQuery({
    queryKey: ['adminCalendarTurfs'],
    queryFn: () => adminInventoryService.getTurfs({ limit: 100 }),
  })
  const turfsList = turfsData?.turfs || []

  // Default blockFormTurf when turfs load
  useEffect(() => {
    if (turfsList.length > 0 && !blockFormTurf) {
      setBlockFormTurf(turfsList[0]._id)
    }
  }, [turfsList, blockFormTurf])

  // 2. Fetch sports list for filter dropdown
  const { data: sportsData } = useQuery({
    queryKey: ['adminCalendarSports'],
    queryFn: () => adminInventoryService.getSports({ limit: 100 }),
  })
  const sportsList = sportsData?.sports || []

  // Date ranges based on view mode
  const { monthStart, monthEnd, weekStart, weekEnd } = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    // Month range
    const firstDay = new Date(Date.UTC(y, m - 1, 1))
    const lastDay = new Date(Date.UTC(y, m, 0))
    const mStart = firstDay.toISOString().slice(0, 10)
    const mEnd = lastDay.toISOString().slice(0, 10)

    // Week range (Monday to Sunday)
    const target = new Date(Date.UTC(y, m - 1, d))
    const dayOfWeek = target.getUTCDay() // 0 = Sun, 1 = Mon ...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const mon = new Date(target)
    mon.setUTCDate(target.getUTCDate() + diffToMon)
    const sun = new Date(mon)
    sun.setUTCDate(mon.getUTCDate() + 6)
    const wStart = mon.toISOString().slice(0, 10)
    const wEnd = sun.toISOString().slice(0, 10)

    return {
      monthStart: mStart,
      monthEnd: mEnd,
      weekStart: wStart,
      weekEnd: wEnd,
    }
  }, [selectedDate])

  // 3. Month View Data Query
  const {
    data: monthData,
    isLoading: isMonthLoading,
    isFetching: isMonthFetching,
    refetch: refetchMonth,
    error: monthQueryError,
  } = useQuery({
    queryKey: [
      'adminCalendarMonth',
      {
        startDate: monthStart,
        endDate: monthEnd,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      },
    ],
    queryFn: () =>
      adminCalendarService.getCalendarSummary({
        startDate: monthStart,
        endDate: monthEnd,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      }),
    enabled: viewMode === 'month',
  })

  // 4. Week View Data Query
  const {
    data: weekData,
    isLoading: isWeekLoading,
    isFetching: isWeekFetching,
    refetch: refetchWeek,
    error: weekQueryError,
  } = useQuery({
    queryKey: [
      'adminCalendarWeek',
      {
        startDate: weekStart,
        endDate: weekEnd,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      },
    ],
    queryFn: () =>
      adminCalendarService.getWeekSchedule({
        startDate: weekStart,
        endDate: weekEnd,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      }),
    enabled: viewMode === 'week',
  })

  // 5. Day View Data Query
  const {
    data: dayData,
    isLoading: isDayLoading,
    isFetching: isDayFetching,
    refetch: refetchDay,
    error: dayQueryError,
  } = useQuery({
    queryKey: [
      'adminCalendarDay',
      {
        date: selectedDate,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      },
    ],
    queryFn: () =>
      adminCalendarService.getDaySchedule({
        date: selectedDate,
        turfId: selectedTurf,
        sportId: selectedSport,
        status: selectedStatus,
        paymentStatus: selectedPaymentStatus,
      }),
    enabled: viewMode === 'day',
  })

  // Live Socket.IO Updates listener
  useEffect(() => {
    const unsub = subscribeToTurfDate(
      selectedTurf || (turfsList[0]?._id ? String(turfsList[0]._id) : null),
      selectedDate,
      (payload) => {
        // Authoritative broadcast from backend: silently refresh calendar data
        queryClient.invalidateQueries({ queryKey: ['adminCalendarMonth'] })
        queryClient.invalidateQueries({ queryKey: ['adminCalendarWeek'] })
        queryClient.invalidateQueries({ queryKey: ['adminCalendarDay'] })
        queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
        queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      }
    )
    return () => unsub()
  }, [selectedTurf, selectedDate, turfsList, subscribeToTurfDate, queryClient])

  // Invalidate when mutations succeed
  const invalidateAllCalendar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['adminCalendarMonth'] })
    queryClient.invalidateQueries({ queryKey: ['adminCalendarWeek'] })
    queryClient.invalidateQueries({ queryKey: ['adminCalendarDay'] })
    queryClient.invalidateQueries({ queryKey: ['adminBookings'] })
    queryClient.invalidateQueries({ queryKey: ['adminBlockedSlots'] })
  }, [queryClient])

  // Mutation: Create Blocked Slot
  const blockMutation = useMutation({
    mutationFn: (payload) => adminCalendarService.createBlockedSlot(payload),
    onSuccess: (data) => {
      invalidateAllCalendar()
      setIsBlockModalOpen(false)
      setBlockFormNote('')
      setBlockFormError('')
      showToast(`Slot blocked successfully (${data.startTime} - ${data.endTime}).`)
    },
    onError: (err) => {
      setBlockFormError(err.response?.data?.message || err.message || 'Failed to block slot.')
    },
  })

  // Mutation: Delete / Unblock Slot
  const unblockMutation = useMutation({
    mutationFn: (id) => adminCalendarService.deleteBlockedSlot(id),
    onSuccess: () => {
      invalidateAllCalendar()
      setIsUnblockModalOpen(false)
      setUnblockTarget(null)
      showToast('Slot unblocked successfully. Re-opened for customer reservations.')
    },
    onError: (err) => {
      setServerError(err.response?.data?.message || err.message || 'Failed to unblock slot.')
    },
  })

  // Navigation handlers
  const handlePrev = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    if (viewMode === 'month') {
      date.setUTCMonth(date.getUTCMonth() - 1)
    } else if (viewMode === 'week') {
      date.setUTCDate(date.getUTCDate() - 7)
    } else {
      date.setUTCDate(date.getUTCDate() - 1)
    }
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const handleNext = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    if (viewMode === 'month') {
      date.setUTCMonth(date.getUTCMonth() + 1)
    } else if (viewMode === 'week') {
      date.setUTCDate(date.getUTCDate() + 7)
    } else {
      date.setUTCDate(date.getUTCDate() + 1)
    }
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    setSelectedDate(getLocalDateString())
  }

  const handleClearFilters = () => {
    setSelectedTurf('')
    setSelectedSport('')
    setSelectedStatus('')
    setSelectedPaymentStatus('')
  }

  const hasActiveFilters = Boolean(
    selectedTurf || selectedSport || selectedStatus || selectedPaymentStatus
  )

  // Current active summary metrics to display
  const currentSummary = useMemo(() => {
    if (viewMode === 'month') return monthData?.summary || {}
    if (viewMode === 'day') return dayData?.summary || {}
    // Calculate week-wide summary from weekData
    if (viewMode === 'week' && weekData?.days) {
      let bCount = 0
      let occ = 0
      let blk = 0
      let hld = 0
      let rev = 0
      for (const d of weekData.days) {
        bCount += d.totalBookings || 0
        occ += d.occupiedSlots || 0
        blk += d.blockedSlots || 0
        hld += d.heldSlots || 0
        rev += d.revenuePaise || 0
      }
      return {
        totalBookings: bCount,
        occupiedSlots: occ,
        blockedSlots: blk,
        heldSlots: hld,
        totalRevenuePaise: rev,
        totalRevenueFormatted: `₹${(rev / 100).toFixed(2)}`,
      }
    }
    return {}
  }, [viewMode, monthData, weekData, dayData])

  // Open block modal for a specific slot in Day or Week view
  const handleOpenBlockModalForSlot = (dateStr, startTime, endTime, turfId) => {
    const today = getLocalDateString()
    if (dateStr < today) {
      showToast('Cannot block slots in past dates. Historical records are read-only.', 'error')
      return
    }
    setBlockFormDate(dateStr || selectedDate)
    setBlockFormStart(startTime || '09:00')
    setBlockFormEnd(endTime || '10:00')
    if (turfId) setBlockFormTurf(turfId)
    else if (selectedTurf) setBlockFormTurf(selectedTurf)
    else if (turfsList[0]?._id) setBlockFormTurf(turfsList[0]._id)
    setBlockFormReason('maintenance')
    setBlockFormNote('')
    setBlockFormError('')
    setIsBlockModalOpen(true)
  }

  // Submit Block Slot form
  const handleBlockSlotSubmit = (e) => {
    e.preventDefault()
    setBlockFormError('')

    if (!blockFormTurf) {
      setBlockFormError('Please select a turf arena.')
      return
    }
    if (!blockFormDate) {
      setBlockFormError('Please select a date.')
      return
    }
    if (blockFormDate < getLocalDateString()) {
      setBlockFormError('Cannot block slots on past dates. Historical slots are read-only.')
      return
    }
    if (blockFormStart >= blockFormEnd) {
      setBlockFormError('End time must be strictly after start time.')
      return
    }

    blockMutation.mutate({
      turf: blockFormTurf,
      date: blockFormDate,
      startTime: blockFormStart,
      endTime: blockFormEnd,
      reason: blockFormReason,
      note: blockFormNote,
    })
  }

  // Open booking details drawer/modal
  const handleViewBookingDetails = (booking) => {
    setSelectedBooking(booking)
    setIsDetailsOpen(true)
  }

  // Copy Booking ID
  const handleCopyBookingId = (id) => {
    if (!id) return
    navigator.clipboard.writeText(id)
    setCopiedBookingId(true)
    setTimeout(() => setCopiedBookingId(false), 2000)
  }

  // Render Month Calendar Grid
  const renderMonthGrid = () => {
    if (!monthData?.days) return null
    const daysMap = new Map(monthData.days.map((d) => [d.date, d]))

    const [y, m] = selectedDate.split('-').map(Number)
    const firstDay = new Date(Date.UTC(y, m - 1, 1))
    const lastDay = new Date(Date.UTC(y, m, 0))

    // Determine leading days from previous month to align Monday (1) through Sunday (0)
    let leadCount = firstDay.getUTCDay() - 1
    if (leadCount === -1) leadCount = 6 // Sunday

    const cells = []

    // Leading days
    for (let i = leadCount; i > 0; i--) {
      const prevDate = new Date(firstDay)
      prevDate.setUTCDate(firstDay.getUTCDate() - i)
      const prevStr = prevDate.toISOString().slice(0, 10)
      cells.push({
        dateStr: prevStr,
        dayNum: prevDate.getUTCDate(),
        isCurrentMonth: false,
        data: daysMap.get(prevStr) || null,
      })
    }

    // Days in current month
    for (let i = 1; i <= lastDay.getUTCDate(); i++) {
      const curDate = new Date(Date.UTC(y, m - 1, i))
      const curStr = curDate.toISOString().slice(0, 10)
      cells.push({
        dateStr: curStr,
        dayNum: i,
        isCurrentMonth: true,
        data: daysMap.get(curStr) || null,
      })
    }

    // Trailing days to complete the 7-column grid
    const totalCells = cells.length
    const trailCount = (7 - (totalCells % 7)) % 7
    for (let i = 1; i <= trailCount; i++) {
      const nextDate = new Date(lastDay)
      nextDate.setUTCDate(lastDay.getUTCDate() + i)
      const nextStr = nextDate.toISOString().slice(0, 10)
      cells.push({
        dateStr: nextStr,
        dayNum: nextDate.getUTCDate(),
        isCurrentMonth: false,
        data: daysMap.get(nextStr) || null,
      })
    }

    const todayStr = getLocalDateString()

    return (
      <div className="bg-white rounded-2xl border border-[#D7E0D9] shadow-xs overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-[#D7E0D9] bg-[#F9FBF9] text-xs font-bold text-[#46564A] uppercase tracking-wider text-center py-3">
          {WEEKDAYS.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E7EDE8]">
          {cells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            const dayData = cell.data
            const hasBookings = dayData && dayData.totalBookings > 0
            const hasBlocks = dayData && dayData.blockedSlots > 0
            const hasHighActivity = dayData?.hasHighActivity

            return (
              <div
                key={cell.dateStr + idx}
                onClick={() => {
                  setSelectedDate(cell.dateStr)
                  setViewMode('day')
                }}
                className={`min-h-[110px] sm:min-h-[130px] p-2 sm:p-2.5 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'bg-[#FAFCFA]/60 text-slate-400'
                    : 'bg-white hover:bg-[#F2F7F3]'
                } ${isSelected ? 'ring-2 ring-inset ring-[#267A45] bg-[#F2F7F3]' : ''}`}
                title={`Click to view operational day schedule for ${cell.dateStr}`}
              >
                {/* Top Row: Date Number & Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full ${
                      isToday
                        ? 'bg-[#267A45] text-white shadow-xs'
                        : isSelected
                        ? 'bg-[#E7F3E9] text-[#1D6537]'
                        : 'text-[#17231B]'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {hasHighActivity && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
                      title="High booking activity day (≥70% occupancy)"
                    >
                      <Flame className="w-3 h-3 text-orange-600" />
                      <span className="hidden sm:inline">Busy</span>
                    </span>
                  )}
                </div>

                {/* Middle: Counts & Occupancy */}
                <div className="my-1.5 space-y-1 text-left">
                  {hasBookings ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D6537] bg-[#E7F3E9] px-1.5 py-0.5 rounded-md border border-[#C9DFCE]">
                      <CalendarDays className="w-3 h-3" />
                      <span>{dayData.totalBookings} {dayData.totalBookings === 1 ? 'booking' : 'bookings'}</span>
                    </div>
                  ) : null}

                  {dayData && (dayData.occupiedSlots > 0 || dayData.blockedSlots > 0) ? (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#46564A]">
                      <span className="font-medium">
                        {dayData.occupiedSlots} {dayData.occupiedSlots === 1 ? 'slot' : 'slots'} booked
                      </span>
                      {hasBlocks && (
                        <span className="text-purple-700 font-bold bg-purple-50 px-1 rounded">
                          {dayData.blockedSlots} blocked
                        </span>
                      )}
                    </div>
                  ) : null}

                  {dayData && dayData.revenuePaise > 0 ? (
                    <div className="text-[10px] font-bold text-[#1D6537]">
                      {dayData.revenueFormatted}
                    </div>
                  ) : null}
                </div>

                {/* Bottom indicator: Empty or Available */}
                <div className="text-[10px] text-[#718575] flex items-center justify-between">
                  {dayData?.totalSlots > 0 ? (
                    <span>
                      {dayData.availableSlots} free of {dayData.totalSlots}
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">View Day</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Week Time Grid
  const renderWeekGrid = () => {
    if (!weekData?.days) return null
    const operatingOpen = Number((weekData.operatingHours?.open || '06:00').split(':')[0])
    const operatingClose = Number((weekData.operatingHours?.close || '23:00').split(':')[0])

    const hours = []
    for (let h = operatingOpen; h < operatingClose; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`)
    }

    const todayStr = getLocalDateString()

    return (
      <div className="bg-white rounded-2xl border border-[#D7E0D9] shadow-xs overflow-x-auto">
        <div className="min-w-[850px]">
          {/* Header Row: Days */}
          <div className="grid grid-cols-8 border-b border-[#D7E0D9] bg-[#F9FBF9] text-center sticky top-0 z-10">
            <div className="p-3 text-xs font-bold text-[#46564A] uppercase tracking-wider border-r border-[#D7E0D9]">
              Time
            </div>
            {weekData.days.map((d) => {
              const isToday = d.date === todayStr
              const [y, m, day] = d.date.split('-').map(Number)
              const dt = new Date(Date.UTC(y, m - 1, day))
              const weekdayStr = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

              return (
                <div
                  key={d.date}
                  onClick={() => {
                    setSelectedDate(d.date)
                    setViewMode('day')
                  }}
                  className={`p-2.5 border-r border-[#D7E0D9] last:border-r-0 cursor-pointer hover:bg-[#F0F6F1] transition-colors ${
                    isToday ? 'bg-[#E7F3E9]/50' : ''
                  }`}
                >
                  <div className="text-xs font-semibold text-[#46564A]">{weekdayStr}</div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                        isToday ? 'bg-[#267A45] text-white' : 'text-[#17231B]'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#1D6537] font-medium mt-1">
                    {d.totalBookings} {d.totalBookings === 1 ? 'booking' : 'bookings'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-[#E7EDE8]">
            {hours.map((hourStr) => {
              const nextHour = `${String(Number(hourStr.split(':')[0]) + 1).padStart(2, '0')}:00`

              return (
                <div key={hourStr} className="grid grid-cols-8 min-h-[70px]">
                  {/* Time Axis Column */}
                  <div className="p-2 text-xs font-semibold text-[#46564A] border-r border-[#D7E0D9] bg-[#FAFCFA] flex items-center justify-center">
                    {hourStr}
                  </div>

                  {/* 7 Day Event Columns */}
                  {weekData.days.map((day) => {
                    const matchingEvents = (day.events || []).filter((ev) => {
                      return hourStr < ev.endTime && nextHour > ev.startTime
                    })

                    const isPastDay = day.date < todayStr

                    return (
                      <div
                        key={day.date + hourStr}
                        className={`p-1.5 border-r border-[#D7E0D9] last:border-r-0 relative group flex flex-col gap-1 ${
                          day.isToday ? 'bg-[#F9FCFA]' : 'bg-white'
                        }`}
                      >
                        {matchingEvents.length > 0 ? (
                          matchingEvents.map((ev) => {
                            if (ev.type === 'booking') {
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => handleViewBookingDetails(ev)}
                                  className="p-1.5 rounded-lg bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-left cursor-pointer hover:bg-[#D9ECD8] transition-all shadow-2xs"
                                  title={`Booking: ${ev.bookingId} - ${ev.title}`}
                                >
                                  <div className="text-[11px] font-bold truncate flex items-center justify-between">
                                    <span>{ev.title}</span>
                                    <span className="text-[9px] uppercase font-bold px-1 rounded bg-[#267A45] text-white">
                                      {ev.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#46564A] truncate">
                                    {ev.startTime} - {ev.endTime} • {ev.sport?.name || 'Sport'}
                                  </div>
                                </div>
                              )
                            } else if (ev.type === 'blocked') {
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => {
                                    setUnblockTarget({
                                      _id: ev.id,
                                      turfName: weekData.turf?.name || 'Selected Arena',
                                      date: day.date,
                                      startTime: ev.startTime,
                                      endTime: ev.endTime,
                                      reason: ev.reason,
                                      note: ev.note,
                                    })
                                    setIsUnblockModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-left cursor-pointer hover:bg-purple-100 transition-all shadow-2xs"
                                  title={`Blocked: ${ev.reason}. Click to unblock.`}
                                >
                                  <div className="text-[11px] font-bold truncate flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-purple-600" />
                                    <span>Blocked: {ev.reason}</span>
                                  </div>
                                  <div className="text-[10px] text-purple-700 truncate">
                                    {ev.startTime} - {ev.endTime}
                                  </div>
                                </div>
                              )
                            } else if (ev.type === 'held') {
                              return (
                                <div
                                  key={ev.id}
                                  className="p-1.5 rounded-lg bg-amber-50 border border-dashed border-amber-300 text-amber-800 text-left shadow-2xs"
                                  title="Temporary Customer Hold"
                                >
                                  <div className="text-[11px] font-bold truncate flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Temp Hold</span>
                                  </div>
                                  <div className="text-[10px] text-amber-700 truncate">
                                    {ev.subtitle}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })
                        ) : (
                          // Available slot cell
                          <div className="w-full h-full flex items-center justify-center">
                            {!isPastDay && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenBlockModalForSlot(
                                    day.date,
                                    hourStr,
                                    nextHour,
                                    weekData.turf?._id
                                  )
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[11px] font-semibold text-[#267A45] hover:bg-[#E7F3E9] rounded-md flex items-center gap-0.5 cursor-pointer"
                                title="Click to block this time slot"
                              >
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px]">Block</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render Day Operational Schedule
  const renderDaySchedule = () => {
    if (!dayData?.slots) return null

    const todayStr = getLocalDateString()
    const isPastDate = dayData.isPast

    return (
      <div className="space-y-4">
        {/* Notice for Past Dates */}
        {isPastDate && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Historical Viewing Mode:</strong> You are browsing past bookings and slots for{' '}
              {formatDisplayDate(dayData.date)}. Past slots are strictly read-only and cannot be blocked or modified.
            </span>
          </div>
        )}

        {/* Operating Hours Bar */}
        <div className="p-4 bg-white rounded-2xl border border-[#D7E0D9] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#17231B]">{dayData.turf?.name || 'Selected Arena'}</h3>
              <p className="text-xs text-[#46564A]">
                Operating Hours: {dayData.operatingHours?.open} - {dayData.operatingHours?.close} •{' '}
                {dayData.slotDurationMinutes} min slot duration • Timezone: {dayData.timezone}
              </p>
            </div>
          </div>

          {!isPastDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenBlockModalForSlot(dayData.date, '12:00', '13:00', dayData.turf?._id)}
              className="gap-1.5 text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5 text-[#267A45]" />
              <span>Block Custom Time Range</span>
            </Button>
          )}
        </div>

        {/* Time Slots Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {dayData.slots.map((slot, idx) => {
            const isBooked = slot.status === 'booked' || slot.status === 'completed' || slot.booking
            const isBlocked = slot.status === 'blocked'
            const isHeld = slot.status === 'held'
            const isAvailable = slot.status === 'available'

            return (
              <div
                key={slot.startTime + idx}
                className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  isBooked
                    ? 'bg-white border-[#C9DFCE] shadow-xs hover:border-[#267A45]'
                    : isBlocked
                    ? 'bg-purple-50/70 border-purple-200'
                    : isHeld
                    ? 'bg-amber-50/70 border-dashed border-amber-300'
                    : 'bg-white border-[#D7E0D9] hover:border-[#267A45] hover:bg-[#F2F7F3]/40'
                }`}
              >
                {/* Slot Top Header */}
                <div className="flex items-center justify-between gap-2 border-b border-inherit pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#46564A]" />
                    <span className="font-extrabold text-sm text-[#17231B]">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isBooked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{slot.status === 'completed' ? 'Completed' : 'Booked'}</span>
                      </span>
                    )}
                    {isBlocked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        <Lock className="w-3 h-3" />
                        <span>Blocked</span>
                      </span>
                    )}
                    {isHeld && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Hourglass className="w-3 h-3" />
                        <span>Temp Hold</span>
                      </span>
                    )}
                    {isAvailable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#267A45] border border-[#C9DFCE]">
                        <span>Available</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Slot Body Details */}
                <div className="py-3 text-xs space-y-2">
                  {isBooked && slot.booking && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17231B] text-sm">
                          {slot.booking.customer?.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#267A45]">
                          {slot.booking.bookingId}
                        </span>
                      </div>
                      <div className="text-[#46564A] flex items-center gap-2">
                        <span>Sport: <strong>{slot.booking.sport?.name || 'Sport'}</strong></span>
                        <span>•</span>
                        <span className="capitalize">
                          Payment: <strong className={slot.booking.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>{slot.booking.paymentStatus}</strong>
                        </span>
                      </div>
                      <div className="text-[#46564A]">
                        Amount: <strong>{slot.booking.totalAmountFormatted}</strong> ({slot.booking.paymentMethod})
                      </div>
                    </div>
                  )}

                  {isBlocked && slot.blocked && (
                    <div className="space-y-1">
                      <div className="font-bold text-purple-900 capitalize">
                        Reason: {slot.blocked.reason}
                      </div>
                      {slot.blocked.note && (
                        <p className="text-purple-700 italic">"{slot.blocked.note}"</p>
                      )}
                      <div className="text-[10px] text-purple-600">
                        By: {slot.blocked.createdBy}
                      </div>
                    </div>
                  )}

                  {isHeld && slot.held && (
                    <div className="space-y-1 text-amber-800">
                      <div>Held by: <strong>{slot.held.customerName}</strong></div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires in ~{Math.ceil(slot.held.remainingSeconds / 60)} minutes</span>
                      </div>
                    </div>
                  )}

                  {isAvailable && (
                    <div className="flex items-center justify-between text-[#46564A]">
                      <span>Rate: <strong className="capitalize">{slot.rateType}</strong></span>
                      <span className="font-bold text-[#17231B]">{slot.priceFormatted}</span>
                    </div>
                  )}
                </div>

                {/* Slot Action Footer */}
                <div className="pt-2 border-t border-inherit flex items-center justify-between gap-2">
                  {isBooked && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleViewBookingDetails(slot.booking)}
                        className="text-xs font-bold text-[#267A45] hover:text-[#1D6537] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      <Link
                        to={`/admin/bookings?search=${slot.booking?.bookingId || ''}`}
                        className="text-[11px] font-semibold text-[#46564A] hover:text-[#17231B] flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </>
                  )}

                  {isBlocked && !isPastDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnblockTarget({
                          _id: slot.blocked?._id,
                          turfName: dayData.turf?.name,
                          date: dayData.date,
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                          reason: slot.blocked?.reason,
                          note: slot.blocked?.note,
                        })
                        setIsUnblockModalOpen(true)
                      }}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unblock Slot</span>
                    </button>
                  )}

                  {isAvailable && !isPastDate && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenBlockModalForSlot(
                          dayData.date,
                          slot.startTime,
                          slot.endTime,
                          dayData.turf?._id
                        )
                      }
                      className="text-xs font-bold text-[#46564A] hover:text-[#17231B] flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Block Slot</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const isLoadingCurrent =
    (viewMode === 'month' && isMonthLoading) ||
    (viewMode === 'week' && isWeekLoading) ||
    (viewMode === 'day' && isDayLoading)

  const isFetchingCurrent =
    (viewMode === 'month' && isMonthFetching) ||
    (viewMode === 'week' && isWeekFetching) ||
    (viewMode === 'day' && isDayFetching)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              Booking Calendar & Schedule
            </h1>
            {isFetchingCurrent && (
              <RefreshCw className="w-4 h-4 text-[#267A45] animate-spin" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#46564A] mt-1">
            Real-time visual schedule, historical bookings, and slot management across all turf arenas.
          </p>
        </div>

        {/* View Mode Toggle & Quick Block Button */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleOpenBlockModalForSlot(selectedDate, '09:00', '10:00', selectedTurf)}
            className="gap-1.5 shadow-xs text-xs font-bold cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Block Slot</span>
          </Button>

          {/* View Mode Segmented Controls */}
          <div className="bg-[#E7EDE8] p-1 rounded-xl flex items-center gap-1 border border-[#D7E0D9]">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-[#17231B] shadow-xs'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-[#17231B] shadow-xs'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-[#17231B] shadow-xs'
                  : 'text-[#46564A] hover:text-[#17231B]'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Booking Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Bookings */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Bookings</span>
            <CalendarDays className="w-4 h-4 text-[#267A45]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#17231B]">
            {currentSummary.totalBookings ?? 0}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Confirmed & active</div>
        </div>

        {/* Occupied Slots */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Occupied Slots</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#17231B]">
            {currentSummary.occupiedSlots ?? 0}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Distinct slot hours</div>
        </div>

        {/* Available Slots */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Available Slots</span>
            <CheckCircle2 className="w-4 h-4 text-[#267A45]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1D6537]">
            {currentSummary.availableSlots ?? 0}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Ready for booking</div>
        </div>

        {/* Temporarily Held */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Active Holds</span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {currentSummary.heldSlots ?? 0}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Temporary checkouts</div>
        </div>

        {/* Blocked Slots */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Blocked Slots</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-800">
            {currentSummary.blockedSlots ?? 0}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Maintenance / Closed</div>
        </div>

        {/* Confirmed Revenue */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-xs">
          <div className="flex items-center justify-between text-[#46564A] text-xs font-semibold mb-1">
            <span>Revenue (Paid)</span>
            <TrendingUp className="w-4 h-4 text-[#267A45]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1D6537] truncate">
            {currentSummary.totalRevenueFormatted || currentSummary.revenueFormatted || '₹0.00'}
          </div>
          <div className="text-[10px] text-[#46564A] mt-0.5">Authoritative collected</div>
        </div>
      </div>

      {/* Navigation & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D7E0D9] shadow-xs space-y-4">
        {/* Date Navigation Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl border border-[#D7E0D9] text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-all cursor-pointer"
              title="Previous period"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-[#D7E0D9] text-xs font-bold text-[#17231B] hover:bg-[#F0F6F1] transition-all cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl border border-[#D7E0D9] text-[#46564A] hover:text-[#17231B] hover:bg-[#F0F6F1] transition-all cursor-pointer"
              title="Next period"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Current Active Date/Period Heading */}
            <h2 className="text-sm sm:text-base font-extrabold text-[#17231B] ml-2">
              {viewMode === 'month' && formatMonthYear(selectedDate)}
              {viewMode === 'week' && `Week of ${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)}`}
              {viewMode === 'day' && formatDisplayDate(selectedDate)}
            </h2>
          </div>

          {/* Direct Date Picker Jump */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#46564A] font-semibold hidden sm:inline">Jump to Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45] cursor-pointer"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#E7EDE8]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#46564A] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#267A45]" />
            <span>Filters:</span>
          </div>

          {/* Turf Arena Selector */}
          <select
            value={selectedTurf}
            onChange={(e) => setSelectedTurf(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
          >
            <option value="">All Turf Arenas</option>
            {turfsList.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Sport Filter */}
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
          >
            <option value="">All Sports</option>
            {sportsList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Booking Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
          >
            <option value="">All Booking Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
          >
            <option value="">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Payment Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Slot Status Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#46564A] bg-[#F9FBF9] p-3 rounded-xl border border-[#D7E0D9]">
        <div className="font-bold text-[#17231B]">Status Legend:</div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-[#267A45] bg-white inline-block"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#267A45] inline-block"></span>
            <span>Booked / Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-400 bg-amber-100 inline-block"></span>
            <span>Temporary Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span>
            <span>Blocked (Maintenance)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block"></span>
            <span>Completed / Past</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {isLoadingCurrent ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#D7E0D9] shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-[#267A45] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#46564A]">Loading calendar and schedules...</p>
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthGrid()}
          {viewMode === 'week' && renderWeekGrid()}
          {viewMode === 'day' && renderDaySchedule()}
        </>
      )}

      {/* ======================================================== */}
      {/* Booking Details Modal / Drawer */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Booking Details"
        size="lg"
      >
        {selectedBooking ? (
          <div className="space-y-5 text-sm">
            {/* Header with Reference & Badges */}
            <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-[#46564A] uppercase tracking-wider">
                  Booking Reference
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-lg font-black text-[#17231B]">
                    {selectedBooking.bookingId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyBookingId(selectedBooking.bookingId)}
                    className="p-1 rounded-md text-[#46564A] hover:text-[#17231B] hover:bg-white transition-all cursor-pointer"
                    title="Copy Booking ID"
                  >
                    {copiedBookingId ? (
                      <Check className="w-4 h-4 text-[#267A45]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedBooking.status === 'confirmed'
                      ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                      : selectedBooking.status === 'completed'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : selectedBooking.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedBooking.status}
                </span>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedBooking.paymentStatus === 'paid'
                      ? 'bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  Payment: {selectedBooking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#46564A] uppercase tracking-wider">
                Customer Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white border border-[#D7E0D9]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#267A45]" />
                  <div>
                    <div className="text-[10px] text-[#46564A]">Name</div>
                    <div className="font-bold text-[#17231B]">
                      {selectedBooking.customer?.name || 'Customer'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#267A45]" />
                  <div>
                    <div className="text-[10px] text-[#46564A]">Phone</div>
                    <div className="font-bold text-[#17231B]">
                      {selectedBooking.customer?.phone || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#267A45]" />
                  <div>
                    <div className="text-[10px] text-[#46564A]">Email</div>
                    <div className="font-bold text-[#17231B] truncate">
                      {selectedBooking.customer?.email || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#46564A] uppercase tracking-wider">
                Arena & Schedule
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white border border-[#D7E0D9]">
                <div>
                  <div className="text-[10px] text-[#46564A]">Arena</div>
                  <div className="font-bold text-[#17231B]">{selectedBooking.turf?.name || 'Turf Arena'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#46564A]">Sport</div>
                  <div className="font-bold text-[#17231B]">{selectedBooking.sport?.name || 'Sport'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#46564A]">Time Slot</div>
                  <div className="font-bold text-[#17231B]">
                    {selectedBooking.startTime} - {selectedBooking.endTime}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#46564A]">Duration</div>
                  <div className="font-bold text-[#17231B]">
                    {selectedBooking.durationMinutes || 60} mins
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#46564A] uppercase tracking-wider">
                Financial Breakdown
              </h4>
              <div className="p-4 rounded-xl bg-white border border-[#D7E0D9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#46564A]">Payment Method</span>
                  <span className="font-bold text-[#17231B]">{selectedBooking.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#46564A]">Total Booking Amount</span>
                  <span className="font-bold text-[#17231B]">{selectedBooking.totalAmountFormatted}</span>
                </div>
                {selectedBooking.amountPaid > 0 && (
                  <div className="flex items-center justify-between text-[#1D6537]">
                    <span>Amount Paid</span>
                    <span className="font-bold">{selectedBooking.amountPaidFormatted}</span>
                  </div>
                )}
                {selectedBooking.amountDue > 0 && (
                  <div className="flex items-center justify-between text-amber-700">
                    <span>Outstanding Due</span>
                    <span className="font-bold">{selectedBooking.amountDueFormatted}</span>
                  </div>
                )}
                {selectedBooking.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[#267A45]">
                    <span>Coupon Discount</span>
                    <span>-₹{(selectedBooking.discountAmount / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </Button>
              <Link
                to={`/admin/bookings?search=${selectedBooking.bookingId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#267A45] hover:bg-[#1D6537] transition-all shadow-xs"
              >
                <span>Manage in Bookings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ======================================================== */}
      {/* Block Slot Modal */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Block Arena Time Slot"
        size="md"
      >
        <form onSubmit={handleBlockSlotSubmit} className="space-y-4">
          <p className="text-xs text-[#46564A]">
            Block slot times for maintenance, tournaments, private events, or weather conditions.
            This immediately marks the slots unavailable across customer booking views.
          </p>

          {blockFormError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{blockFormError}</span>
            </div>
          )}

          {/* Turf Selector */}
          <div>
            <label className="block text-xs font-bold text-[#17231B] mb-1">Turf Arena *</label>
            <select
              value={blockFormTurf}
              onChange={(e) => setBlockFormTurf(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
              required
            >
              {turfsList.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-[#17231B] mb-1">Date *</label>
            <input
              type="date"
              value={blockFormDate}
              min={getLocalDateString()}
              onChange={(e) => setBlockFormDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#17231B] mb-1">Start Time *</label>
              <input
                type="time"
                value={blockFormStart}
                onChange={(e) => setBlockFormStart(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17231B] mb-1">End Time *</label>
              <input
                type="time"
                value={blockFormEnd}
                onChange={(e) => setBlockFormEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[#17231B] mb-1">Reason *</label>
            <select
              value={blockFormReason}
              onChange={(e) => setBlockFormReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
            >
              <option value="maintenance">Maintenance</option>
              <option value="tournament">Tournament</option>
              <option value="private_event">Private Event</option>
              <option value="weather">Weather Condition</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-[#17231B] mb-1">Note (Optional)</label>
            <textarea
              value={blockFormNote}
              onChange={(e) => setBlockFormNote(e.target.value)}
              placeholder="e.g. Floodlight maintenance, monsoon pitch conditioning..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-xs font-normal bg-[#F9FBF9] border border-[#D7E0D9] rounded-xl text-[#17231B] focus:outline-none focus:ring-2 focus:ring-[#267A45]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={blockMutation.isLoading}
              className="gap-1.5"
            >
              {blockMutation.isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Block Slot</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* Unblock Slot Confirmation Modal */}
      {/* ======================================================== */}
      <Modal
        isOpen={isUnblockModalOpen}
        onClose={() => setIsUnblockModalOpen(false)}
        title="Confirm Slot Unblock"
        size="sm"
      >
        {unblockTarget ? (
          <div className="space-y-4 text-xs">
            <p className="text-[#46564A]">
              Are you sure you want to unblock this slot? Once unblocked, it will immediately become available for customer reservations.
            </p>

            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1">
              <div><strong>Arena:</strong> {unblockTarget.turfName}</div>
              <div><strong>Date:</strong> {formatDisplayDate(unblockTarget.date)}</div>
              <div><strong>Time:</strong> {unblockTarget.startTime} - {unblockTarget.endTime}</div>
              <div className="capitalize"><strong>Reason:</strong> {unblockTarget.reason}</div>
              {unblockTarget.note && <div><strong>Note:</strong> {unblockTarget.note}</div>}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUnblockModalOpen(false)}
              >
                Keep Blocked
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={unblockMutation.isLoading}
                onClick={() => unblockMutation.mutate(unblockTarget._id)}
                className="bg-purple-700 hover:bg-purple-800 gap-1.5"
              >
                {unblockMutation.isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Unblock Slot</span>
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default CalendarPage
