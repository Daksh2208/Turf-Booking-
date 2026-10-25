import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { Turf } from '../models/Turf.js'
import { Sport } from '../models/Sport.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { HeldSlot } from '../models/HeldSlot.js'
import { Reservation } from '../models/Reservation.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import pricingService from './pricing.service.js'

/**
 * Returns today's date formatted as YYYY-MM-DD in the business's configured timezone
 */
export function getBusinessToday(timezone = 'Asia/Kolkata') {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Generates an array of all YYYY-MM-DD date strings between start and end (inclusive)
 */
export function getDatesInRange(startDate, endDate) {
  const dates = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

export const calendarService = {
  /**
   * Month View Summary & Date Range Aggregation
   * Returns date-wise booking counts, occupied slots, blocked slots, available slots,
   * revenue, and overall range metrics without N+1 queries.
   */
  async getCalendarSummary({ startDate, endDate, turfId, sportId, status, paymentStatus }) {
    const settings = await BusinessSettings.getSettings()
    const timezone = settings?.timezone || 'Asia/Kolkata'
    const today = getBusinessToday(timezone)

    // Default to current month if dates not provided
    let rangeStart = startDate
    let rangeEnd = endDate

    if (!rangeStart || !rangeEnd) {
      const [year, month] = today.split('-').map(Number)
      const firstDay = new Date(Date.UTC(year, month - 1, 1))
      const lastDay = new Date(Date.UTC(year, month, 0))
      rangeStart = rangeStart || firstDay.toISOString().slice(0, 10)
      rangeEnd = rangeEnd || lastDay.toISOString().slice(0, 10)
    }

    // Validate format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(rangeStart) || !dateRegex.test(rangeEnd)) {
      const err = new Error('startDate and endDate must be in YYYY-MM-DD format.')
      err.statusCode = 400
      err.code = 'INVALID_DATE_FORMAT'
      throw err
    }

    if (rangeStart > rangeEnd) {
      const err = new Error('startDate cannot be after endDate.')
      err.statusCode = 400
      err.code = 'INVALID_DATE_RANGE'
      throw err
    }

    const allDates = getDatesInRange(rangeStart, rangeEnd)
    if (allDates.length > 62) {
      const err = new Error('Requested date range cannot exceed 62 days (2 months).')
      err.statusCode = 400
      err.code = 'DATE_RANGE_TOO_LARGE'
      throw err
    }

    // Active Turfs lookup
    const turfFilter = { isActive: true }
    if (turfId) {
      if (!mongoose.Types.ObjectId.isValid(turfId)) {
        const err = new Error('Invalid turfId format.')
        err.statusCode = 400
        err.code = 'INVALID_TURF_ID'
        throw err
      }
      turfFilter._id = turfId
    }
    const turfs = await Turf.find(turfFilter).select('name slug openingHours capacity sports')

    // Prepare Booking query
    const bookingQuery = {
      date: { $gte: rangeStart, $lte: rangeEnd },
    }
    if (turfId) bookingQuery.turf = turfId
    if (sportId && mongoose.Types.ObjectId.isValid(sportId)) bookingQuery.sport = sportId
    if (status) bookingQuery.status = status
    if (paymentStatus) bookingQuery.paymentStatus = paymentStatus

    // Prepare BlockedSlot query
    const blockQuery = {
      date: { $gte: rangeStart, $lte: rangeEnd },
    }
    if (turfId) blockQuery.turf = turfId

    // Prepare HeldSlot query (only active, unexpired holds)
    const now = new Date()
    const heldQuery = {
      date: { $gte: rangeStart, $lte: rangeEnd },
      status: 'active',
      expiresAt: { $gt: now },
    }
    if (turfId) heldQuery.turf = turfId

    // Execute queries in parallel
    const [bookings, blockedSlots, activeHolds] = await Promise.all([
      Booking.find(bookingQuery)
        .populate('turf', 'name slug')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .lean(),
      BlockedSlot.find(blockQuery).lean(),
      HeldSlot.find(heldQuery).lean(),
    ])

    // Group bookings, blocks, and holds by date
    const bookingsByDate = new Map()
    const blocksByDate = new Map()
    const holdsByDate = new Map()

    for (const d of allDates) {
      bookingsByDate.set(d, [])
      blocksByDate.set(d, [])
      holdsByDate.set(d, [])
    }

    for (const b of bookings) {
      if (bookingsByDate.has(b.date)) {
        bookingsByDate.get(b.date).push(b)
      }
    }

    for (const blk of blockedSlots) {
      if (blocksByDate.has(blk.date)) {
        blocksByDate.get(blk.date).push(blk)
      }
    }

    for (const h of activeHolds) {
      if (holdsByDate.has(h.date)) {
        holdsByDate.get(h.date).push(h)
      }
    }

    // Default slot duration
    const slotDuration = settings.bookingRules?.slotDurationMinutes || 60

    // Range-wide aggregate accumulators
    let totalBookingsCount = 0
    let totalOccupiedSlotsCount = 0
    let totalAvailableSlotsCount = 0
    let totalHeldSlotsCount = 0
    let totalBlockedSlotsCount = 0
    let totalCompletedBookingsCount = 0
    let totalCancelledBookingsCount = 0
    let totalRevenuePaise = 0
    let totalBookingValuePaise = 0
    let totalDuePaise = 0

    const days = allDates.map((dateStr) => {
      const dateBookings = bookingsByDate.get(dateStr) || []
      const dateBlocks = blocksByDate.get(dateStr) || []
      const dateHolds = holdsByDate.get(dateStr) || []

      // Calculate operational slots across active matching turfs for this day
      let dayTotalCapacitySlots = 0
      let dayOccupiedSlots = 0
      let dayBlockedSlots = 0
      let dayHeldSlots = 0

      for (const turf of turfs) {
        const openTime = turf.openingHours?.open || '06:00'
        const closeTime = turf.openingHours?.close || '23:00'
        const [openH, openM] = openTime.split(':').map(Number)
        const [closeH, closeM] = closeTime.split(':').map(Number)
        const openMinutes = openH * 60 + openM
        let closeMinutes = closeH * 60 + closeM
        if (closeMinutes <= openMinutes) closeMinutes += 24 * 60

        const possibleSlotsCount = Math.floor((closeMinutes - openMinutes) / slotDuration)
        dayTotalCapacitySlots += Math.max(0, possibleSlotsCount)

        // Count unique occupied slots for this turf on this date (excluding cancelled)
        const turfBookings = dateBookings.filter(
          (b) => b.turf?._id?.toString() === turf._id.toString() || b.turf?.toString() === turf._id.toString()
        )
        const occupiedSet = new Set()
        for (const b of turfBookings) {
          if (b.status === 'cancelled') continue
          if (Array.isArray(b.selectedSlots) && b.selectedSlots.length > 0) {
            b.selectedSlots.forEach((s) => occupiedSet.add(s))
          } else if (b.startTime && b.endTime) {
            const bStart = Number(b.startTime.split(':')[0])
            const bEnd = Number(b.endTime.split(':')[0])
            for (let h = bStart; h < bEnd; h++) {
              occupiedSet.add(`${String(h).padStart(2, '0')}:00`)
            }
          }
        }
        dayOccupiedSlots += occupiedSet.size

        // Count blocked slots for this turf
        const turfBlocks = dateBlocks.filter(
          (blk) => blk.turf?.toString() === turf._id.toString()
        )
        const blockedSet = new Set()
        for (const blk of turfBlocks) {
          const blkStart = Number(blk.startTime.split(':')[0])
          const blkEnd = Number(blk.endTime.split(':')[0])
          for (let h = blkStart; h < blkEnd; h++) {
            blockedSet.add(`${String(h).padStart(2, '0')}:00`)
          }
        }
        dayBlockedSlots += blockedSet.size

        // Count held slots for this turf
        const turfHolds = dateHolds.filter(
          (h) => h.turf?.toString() === turf._id.toString()
        )
        const heldSet = new Set(turfHolds.map((h) => h.slotTime))
        dayHeldSlots += heldSet.size
      }

      // Available slots for this day
      const dayAvailableSlots = Math.max(
        0,
        dayTotalCapacitySlots - dayOccupiedSlots - dayBlockedSlots - dayHeldSlots
      )

      // Bookings count & status breakdowns
      const nonCancelledBookings = dateBookings.filter((b) => b.status !== 'cancelled')
      const completedBookings = dateBookings.filter((b) => b.status === 'completed')
      const cancelledBookings = dateBookings.filter((b) => b.status === 'cancelled')

      // Revenue: strictly paid bookings
      const paidBookings = dateBookings.filter(
        (b) => b.status !== 'cancelled' && b.paymentStatus === 'paid'
      )
      const dayRevenuePaise = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      const dayBookingValuePaise = nonCancelledBookings.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0
      )
      const dayDuePaise = Math.max(0, dayBookingValuePaise - dayRevenuePaise)

      // Activity calculation
      const occupancyRatio =
        dayTotalCapacitySlots > 0 ? dayOccupiedSlots / dayTotalCapacitySlots : 0
      const hasHighActivity = occupancyRatio >= 0.7 || nonCancelledBookings.length >= 8

      // Accumulate range metrics
      totalBookingsCount += nonCancelledBookings.length
      totalOccupiedSlotsCount += dayOccupiedSlots
      totalAvailableSlotsCount += dayAvailableSlots
      totalHeldSlotsCount += dayHeldSlots
      totalBlockedSlotsCount += dayBlockedSlots
      totalCompletedBookingsCount += completedBookings.length
      totalCancelledBookingsCount += cancelledBookings.length
      totalRevenuePaise += dayRevenuePaise
      totalBookingValuePaise += dayBookingValuePaise
      totalDuePaise += dayDuePaise

      return {
        date: dateStr,
        isToday: dateStr === today,
        isPast: dateStr < today,
        totalBookings: nonCancelledBookings.length,
        allBookingsCount: dateBookings.length,
        occupiedSlots: dayOccupiedSlots,
        availableSlots: dayAvailableSlots,
        blockedSlots: dayBlockedSlots,
        heldSlots: dayHeldSlots,
        totalSlots: dayTotalCapacitySlots,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        revenuePaise: dayRevenuePaise,
        revenueFormatted: `₹${(dayRevenuePaise / 100).toFixed(2)}`,
        bookingValuePaise: dayBookingValuePaise,
        duePaise: dayDuePaise,
        occupancyPercentage: Math.round(occupancyRatio * 100),
        hasHighActivity,
        // Lightweight event summaries for preview / tooltips
        bookingsSummary: dateBookings.slice(0, 5).map((b) => ({
          bookingId: b.bookingId,
          customerName: b.contactDetails?.name || b.user?.name || 'Customer',
          turfName: b.turf?.name || 'Arena',
          sportName: b.sport?.name || 'Sport',
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          paymentStatus: b.paymentStatus,
          totalAmountFormatted: `₹${((b.totalAmount || 0) / 100).toFixed(2)}`,
        })),
      }
    })

    return {
      range: {
        startDate: rangeStart,
        endDate: rangeEnd,
      },
      timezone,
      today,
      summary: {
        totalBookings: totalBookingsCount,
        occupiedSlots: totalOccupiedSlotsCount,
        availableSlots: totalAvailableSlotsCount,
        heldSlots: totalHeldSlotsCount,
        blockedSlots: totalBlockedSlotsCount,
        completedBookings: totalCompletedBookingsCount,
        cancelledBookings: totalCancelledBookingsCount,
        totalRevenuePaise,
        totalRevenueFormatted: `₹${(totalRevenuePaise / 100).toFixed(2)}`,
        totalBookingValuePaise,
        totalBookingValueFormatted: `₹${(totalBookingValuePaise / 100).toFixed(2)}`,
        totalDuePaise,
        totalDueFormatted: `₹${(totalDuePaise / 100).toFixed(2)}`,
      },
      days,
    }
  },

  /**
   * Day View Operational Schedule
   * Returns complete slot-by-slot status, booking details, held slots, blocked slots,
   * operating hours and summary for a single turf and date.
   */
  async getDaySchedule({ date, turfId, sportId, status, paymentStatus }) {
    const settings = await BusinessSettings.getSettings()
    const timezone = settings?.timezone || 'Asia/Kolkata'
    const today = getBusinessToday(timezone)
    const targetDate = date || today

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(targetDate)) {
      const err = new Error('Date must be in YYYY-MM-DD format.')
      err.statusCode = 400
      err.code = 'INVALID_DATE'
      throw err
    }

    // Determine turf: if not passed, select the first active turf
    let targetTurfId = turfId
    if (!targetTurfId) {
      const firstTurf = await Turf.findOne({ isActive: true }).select('_id')
      if (firstTurf) {
        targetTurfId = firstTurf._id.toString()
      }
    }

    if (!targetTurfId || !mongoose.Types.ObjectId.isValid(targetTurfId)) {
      const err = new Error('A valid turfId is required to view daily schedule.')
      err.statusCode = 400
      err.code = 'INVALID_TURF_ID'
      throw err
    }

    const turf = await Turf.findById(targetTurfId).populate('sports', 'name slug')
    if (!turf) {
      const err = new Error('Turf arena not found.')
      err.statusCode = 404
      err.code = 'TURF_NOT_FOUND'
      throw err
    }

    // Lazily clean up expired reservations for this turf and date
    const now = new Date()
    const staleRes = await Reservation.find({
      turf: targetTurfId,
      date: targetDate,
      status: 'active',
      expiresAt: { $lte: now },
    }).select('_id')

    if (staleRes.length > 0) {
      const staleIds = staleRes.map((r) => r._id)
      await Promise.all([
        Reservation.updateMany({ _id: { $in: staleIds } }, { $set: { status: 'expired' } }),
        HeldSlot.updateMany({ reservation: { $in: staleIds } }, { $set: { status: 'expired' } }),
      ])
    }

    const slotDuration = settings.bookingRules?.slotDurationMinutes || 60
    const openTime = turf.openingHours?.open || '06:00'
    const closeTime = turf.openingHours?.close || '23:00'

    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    const openMinutes = openH * 60 + openM
    let closeMinutes = closeH * 60 + closeM
    if (closeMinutes <= openMinutes) closeMinutes += 24 * 60

    // Fetch Day Bookings, BlockedSlots, and active HeldSlots in parallel
    const bookingQuery = {
      turf: targetTurfId,
      date: targetDate,
    }
    if (sportId && mongoose.Types.ObjectId.isValid(sportId)) bookingQuery.sport = sportId
    if (status) bookingQuery.status = status
    if (paymentStatus) bookingQuery.paymentStatus = paymentStatus

    const [dayBookings, dayBlocks, dayHolds] = await Promise.all([
      Booking.find(bookingQuery)
        .populate('turf', 'name slug address')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone role')
        .sort({ startTime: 1 })
        .lean(),
      BlockedSlot.find({ turf: targetTurfId, date: targetDate })
        .populate('createdBy', 'name email')
        .sort({ startTime: 1 })
        .lean(),
      HeldSlot.find({
        turf: targetTurfId,
        date: targetDate,
        status: 'active',
        expiresAt: { $gt: now },
      })
        .populate('user', 'name email')
        .lean(),
    ])

    const isDateInPast = targetDate < today

    // Current time in business timezone
    let currentBusinessTime = '00:00'
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      currentBusinessTime = timeFormatter.format(now)
    } catch {
      currentBusinessTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    }

    // Build operational slots grid
    const slots = []
    let occupiedSlotsCount = 0
    let blockedSlotsCount = 0
    let heldSlotsCount = 0
    let availableSlotsCount = 0

    for (let current = openMinutes; current + slotDuration <= closeMinutes; current += slotDuration) {
      const startH = String(Math.floor((current % (24 * 60)) / 60)).padStart(2, '0')
      const startM = String(current % 60).padStart(2, '0')
      const endH = String(Math.floor(((current + slotDuration) % (24 * 60)) / 60)).padStart(2, '0')
      const endM = String((current + slotDuration) % 60).padStart(2, '0')

      const startTime = `${startH}:${startM}`
      const endTime = `${endH}:${endM}`

      // Check slot expiration/past status
      const isSlotPast = isDateInPast || (targetDate === today && endTime <= currentBusinessTime)

      // 1. Check Blocked Slot
      const blockMatch = dayBlocks.find(
        (b) => startTime < b.endTime && endTime > b.startTime
      )

      // 2. Check Active Booking
      const bookingMatch = dayBookings.find((b) => {
        if (b.status === 'cancelled') return false
        if (Array.isArray(b.selectedSlots) && b.selectedSlots.length > 0) {
          return b.selectedSlots.includes(startTime)
        }
        return startTime < b.endTime && endTime > b.startTime
      })

      // 3. Check Active Hold
      const holdMatch = dayHolds.find((h) => h.slotTime === startTime)

      // Pricing snapshot
      const pricing = pricingService.getSegmentPricing(turf, targetDate, startTime, endTime)

      let slotStatus = 'available'
      let slotData = {
        startTime,
        endTime,
        durationMinutes: slotDuration,
        isPast: isSlotPast,
        pricePaise: pricing.segmentPrice,
        priceFormatted: `₹${(pricing.segmentPrice / 100).toFixed(2)}`,
        rateType: pricing.rateType,
      }

      if (blockMatch) {
        slotStatus = 'blocked'
        blockedSlotsCount++
        slotData.blocked = {
          _id: blockMatch._id,
          reason: blockMatch.reason,
          note: blockMatch.note,
          createdBy: blockMatch.createdBy?.name || 'Administrator',
          createdAt: blockMatch.createdAt,
        }
      } else if (bookingMatch) {
        if (bookingMatch.status === 'completed' || (isSlotPast && bookingMatch.status === 'confirmed')) {
          slotStatus = 'completed'
        } else {
          slotStatus = bookingMatch.status // 'confirmed' or 'pending'
        }
        occupiedSlotsCount++
        slotData.booking = {
          _id: bookingMatch._id,
          bookingId: bookingMatch.bookingId,
          customer: {
            name: bookingMatch.contactDetails?.name || bookingMatch.user?.name || 'Customer',
            email: bookingMatch.contactDetails?.email || bookingMatch.user?.email || '',
            phone: bookingMatch.contactDetails?.phone || bookingMatch.user?.phone || '',
          },
          sport: {
            _id: bookingMatch.sport?._id,
            name: bookingMatch.sport?.name || 'Multi-Sport',
            slug: bookingMatch.sport?.slug,
          },
          turf: {
            _id: bookingMatch.turf?._id,
            name: bookingMatch.turf?.name,
          },
          startTime: bookingMatch.startTime,
          endTime: bookingMatch.endTime,
          selectedSlots: bookingMatch.selectedSlots || [],
          durationMinutes: bookingMatch.durationMinutes,
          playerCount: bookingMatch.playerCount,
          status: bookingMatch.status,
          paymentStatus: bookingMatch.paymentStatus,
          paymentMethod: bookingMatch.paymentMethod,
          totalAmount: bookingMatch.totalAmount,
          totalAmountFormatted: `₹${((bookingMatch.totalAmount || 0) / 100).toFixed(2)}`,
          amountPaid: bookingMatch.amountPaid || 0,
          amountPaidFormatted: `₹${((bookingMatch.amountPaid || 0) / 100).toFixed(2)}`,
          amountDue: bookingMatch.amountDue || 0,
          amountDueFormatted: `₹${((bookingMatch.amountDue || 0) / 100).toFixed(2)}`,
          discountAmount: bookingMatch.discountAmount || 0,
          coupon: bookingMatch.coupon || null,
          addOns: bookingMatch.addOns || [],
          createdAt: bookingMatch.createdAt,
        }
      } else if (holdMatch) {
        slotStatus = 'held'
        heldSlotsCount++
        const remainingSeconds = Math.max(
          0,
          Math.round((new Date(holdMatch.expiresAt).getTime() - Date.now()) / 1000)
        )
        slotData.held = {
          _id: holdMatch._id,
          reservation: holdMatch.reservation,
          expiresAt: holdMatch.expiresAt,
          remainingSeconds,
          customerName: holdMatch.user?.name || 'Customer',
        }
      } else {
        slotStatus = 'available'
        availableSlotsCount++
      }

      slotData.status = slotStatus
      slots.push(slotData)
    }

    // Day level summary calculations
    const nonCancelled = dayBookings.filter((b) => b.status !== 'cancelled')
    const completed = dayBookings.filter((b) => b.status === 'completed')
    const cancelled = dayBookings.filter((b) => b.status === 'cancelled')
    const paid = dayBookings.filter((b) => b.status !== 'cancelled' && b.paymentStatus === 'paid')

    const revenuePaise = paid.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    const bookingValuePaise = nonCancelled.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    const duePaise = Math.max(0, bookingValuePaise - revenuePaise)

    return {
      date: targetDate,
      isToday: targetDate === today,
      isPast: isDateInPast,
      timezone,
      currentTime: currentBusinessTime,
      turf: {
        _id: turf._id,
        name: turf.name,
        slug: turf.slug,
        size: turf.size,
        surface: turf.surface,
        openingHours: turf.openingHours,
        sports: turf.sports,
      },
      operatingHours: {
        open: openTime,
        close: closeTime,
      },
      slotDurationMinutes: slotDuration,
      summary: {
        totalBookings: nonCancelled.length,
        allBookingsCount: dayBookings.length,
        occupiedSlots: occupiedSlotsCount,
        availableSlots: availableSlotsCount,
        heldSlots: heldSlotsCount,
        blockedSlots: blockedSlotsCount,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        revenuePaise,
        revenueFormatted: `₹${(revenuePaise / 100).toFixed(2)}`,
        bookingValuePaise,
        bookingValueFormatted: `₹${(bookingValuePaise / 100).toFixed(2)}`,
        duePaise,
        dueFormatted: `₹${(duePaise / 100).toFixed(2)}`,
      },
      slots,
      bookings: dayBookings,
      blockedSlots: dayBlocks,
    }
  },

  /**
   * Week View Schedule & Events Grid
   * Returns 7 days of dates with events placed at start/end times for time-grid display.
   */
  async getWeekSchedule({ startDate, endDate, turfId, sportId, status, paymentStatus }) {
    const settings = await BusinessSettings.getSettings()
    const timezone = settings?.timezone || 'Asia/Kolkata'
    const today = getBusinessToday(timezone)

    // Compute week dates: default to current week (Monday through Sunday)
    let weekStart = startDate
    let weekEnd = endDate

    if (!weekStart) {
      const todayDate = new Date(`${today}T00:00:00.000Z`)
      const dayOfWeek = todayDate.getUTCDay() // 0 = Sunday, 1 = Monday, ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(todayDate)
      monday.setUTCDate(todayDate.getUTCDate() + diffToMonday)
      weekStart = monday.toISOString().slice(0, 10)

      const sunday = new Date(monday)
      sunday.setUTCDate(monday.getUTCDate() + 6)
      weekEnd = sunday.toISOString().slice(0, 10)
    } else if (!weekEnd) {
      const start = new Date(`${weekStart}T00:00:00.000Z`)
      const end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 6)
      weekEnd = end.toISOString().slice(0, 10)
    }

    const weekDates = getDatesInRange(weekStart, weekEnd)

    // Turf lookup
    let targetTurfId = turfId
    if (!targetTurfId) {
      const firstTurf = await Turf.findOne({ isActive: true }).select('_id')
      if (firstTurf) targetTurfId = firstTurf._id.toString()
    }

    let turf = null
    if (targetTurfId && mongoose.Types.ObjectId.isValid(targetTurfId)) {
      turf = await Turf.findById(targetTurfId).select('name slug openingHours sports').lean()
    }

    // Prepare queries for week range
    const bookingQuery = {
      date: { $in: weekDates },
    }
    if (targetTurfId) bookingQuery.turf = targetTurfId
    if (sportId && mongoose.Types.ObjectId.isValid(sportId)) bookingQuery.sport = sportId
    if (status) bookingQuery.status = status
    if (paymentStatus) bookingQuery.paymentStatus = paymentStatus

    const blockQuery = {
      date: { $in: weekDates },
    }
    if (targetTurfId) blockQuery.turf = targetTurfId

    const now = new Date()
    const heldQuery = {
      date: { $in: weekDates },
      status: 'active',
      expiresAt: { $gt: now },
    }
    if (targetTurfId) heldQuery.turf = targetTurfId

    const [bookings, blockedSlots, heldSlots] = await Promise.all([
      Booking.find(bookingQuery)
        .populate('turf', 'name slug')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .sort({ startTime: 1 })
        .lean(),
      BlockedSlot.find(blockQuery).sort({ startTime: 1 }).lean(),
      HeldSlot.find(heldQuery).populate('user', 'name email').lean(),
    ])

    const slotDuration = settings.bookingRules?.slotDurationMinutes || 60
    const openTime = turf?.openingHours?.open || '06:00'
    const closeTime = turf?.openingHours?.close || '23:00'

    // Group items by date
    const daysData = weekDates.map((dateStr) => {
      const dayBookings = bookings.filter((b) => b.date === dateStr)
      const dayBlocks = blockedSlots.filter((b) => b.date === dateStr)
      const dayHolds = heldSlots.filter((h) => h.date === dateStr)

      const nonCancelled = dayBookings.filter((b) => b.status !== 'cancelled')
      const occupiedSlotsSet = new Set()
      for (const b of nonCancelled) {
        if (Array.isArray(b.selectedSlots) && b.selectedSlots.length > 0) {
          b.selectedSlots.forEach((s) => occupiedSlotsSet.add(s))
        } else if (b.startTime && b.endTime) {
          const s = Number(b.startTime.split(':')[0])
          const e = Number(b.endTime.split(':')[0])
          for (let h = s; h < e; h++) {
            occupiedSlotsSet.add(`${String(h).padStart(2, '0')}:00`)
          }
        }
      }

      const blockedSlotsSet = new Set()
      for (const blk of dayBlocks) {
        const s = Number(blk.startTime.split(':')[0])
        const e = Number(blk.endTime.split(':')[0])
        for (let h = s; h < e; h++) {
          blockedSlotsSet.add(`${String(h).padStart(2, '0')}:00`)
        }
      }

      const paid = dayBookings.filter((b) => b.status !== 'cancelled' && b.paymentStatus === 'paid')
      const dayRevenuePaise = paid.reduce((sum, b) => sum + (b.totalAmount || 0), 0)

      return {
        date: dateStr,
        isToday: dateStr === today,
        isPast: dateStr < today,
        totalBookings: nonCancelled.length,
        occupiedSlots: occupiedSlotsSet.size,
        blockedSlots: blockedSlotsSet.size,
        heldSlots: dayHolds.length,
        revenuePaise: dayRevenuePaise,
        revenueFormatted: `₹${(dayRevenuePaise / 100).toFixed(2)}`,
        events: [
          ...dayBookings.map((b) => ({
            id: b._id,
            type: 'booking',
            bookingId: b.bookingId,
            title: b.contactDetails?.name || b.user?.name || 'Customer Booking',
            subtitle: `${b.turf?.name || 'Turf'} • ${b.sport?.name || 'Sport'}`,
            startTime: b.startTime,
            endTime: b.endTime,
            durationMinutes: b.durationMinutes,
            status: b.status,
            paymentStatus: b.paymentStatus,
            totalAmountFormatted: `₹${((b.totalAmount || 0) / 100).toFixed(2)}`,
            customer: {
              name: b.contactDetails?.name || b.user?.name || 'Customer',
              phone: b.contactDetails?.phone || b.user?.phone || '',
              email: b.contactDetails?.email || b.user?.email || '',
            },
            sport: b.sport,
            turf: b.turf,
          })),
          ...dayBlocks.map((blk) => ({
            id: blk._id,
            type: 'blocked',
            title: `Blocked: ${blk.reason || 'Maintenance'}`,
            subtitle: blk.note || 'Admin Block',
            startTime: blk.startTime,
            endTime: blk.endTime,
            reason: blk.reason,
            note: blk.note,
          })),
          ...dayHolds.map((h) => ({
            id: h._id,
            type: 'held',
            title: `Temporary Hold`,
            subtitle: `Expires at ${new Date(h.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            startTime: h.slotTime,
            endTime: `${String(Number(h.slotTime.split(':')[0]) + 1).padStart(2, '0')}:00`,
            expiresAt: h.expiresAt,
          })),
        ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }
    })

    return {
      startDate: weekStart,
      endDate: weekEnd,
      timezone,
      today,
      turf: turf
        ? {
            _id: turf._id,
            name: turf.name,
            slug: turf.slug,
            openingHours: turf.openingHours,
          }
        : null,
      operatingHours: {
        open: openTime,
        close: closeTime,
      },
      slotDurationMinutes: slotDuration,
      days: daysData,
    }
  },
}

export default calendarService
