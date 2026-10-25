import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { Turf } from '../models/Turf.js'
import { Sport } from '../models/Sport.js'
import { AddOn } from '../models/AddOn.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { SlotReservation } from '../models/SlotReservation.js'
import { User } from '../models/User.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import { logAudit } from '../utils/auditLogger.js'
import pricingService from './pricing.service.js'
import availabilityService from './availability.service.js'
import couponService from './coupon.service.js'

let isTxSupported = null

/**
 * Check if the active MongoDB deployment supports multi-document transactions (e.g. Replica Set)
 */
async function checkTransactionSupport() {
  if (isTxSupported !== null) return isTxSupported
  try {
    const session = await mongoose.startSession()
    try {
      session.startTransaction()
      await session.abortTransaction()
      isTxSupported = true
    } catch {
      isTxSupported = false
    } finally {
      await session.endSession()
    }
  } catch {
    isTxSupported = false
  }
  return isTxSupported
}

export const bookingService = {
  /**
   * Determine rate type and price for a slot based on date and time
   * Delegates to central pricingService (single source of truth)
   */
  calculateSlotPrice(turf, dateStr, startTime, endTime) {
    const end = endTime || `${String(Number(startTime.split(':')[0]) + 1).padStart(2, '0')}:00`
    const pricing = pricingService.getSegmentPricing(turf, dateStr, startTime, end)
    return {
      rateType: pricing.rateType,
      price: pricing.segmentPrice,
    }
  },

  /**
   * Generate dynamic slots for a turf on a given date with live status & pricing
   * Delegates to central availabilityService
   */
  async getTurfSlots(turfId, dateStr) {
    return availabilityService.getTurfAvailability({ turfId, date: dateStr })
  },

  /**
   * Create Booking (Part 10 Booking Engine with Pay at Venue Checkout)
   *
   * Features:
   * 1. Authenticates customer & enforces required contact details
   * 2. Validates turf, date, operating hours, and sports
   * 3. Prevents conflict with BlockedSlot (admin maintenance/tournaments)
   * 4. Enforces strict double-booking protection using SlotReservation with unique compound index
   * 5. Recalculates authoritative price snapshot using server-side pricingService
   * 6. Idempotency & duplicate submission protection
   */
  async createBooking(data, user, ip = '') {
    const {
      turfId,
      sportId,
      date,
      startTime,
      endTime,
      addOns = [],
      playerCount,
      contactDetails,
      paymentMethod = 'Pay at Venue',
      idempotencyKey,
      couponCode,
    } = data

    if (!user || !user._id) {
      const error = new Error('Authentication required to create a booking.')
      error.statusCode = 401
      error.code = 'UNAUTHENTICATED'
      throw error
    }

    if (user.role === 'admin') {
      const error = new Error('Admins are not permitted to create customer bookings.')
      error.statusCode = 403
      error.code = 'ADMIN_BOOKING_FORBIDDEN'
      throw error
    }

    // 1. Idempotency check: prevent duplicate bookings on network retries
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const cleanKey = idempotencyKey.trim()
      const existingKeyBooking = await Booking.findOne({
        user: user._id,
        idempotencyKey: cleanKey,
      }).populate([
        { path: 'turf', select: 'name slug address images openingHours' },
        { path: 'sport', select: 'name slug' },
        { path: 'user', select: 'name email phone' },
      ])

      if (existingKeyBooking) {
        return existingKeyBooking
      }
    }

    // 2. Validate Turf existence and status
    if (!turfId || !mongoose.Types.ObjectId.isValid(turfId)) {
      const error = new Error('A valid turf arena ID is required.')
      error.statusCode = 400
      error.code = 'INVALID_TURF_ID'
      throw error
    }

    const turf = await Turf.findById(turfId)
    if (!turf || !turf.isActive) {
      const error = new Error('Turf arena not found or inactive.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    // 3. Validate Date format and ensure not in the past
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const error = new Error('Valid date is required in YYYY-MM-DD format.')
      error.statusCode = 400
      error.code = 'INVALID_DATE'
      throw error
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    if (date < todayStr) {
      const error = new Error('Cannot book a slot for a past date.')
      error.statusCode = 400
      error.code = 'PAST_DATE_NOT_ALLOWED'
      throw error
    }

    // 4. Validate Slots / Start & End Times
    const discreteSlots = data.slots || (Array.isArray(data.selectedSlots) ? data.selectedSlots : [])
    let slotTimesToReserve = []
    let effectiveStartTime = startTime
    let effectiveEndTime = endTime

    if (Array.isArray(discreteSlots) && discreteSlots.length > 0) {
      slotTimesToReserve = discreteSlots.map((s) => (typeof s === 'string' ? s : s.startTime))
      effectiveStartTime = slotTimesToReserve[0]
      const lastItem = discreteSlots[discreteSlots.length - 1]
      effectiveEndTime =
        typeof lastItem === 'object' && lastItem.endTime
          ? lastItem.endTime
          : `${String(Number(slotTimesToReserve[slotTimesToReserve.length - 1].split(':')[0]) + 1).padStart(2, '0')}:00`
    } else {
      if (!startTime || !endTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) {
        const error = new Error('Valid start time and end time (HH:mm) are required.')
        error.statusCode = 400
        error.code = 'INVALID_TIMES'
        throw error
      }

      if (startTime >= endTime) {
        const error = new Error('End time must be later than start time.')
        error.statusCode = 400
        error.code = 'INVALID_TIME_RANGE'
        throw error
      }

      const rawSegments = pricingService.splitIntoHourlySegments(startTime, endTime)
      slotTimesToReserve = rawSegments.map((s) => s.startTime)
      effectiveStartTime = startTime
      effectiveEndTime = endTime
    }

    // 5. Validate Operating Hours
    const openTime = turf.openingHours?.open || '06:00'
    const closeTime = turf.openingHours?.close || '23:00'
    for (const st of slotTimesToReserve) {
      if (st < openTime || st >= closeTime) {
        const error = new Error(
          `Requested slot (${st}) is outside the arena's operating hours (${openTime} - ${closeTime}).`
        )
        error.statusCode = 400
        error.code = 'OUTSIDE_OPERATING_HOURS'
        throw error
      }
    }

    // 6. Validate & Normalize Player Contact Details
    const customerName = contactDetails?.name?.trim() || user.name || 'Valued Player'
    const customerEmail = contactDetails?.email?.trim().toLowerCase() || user.email || 'customer@example.com'
    const customerPhone = contactDetails?.phone?.trim() || user.phone || '9876543210'

    // 7. Check for Admin Blocked Slots conflict for each discrete slot
    for (const st of slotTimesToReserve) {
      const isBlocked = await BlockedSlot.findOne({
        turf: turfId,
        date,
        startTime: { $lte: st },
        endTime: { $gt: st },
      })
      if (isBlocked) {
        const error = new Error(`Slot ${st} is unavailable due to admin block: ${isBlocked.reason}.`)
        error.statusCode = 400
        error.code = 'SLOT_BLOCKED'
        throw error
      }
    }

    // 8. Check for existing active bookings conflict for each discrete slot
    const existingActiveBooking = await SlotReservation.findOne({
      turf: turfId,
      date,
      slotTime: { $in: slotTimesToReserve },
      status: 'active',
    })
    if (existingActiveBooking) {
      const error = new Error(`Slot ${existingActiveBooking.slotTime} is already booked by another customer.`)
      error.statusCode = 409
      error.code = 'SLOT_ALREADY_BOOKED'
      throw error
    }

    // 10. Server-Side Authoritative Pricing Recalculation (never trust client amounts)
    const quote = await pricingService.calculateQuote({
      turfId,
      date,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      slots: discreteSlots.length > 0 ? discreteSlots : undefined,
      addOns,
      playerCount,
      couponCode: couponCode ? couponCode.trim() : null,
      sportId,
      user,
    })

    // 11. Resolve Sport
    let resolvedSportId = sportId
    if (!resolvedSportId && turf.sports && turf.sports.length > 0) {
      resolvedSportId = turf.sports[0]
    }
    if (!resolvedSportId) {
      const anySport = await Sport.findOne({ isActive: true })
      if (anySport) resolvedSportId = anySport._id
    }

    // 12. Generate unique booking reference: TB-YYMMDD-XXXX
    const dateCode = date.replace(/-/g, '').slice(2)
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const bookingId = `TB-${dateCode}-${randomCode}`

    const durationMinutes = Math.round(quote.timeRange.durationHours * 60)

    // Format add-ons snapshot
    const addOnsSnapshot = (quote.addOns || []).map((a) => ({
      addOn: a.addOnId,
      name: a.name,
      price: a.unitPrice,
      quantity: a.quantity,
      pricingUnit: a.pricingUnit || 'per_booking',
      totalPrice: a.totalAmount,
    }))

    // Determine rateType label
    const dominantRateType =
      quote.hourlySegments && quote.hourlySegments.length > 0
        ? quote.hourlySegments[0].rateType
        : 'base'

    const bookingPayload = {
      bookingId,
      user: user._id,
      turf: turfId,
      sport: resolvedSportId,
      date,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      selectedSlots: slotTimesToReserve,
      durationMinutes,
      playerCount: quote.playerCount,
      contactDetails: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      rateType: dominantRateType,
      slotPrice: quote.turfSubtotal,
      addOns: addOnsSnapshot,
      addOnsTotal: quote.addOnsSubtotal,
      subtotal: quote.preDiscountSubtotal || quote.subtotal,
      discountAmount: quote.discountAmount || 0,
      coupon: quote.coupon
        ? {
            couponId: quote.coupon.couponId,
            code: quote.coupon.code,
            discountType: quote.coupon.discountType,
            discountValue: quote.coupon.discountValue,
            discountAmount: quote.coupon.discountAmount,
            preDiscountSubtotal: quote.preDiscountSubtotal,
            postDiscountSubtotal: quote.taxableAmount,
          }
        : undefined,
      taxRatePercentage: quote.tax.taxPercentage,
      taxAmount: quote.tax.taxAmount,
      totalAmount: quote.finalTotal,
      pricingBreakdown: {
        hourlySegments: quote.hourlySegments,
        turfSubtotal: quote.turfSubtotal,
        addOnsSubtotal: quote.addOnsSubtotal,
        subtotal: quote.preDiscountSubtotal || quote.subtotal,
        preDiscountSubtotal: quote.preDiscountSubtotal || quote.subtotal,
        discountAmount: quote.discountAmount || 0,
        couponCode: quote.coupon?.code || null,
        taxableAmount: quote.taxableAmount,
        taxPercentage: quote.tax.taxPercentage,
        taxAmount: quote.tax.taxAmount,
        finalTotal: quote.finalTotal,
        playerCount: quote.playerCount,
        capacity: quote.capacity,
      },
      status: 'confirmed',
      paymentStatus: 'unpaid',
      paymentMethod: 'Pay at Venue',
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
    }

    // 13. Concurrency Protection & Atomic Slot Reservation
    // We attempt transaction if supported; otherwise atomic reservation insertion
    // with unique compound index (turf, date, slotTime) and rollback compensation on error.
    const supportsTx = await checkTransactionSupport()
    let createdBooking = null

    if (supportsTx) {
      const session = await mongoose.startSession()
      try {
        await session.withTransaction(async () => {
          // Inside transaction: Re-check conflicts
          const conflict = await SlotReservation.findOne({
            turf: turfId,
            date,
            slotTime: { $in: slotTimesToReserve },
            status: 'active',
          }).session(session)

          if (conflict) {
            const err = new Error('One or more selected slots are already booked by another customer.')
            err.statusCode = 409
            err.code = 'SLOT_ALREADY_BOOKED'
            throw err
          }

          const [b] = await Booking.create([bookingPayload], { session })
          createdBooking = b

          // Atomic coupon redemption if coupon was applied
          if (quote.coupon?.couponId) {
            await couponService.redeemCouponForBooking({
              couponId: quote.coupon.couponId,
              couponCode: quote.coupon.code,
              user,
              bookingId: b._id,
              discountAmount: quote.discountAmount,
              session,
            })
          }

          const reservations = slotTimesToReserve.map((st) => ({
            turf: turfId,
            date,
            slotTime: st,
            booking: b._id,
            status: 'active',
          }))

          await SlotReservation.insertMany(reservations, { session })
        })
      } catch (err) {
        if (err.code === 11000) {
          const conflictErr = new Error('One or more selected slots are already booked by another customer.')
          conflictErr.statusCode = 409
          conflictErr.code = 'SLOT_ALREADY_BOOKED'
          throw conflictErr
        }
        throw err
      } finally {
        await session.endSession()
      }
    } else {
      // Non-transactional fallback (Standalone MongoDB dev/test):
      // Insert Booking and SlotReservations with rollback compensation on duplicate key
      let bookingDoc = null
      let insertedReservations = []

      try {
        bookingDoc = await Booking.create(bookingPayload)

        // Atomic coupon redemption
        if (quote.coupon?.couponId) {
          await couponService.redeemCouponForBooking({
            couponId: quote.coupon.couponId,
            couponCode: quote.coupon.code,
            user,
            bookingId: bookingDoc._id,
            discountAmount: quote.discountAmount,
          })
        }

        const reservations = slotTimesToReserve.map((st) => ({
          turf: turfId,
          date,
          slotTime: st,
          booking: bookingDoc._id,
          status: 'active',
        }))

        // insertMany will fail atomically if any slot has duplicate key
        insertedReservations = await SlotReservation.insertMany(reservations)
        createdBooking = bookingDoc
      } catch (err) {
        // Rollback coupon redemption if created
        if (quote.coupon?.couponId && bookingDoc?._id) {
          await couponService.releaseCouponOnCancellation(bookingDoc._id).catch(() => {})
        }
        // Rollback any partially created records
        if (bookingDoc?._id) {
          await Booking.deleteOne({ _id: bookingDoc._id }).catch(() => {})
        }
        if (insertedReservations.length > 0) {
          await SlotReservation.deleteMany({ booking: bookingDoc._id }).catch(() => {})
        }

        if (err.code === 11000) {
          const conflictErr = new Error('One or more selected slots are already booked by another customer.')
          conflictErr.statusCode = 409
          conflictErr.code = 'SLOT_ALREADY_BOOKED'
          throw conflictErr
        }
        throw err
      }
    }

    await logAudit({
      actorId: user._id,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: createdBooking._id,
      details: {
        bookingId: createdBooking.bookingId,
        turf: turf.name,
        date,
        startTime,
        endTime,
        totalAmount: createdBooking.totalAmount,
        paymentMethod: createdBooking.paymentMethod,
        paymentStatus: createdBooking.paymentStatus,
      },
      ip,
    })

    return Booking.findById(createdBooking._id).populate([
      { path: 'turf', select: 'name slug address images openingHours' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
    ])
  },

  /**
   * Update booking status (Admin only)
   * Enforces valid state transitions and idempotency.
   * Releasing slot immediately when cancelled.
   */
  async updateBookingStatus(id, { status, cancellationReason = '' }, adminUser, ip = '') {
    const booking = await Booking.findById(id)
    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const previousStatus = booking.status

    // Idempotent check
    if (previousStatus === status) {
      return booking.populate([
        { path: 'turf', select: 'name slug address images' },
        { path: 'sport', select: 'name slug' },
        { path: 'user', select: 'name email phone' },
        { path: 'paymentRecordedBy', select: 'name email' },
        { path: 'cancelledBy.user', select: 'name email' },
      ])
    }

    // State transition rules
    const ALLOWED_STATUS_TRANSITIONS = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: ['cancelled'],
      cancelled: [], // Terminal status: cannot transition to confirmed or completed through ordinary update
    }

    if (!ALLOWED_STATUS_TRANSITIONS[previousStatus]?.includes(status)) {
      const error = new Error(`Cannot transition booking status from '${previousStatus}' to '${status}'.`)
      error.statusCode = 400
      error.code = 'INVALID_STATUS_TRANSITION'
      throw error
    }

    booking.status = status

    if (status === 'cancelled') {
      booking.cancellationReason = cancellationReason || 'Cancelled by Administrator'
      booking.cancelledAt = new Date()
      booking.cancelledBy = {
        user: adminUser._id,
        role: adminUser.role || 'admin',
      }

      // Immediately release active slot reservations so slot becomes available again
      await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
      if (booking.coupon?.couponId) {
        await couponService.releaseCouponOnCancellation(booking._id).catch(() => {})
      }
    }

    await booking.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'BOOKING_STATUS_UPDATE',
      entityType: 'Booking',
      entityId: booking._id,
      details: { previousStatus, newStatus: status, bookingId: booking.bookingId },
      ip,
    })

    return booking.populate([
      { path: 'turf', select: 'name slug address images' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
      { path: 'paymentRecordedBy', select: 'name email' },
      { path: 'cancelledBy.user', select: 'name email' },
    ])
  },

  /**
   * Explicit Pay at Venue Payment Recording (Admin only)
   * Records receipt of money collected at the counter without changing customer booking parameters.
   */
  async recordPayment(id, { paymentMethod = 'Pay at Venue', notes = '' } = {}, adminUser, ip = '') {
    const booking = await Booking.findById(id)
    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    if (booking.status === 'cancelled') {
      const error = new Error('Cannot record payment for a cancelled booking.')
      error.statusCode = 400
      error.code = 'CANNOT_PAY_CANCELLED_BOOKING'
      throw error
    }

    const previousPaymentStatus = booking.paymentStatus
    booking.paymentStatus = 'paid'
    booking.paidAt = new Date()
    booking.paymentRecordedBy = adminUser._id
    if (paymentMethod) {
      booking.paymentMethod = paymentMethod
    }
    if (notes) {
      booking.paymentNotes = notes
    }

    await booking.save()

    await logAudit({
      actorId: adminUser._id,
      action: 'PAYMENT_RECORDED',
      entityType: 'Booking',
      entityId: booking._id,
      details: {
        bookingId: booking.bookingId,
        previousPaymentStatus,
        paymentStatus: 'paid',
        amount: booking.totalAmount,
        paymentMethod: booking.paymentMethod,
      },
      ip,
    })

    return booking.populate([
      { path: 'turf', select: 'name slug address images' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
      { path: 'paymentRecordedBy', select: 'name email' },
      { path: 'cancelledBy.user', select: 'name email' },
    ])
  },

  /**
   * Secure Cancellation Workflow
   * Handles both Admin-authorized cancellation and Customer cancellation with cutoff verification.
   */
  async cancelBooking(id, { cancellationReason = '' } = {}, requestingUser, ip = '') {
    const booking = await Booking.findById(id)
    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const isAdmin = requestingUser.role === 'admin'
    const isOwner = booking.user?.toString() === requestingUser._id.toString()

    if (!isAdmin && !isOwner) {
      const error = new Error('You are not authorized to cancel this booking.')
      error.statusCode = 403
      error.code = 'FORBIDDEN'
      throw error
    }

    // Idempotent cancellation: if already cancelled, safe return
    if (booking.status === 'cancelled') {
      return booking.populate([
        { path: 'turf', select: 'name slug address images' },
        { path: 'sport', select: 'name slug' },
        { path: 'user', select: 'name email phone' },
        { path: 'paymentRecordedBy', select: 'name email' },
        { path: 'cancelledBy.user', select: 'name email' },
      ])
    }

    // If customer is cancelling, enforce business settings cancellation cutoff
    if (!isAdmin) {
      const settings = await BusinessSettings.getSettings()
      const cutoffHours = settings?.bookingRules?.cancellationCutoffHours ?? 4

      const slotDateTimeStr = `${booking.date}T${booking.startTime}:00`
      const slotTime = new Date(slotDateTimeStr).getTime()
      const now = Date.now()
      const hoursRemaining = (slotTime - now) / (1000 * 60 * 60)

      if (hoursRemaining < cutoffHours) {
        const error = new Error(
          `Cancellations must be made at least ${cutoffHours} hours prior to the slot start time.`
        )
        error.statusCode = 400
        error.code = 'CANCELLATION_CUTOFF_EXCEEDED'
        throw error
      }
    }

    booking.status = 'cancelled'
    booking.cancellationReason = cancellationReason || (isAdmin ? 'Cancelled by Administrator' : 'Cancelled by Customer')
    booking.cancelledAt = new Date()
    booking.cancelledBy = {
      user: requestingUser._id,
      role: requestingUser.role,
    }

    // Release slot reservations immediately
    await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
    if (booking.coupon?.couponId) {
      await couponService.releaseCouponOnCancellation(booking._id).catch(() => {})
    }
    await booking.save()

    await logAudit({
      actorId: requestingUser._id,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking._id,
      details: {
        bookingId: booking.bookingId,
        cancelledBy: requestingUser.role,
        reason: booking.cancellationReason,
      },
      ip,
    })

    return booking.populate([
      { path: 'turf', select: 'name slug address images' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
      { path: 'paymentRecordedBy', select: 'name email' },
      { path: 'cancelledBy.user', select: 'name email' },
    ])
  },

  /**
   * Admin Booking Search & Filtering
   * Supports: booking reference, customer name/email/phone, turf, status, paymentStatus, date, date range.
   */
  async getAdminBookings({
    page = 1,
    limit = 20,
    status = '',
    paymentStatus = '',
    turf = '',
    date = '',
    startDate = '',
    endDate = '',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const query = {}

    if (status) {
      query.status = status.toLowerCase()
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus.toLowerCase()
    }

    if (turf && mongoose.Types.ObjectId.isValid(turf)) {
      query.turf = turf
    }

    if (date) {
      query.date = date
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate }
    } else if (startDate) {
      query.date = { $gte: startDate }
    } else if (endDate) {
      query.date = { $lte: endDate }
    }

    if (search && search.trim()) {
      const s = search.trim()
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
        ],
      }).select('_id')

      const userIds = matchingUsers.map((u) => u._id)

      query.$or = [
        { bookingId: { $regex: s, $options: 'i' } },
        { 'contactDetails.name': { $regex: s, $options: 'i' } },
        { 'contactDetails.email': { $regex: s, $options: 'i' } },
        { 'contactDetails.phone': { $regex: s, $options: 'i' } },
        { user: { $in: userIds } },
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20))
    const skip = (pageNum - 1) * limitNum

    const sort = {}
    const direction = sortOrder === 'asc' ? 1 : -1
    if (['createdAt', 'date', 'totalAmount', 'startTime'].includes(sortBy)) {
      sort[sortBy] = direction
    } else {
      sort.createdAt = -1
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('turf', 'name slug address images')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .populate('paymentRecordedBy', 'name email')
        .populate('cancelledBy.user', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(query),
    ])

    return {
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    }
  },

  /**
   * Get single booking by ID with strict ownership authorization
   * Customers can NEVER view other customers' bookings!
   */
  async getBookingById(id, requestingUser = null) {
    let query = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id }
    } else {
      query = { bookingId: id.toUpperCase() }
    }

    const booking = await Booking.findOne(query)
      .populate('turf', 'name slug address images openingHours pricing')
      .populate('sport', 'name slug')
      .populate('user', 'name email phone')
      .populate('paymentRecordedBy', 'name email')
      .populate('cancelledBy.user', 'name email')

    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    // Ownership check: Customer cannot read another user's booking
    if (requestingUser && requestingUser.role !== 'admin') {
      const ownerId = booking.user?._id?.toString() || booking.user?.toString()
      if (ownerId !== requestingUser._id.toString()) {
        const error = new Error('You are not authorized to access this booking.')
        error.statusCode = 403
        error.code = 'FORBIDDEN'
        throw error
      }
    }

    return booking
  },

  /**
   * Get customer's booking history with pagination & optional status filter
   */
  async getUserBookings(userId, { page = 1, limit = 10, status = '' } = {}) {
    const query = { user: userId }
    if (status) {
      query.status = status.toLowerCase()
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('turf', 'name slug address images')
        .populate('sport', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(query),
    ])

    return {
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    }
  },

  /**
   * Admin Dashboard Analytics
   * Strictly respects business timezone and authoritative revenue rules:
   * 1. Today's bookings — non-cancelled bookings count.
   * 2. Today's revenue — ONLY collected money (paymentStatus === 'paid'). Unpaid Pay at Venue bookings are NOT counted as revenue!
   * 3. Total users — actual customer accounts, excluding admin accounts.
   * 4. Available slots today — calculated from real operating hours, bookings, and blocked slots.
   * 5. Recent bookings.
   * 6. Booking status breakdown.
   */
  async getDashboardMetrics() {
    const settings = await BusinessSettings.getSettings()
    const timezone = settings?.timezone || 'Asia/Kolkata'

    // Compute today's date string in the configured business timezone
    let today = ''
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      today = formatter.format(new Date())
    } catch {
      today = new Date().toISOString().slice(0, 10)
    }

    // 1. Today's non-cancelled bookings
    const todayBookingsQuery = {
      date: today,
      status: { $in: ['confirmed', 'completed', 'pending'] },
    }

    const todayStart = new Date(today + 'T00:00:00.000Z')

    const [
      todayActiveBookings,
      todayPaidBookings,
      totalCustomers,
      newCustomersToday,
      activeTurfs,
      allTurfsTodayBlocked,
      todaySchedule,
      recentBookings,
      todayStatusAggregation,
      todayPaymentAggregation,
      allTimeStatusAggregation,
      allTimePaymentAggregation,
    ] = await Promise.all([
      Booking.find(todayBookingsQuery),
      Booking.find({
        date: today,
        status: { $ne: 'cancelled' },
        paymentStatus: 'paid',
      }),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: todayStart } }),
      Turf.find({ isActive: true }).select('name slug openingHours'),
      BlockedSlot.find({ date: today }),
      // Today's live reservations ordered by time slot
      Booking.find({ date: today })
        .populate('turf', 'name slug')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .sort({ startTime: 1 }),
      // Recent all-time bookings
      Booking.find()
        .populate('turf', 'name slug')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(10),
      // Today status breakdown
      Booking.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      // Today payment breakdown
      Booking.aggregate([
        { $match: { date: today, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      // All-time status breakdown
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      // All-time payment breakdown
      Booking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
    ])

    // Strict revenue definition: ONLY money actually paid (paymentStatus === 'paid')
    const todayRevenuePaise = todayPaidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    const todayTotalBookingValuePaise = todayActiveBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    const todayUnpaidValuePaise = Math.max(0, todayTotalBookingValuePaise - todayRevenuePaise)

    // Accurate calculation of free slots today across all active turfs:
    let totalPossibleSlotsToday = 0
    let totalOccupiedSlotsToday = 0

    for (const turf of activeTurfs) {
      const openH = Number((turf.openingHours?.open || '06:00').split(':')[0])
      const closeH = Number((turf.openingHours?.close || '23:00').split(':')[0])
      const possibleHours = Math.max(0, closeH - openH)
      totalPossibleSlotsToday += possibleHours

      const occupiedSlotSet = new Set()

      // Booked slots on this turf today (excluding cancelled)
      const turfBookings = todayActiveBookings.filter(
        (b) => b.turf.toString() === turf._id.toString()
      )
      for (const b of turfBookings) {
        if (Array.isArray(b.selectedSlots) && b.selectedSlots.length > 0) {
          b.selectedSlots.forEach((s) => occupiedSlotSet.add(s))
        } else {
          const bStart = Number(b.startTime.split(':')[0])
          const bEnd = Number(b.endTime.split(':')[0])
          for (let h = bStart; h < bEnd; h++) {
            occupiedSlotSet.add(`${String(h).padStart(2, '0')}:00`)
          }
        }
      }

      // Admin blocked slots for this turf today
      const turfBlocks = allTurfsTodayBlocked.filter(
        (block) => block.turf.toString() === turf._id.toString()
      )
      for (const block of turfBlocks) {
        const blkStart = Number(block.startTime.split(':')[0])
        const blkEnd = Number(block.endTime.split(':')[0])
        for (let h = blkStart; h < blkEnd; h++) {
          occupiedSlotSet.add(`${String(h).padStart(2, '0')}:00`)
        }
      }

      totalOccupiedSlotsToday += occupiedSlotSet.size
    }

    const freeSlotsToday = Math.max(0, totalPossibleSlotsToday - totalOccupiedSlotsToday)

    // Helper to map status aggregation
    const mapStatus = (aggregation) => {
      const breakdown = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 }
      for (const s of aggregation) {
        if (breakdown[s._id] !== undefined) {
          breakdown[s._id] = s.count
        }
      }
      return breakdown
    }

    // Helper to map payment aggregation
    const mapPayment = (aggregation) => {
      const breakdown = {
        paid: { count: 0, amount: 0 },
        unpaid: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 },
      }
      for (const p of aggregation) {
        if (breakdown[p._id] !== undefined) {
          breakdown[p._id] = { count: p.count, amount: p.totalAmount }
        }
      }
      return breakdown
    }

    const todayCustomersCount = new Set(
      todayActiveBookings.map((b) => (b.user ? b.user.toString() : '')).filter(Boolean)
    ).size

    return {
      today,
      timezone,
      metrics: {
        todayBookings: todayActiveBookings.length,
        todayRevenue: todayRevenuePaise,
        todayRevenueFormatted: `₹${(todayRevenuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        todayTotalBookingValue: todayTotalBookingValuePaise,
        todayTotalBookingValueFormatted: `₹${(todayTotalBookingValuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        todayUnpaidValue: todayUnpaidValuePaise,
        todayUnpaidValueFormatted: `₹${(todayUnpaidValuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        todayCustomersCount,
        newCustomersToday,
        totalUsers: totalCustomers,
        freeSlotsToday,
        totalPossibleSlotsToday,
        totalOccupiedSlotsToday,
        activeTurfsCount: activeTurfs.length,
      },
      statusBreakdown: mapStatus(todayStatusAggregation),
      allTimeStatusBreakdown: mapStatus(allTimeStatusAggregation),
      paymentBreakdown: mapPayment(todayPaymentAggregation),
      allTimePaymentBreakdown: mapPayment(allTimePaymentAggregation),
      todaySchedule,
      recentBookings,
    }
  },
}

export default bookingService
