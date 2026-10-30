import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { Turf } from '../models/Turf.js'
import { Sport } from '../models/Sport.js'
import { AddOn } from '../models/AddOn.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { SlotReservation } from '../models/SlotReservation.js'
import { HeldSlot } from '../models/HeldSlot.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import { logAudit } from '../utils/auditLogger.js'
import pricingService from './pricing.service.js'
import availabilityService from './availability.service.js'
import couponService from './coupon.service.js'
import reservationService from './reservation.service.js'
import { broadcastAvailabilityUpdate } from '../socket.js'
import {
  getBusinessToday,
  getBusinessCurrentTime,
  getSlotTimestamp,
  getBookingTimestamps,
  DEFAULT_TIMEZONE,
} from '../utils/dateUtils.js'
import { logger } from '../config/logger.js'

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

let _stripeService = null
async function getStripeService() {
  if (!_stripeService) {
    const mod = await import('./stripe.service.js')
    _stripeService = mod.stripeService || mod.default
  }
  return _stripeService
}

/**
 * Convert a local turf date (YYYY-MM-DD) and time (HH:mm) into a UTC epoch timestamp
 * in the specified business timezone using Intl.
 */
function getSlotStartTimeInTimezone(dateStr, timeStr, timezone = DEFAULT_TIMEZONE) {
  return getSlotTimestamp(dateStr, timeStr, timezone)
}

/**
 * Authoritative refund calculation based on BusinessSettings cancellation policy
 */
export function calculateRefundDetails({ booking, settings, now = new Date() }) {
  const policy = settings?.cancellationPolicy || {
    enabled: true,
    cutoffHours: settings?.bookingRules?.cancellationCutoffHours ?? 4,
    allowCancellationWithinCutoff: false,
    tiers: [
      { hoursBefore: 24, refundPercentage: 100 },
      { hoursBefore: 12, refundPercentage: 50 },
      { hoursBefore: 4, refundPercentage: 0 },
    ],
    defaultRefundPercentage: 0,
  }

  const timezone = settings?.timezone || 'Asia/Kolkata'
  const slotStartTimeMs = getSlotStartTimeInTimezone(booking.date, booking.startTime, timezone)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const hoursRemaining = (slotStartTimeMs - nowMs) / (1000 * 60 * 60)

  const cutoffHours = policy.cutoffHours ?? settings?.bookingRules?.cancellationCutoffHours ?? 4
  const canCustomerCancel =
    policy.enabled !== false && (hoursRemaining >= cutoffHours || policy.allowCancellationWithinCutoff)

  // Sort tiers descending
  const sortedTiers = [...(policy.tiers || [])].sort((a, b) => b.hoursBefore - a.hoursBefore)
  let refundPercentage = policy.defaultRefundPercentage ?? 0

  for (const tier of sortedTiers) {
    if (hoursRemaining >= tier.hoursBefore) {
      refundPercentage = tier.refundPercentage
      break
    }
  }

  const isPaidStripe = booking.paymentMethod === 'stripe' && booking.paymentStatus === 'paid'
  const isPaidVenue = booking.paymentMethod !== 'stripe' && booking.paymentStatus === 'paid'
  const isUnpaid = booking.paymentStatus !== 'paid'

  let eligibleRefundAmount = 0
  let nonRefundableAmount = 0
  let refundType = 'zero' // 'full' | 'partial' | 'zero' | 'not_applicable' | 'not_required'

  if (isUnpaid) {
    refundType = 'not_applicable'
    refundPercentage = 0
    eligibleRefundAmount = 0
    nonRefundableAmount = 0
  } else if (isPaidVenue) {
    refundType = 'not_required'
    const totalCollected = booking.amountPaid || booking.totalAmount || 0
    eligibleRefundAmount = Math.round(totalCollected * (refundPercentage / 100))
    nonRefundableAmount = totalCollected - eligibleRefundAmount
  } else if (isPaidStripe) {
    const totalCollected = booking.amountPaid || booking.totalAmount || 0
    eligibleRefundAmount = Math.round(totalCollected * (refundPercentage / 100))
    nonRefundableAmount = totalCollected - eligibleRefundAmount
    if (refundPercentage >= 100) {
      refundType = 'full'
    } else if (refundPercentage > 0) {
      refundType = 'partial'
    } else {
      refundType = 'zero'
    }
  }

  let policyExplanation = ''
  if (!policy.enabled) {
    policyExplanation = 'Customer self-service cancellation is currently disabled by facility management.'
  } else if (hoursRemaining < cutoffHours && !policy.allowCancellationWithinCutoff) {
    policyExplanation = `Cancellations must be made at least ${cutoffHours} hours prior to slot start time. This booking is within the non-cancellable cutoff window.`
  } else if (refundPercentage === 100) {
    policyExplanation = `Cancelled with sufficient notice (>= ${sortedTiers[0]?.hoursBefore || 24}h before): 100% full refund eligible.`
  } else if (refundPercentage > 0) {
    policyExplanation = `Cancelled within ${sortedTiers[0]?.hoursBefore || 24}h window: ${refundPercentage}% partial refund eligible.`
  } else {
    policyExplanation = `Cancelled close to match time: 0% refund applies under cancellation policy.`
  }

  return {
    canCustomerCancel,
    hoursRemaining: Number(hoursRemaining.toFixed(2)),
    cutoffHours,
    refundPercentage,
    eligibleRefundAmount,
    nonRefundableAmount,
    originalAmount: booking.amountPaid || booking.totalAmount || 0,
    refundType,
    policyExplanation,
    isPaidStripe,
    isPaidVenue,
    isUnpaid,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    policyTiers: sortedTiers,
  }
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
      reservationId,
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
    if (!turf) {
      const error = new Error('Turf arena not found.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    if (!turf.isActive) {
      const error = new Error('Turf arena is currently inactive.')
      error.statusCode = 400
      error.code = 'TURF_INACTIVE'
      throw error
    }

    // 3. Validate Date format and ensure not in the past
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const error = new Error('Valid date is required in YYYY-MM-DD format.')
      error.statusCode = 400
      error.code = 'INVALID_DATE'
      throw error
    }

    const businessTimezone = turf.timezone || 'Asia/Kolkata'
    const todayStr = getBusinessToday(businessTimezone)
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
    await reservationService.expireStaleReservations(turfId, date)

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

    // If reservationId is specified, verify ownership and validity FIRST
    if (reservationId) {
      const existingRes = await Reservation.findOne({ reservationId })
      if (!existingRes) {
        const error = new Error('Reservation not found.')
        error.statusCode = 404
        error.code = 'RESERVATION_NOT_FOUND'
        throw error
      }
      if (existingRes.user.toString() !== user._id.toString()) {
        const error = new Error('You do not own this slot reservation.')
        error.statusCode = 403
        error.code = 'FORBIDDEN_RESERVATION'
        throw error
      }
      if (existingRes.status !== 'active' || existingRes.expiresAt <= new Date()) {
        const error = new Error('Your temporary reservation has expired. Please select your slot again.')
        error.statusCode = 410
        error.code = 'RESERVATION_EXPIRED'
        throw error
      }
    }

    // 8. Check for existing active bookings conflict for each discrete slot
    const [existingActiveBooking, existingBookingDoc] = await Promise.all([
      SlotReservation.findOne({
        turf: turfId,
        date,
        slotTime: { $in: slotTimesToReserve },
        status: 'active',
      }),
      Booking.findOne({
        turf: turfId,
        date,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { selectedSlots: { $in: slotTimesToReserve } },
          {
            $and: [
              { startTime: { $lt: effectiveEndTime } },
              { endTime: { $gt: effectiveStartTime } },
            ],
          },
        ],
      }),
    ])

    if (existingActiveBooking || existingBookingDoc) {
      if (idempotencyKey) {
        const existingKeyBooking = await Booking.findOne({
          user: user._id,
          idempotencyKey: idempotencyKey.trim(),
        }).populate([
          { path: 'turf', select: 'name slug address images openingHours' },
          { path: 'sport', select: 'name slug' },
          { path: 'user', select: 'name email phone' },
        ])
        if (existingKeyBooking) return existingKeyBooking
      }
      const conflictSlot = existingActiveBooking?.slotTime || slotTimesToReserve[0]
      const error = new Error(`Slot ${conflictSlot} is already booked by another customer.`)
      error.statusCode = 409
      error.code = 'SLOT_ALREADY_BOOKED'
      throw error
    }

    // 9. Check for active temporary holds by OTHER customers
    const otherHeldSlot = await HeldSlot.findOne({
      turf: turfId,
      date,
      slotTime: { $in: slotTimesToReserve },
      status: 'active',
      user: { $ne: user._id },
      expiresAt: { $gt: new Date() },
    })
    if (otherHeldSlot) {
      const error = new Error(`Slot ${otherHeldSlot.slotTime} is temporarily held by another customer.`)
      error.statusCode = 409
      error.code = 'SLOT_ALREADY_HELD'
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

    // If client supplied expected price, protect from price change race condition
    if (data.expectedTotal !== undefined && data.expectedTotal !== null) {
      const clientExpectedTotal = Number(data.expectedTotal)
      if (Number.isInteger(clientExpectedTotal) && clientExpectedTotal !== quote.finalTotal) {
        const error = new Error(
          `The booking price has changed from ₹${(clientExpectedTotal / 100).toFixed(2)} to ₹${(quote.finalTotal / 100).toFixed(2)}. Please review the updated amount before confirming.`
        )
        error.statusCode = 409
        error.code = 'PRICE_CHANGED'
        error.data = {
          expectedTotal: clientExpectedTotal,
          currentTotal: quote.finalTotal,
        }
        throw error
      }
    }

    // 11. Resolve and Validate Sport
    let resolvedSportId = sportId
    if (resolvedSportId) {
      if (!mongoose.Types.ObjectId.isValid(resolvedSportId)) {
        const error = new Error(`Invalid sport ID format: "${resolvedSportId}".`)
        error.statusCode = 400
        error.code = 'INVALID_SPORT_ID'
        throw error
      }
      const sportDoc = await Sport.findById(resolvedSportId)
      if (!sportDoc) {
        const error = new Error('Referenced sport not found.')
        error.statusCode = 404
        error.code = 'SPORT_NOT_FOUND'
        throw error
      }
      if (!sportDoc.isActive) {
        const error = new Error(`The sport "${sportDoc.name}" is currently inactive and not available for new bookings.`)
        error.statusCode = 400
        error.code = 'SPORT_INACTIVE'
        throw error
      }
      if (
        Array.isArray(turf.sports) &&
        turf.sports.length > 0 &&
        !turf.sports.some((s) => s.toString() === resolvedSportId.toString())
      ) {
        const error = new Error(`The selected sport "${sportDoc.name}" is not supported by ${turf.name}.`)
        error.statusCode = 400
        error.code = 'SPORT_NOT_SUPPORTED'
        throw error
      }
    } else {
      // Pick active sport associated with turf
      const activeTurfSport = await Sport.findOne({
        _id: { $in: turf.sports },
        isActive: true,
      })
      if (activeTurfSport) {
        resolvedSportId = activeTurfSport._id
      } else {
        const anySport = await Sport.findOne({ isActive: true })
        if (anySport) resolvedSportId = anySport._id
      }
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
      status: paymentMethod === 'stripe' ? 'pending' : 'confirmed',
      paymentStatus: paymentMethod === 'stripe' ? 'pending' : 'unpaid',
      paymentMethod: paymentMethod === 'stripe' ? 'stripe' : (paymentMethod || 'Pay at Venue'),
      amountPaid: 0,
      amountDue: quote.finalTotal,
      paymentExpiresAt: paymentMethod === 'stripe' ? new Date(Date.now() + 15 * 60 * 1000) : null,
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
        if (idempotencyKey) {
          const existingKeyBooking = await Booking.findOne({
            user: user._id,
            idempotencyKey: idempotencyKey.trim(),
          }).populate([
            { path: 'turf', select: 'name slug address images openingHours' },
            { path: 'sport', select: 'name slug' },
            { path: 'user', select: 'name email phone' },
          ])
          if (existingKeyBooking) return existingKeyBooking
        }
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

        if (idempotencyKey) {
          const existingKeyBooking = await Booking.findOne({
            user: user._id,
            idempotencyKey: idempotencyKey.trim(),
          }).populate([
            { path: 'turf', select: 'name slug address images openingHours' },
            { path: 'sport', select: 'name slug' },
            { path: 'user', select: 'name email phone' },
          ])
          if (existingKeyBooking) {
            return existingKeyBooking
          }
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

    // Convert active reservation to booking if applicable
    let resToConvert = reservationId
    if (!resToConvert) {
      const matchingRes = await Reservation.findOne({
        turf: turfId,
        date,
        user: user._id,
        status: 'active',
        slots: { $in: slotTimesToReserve },
        expiresAt: { $gt: new Date() },
      })
      if (matchingRes) {
        resToConvert = matchingRes.reservationId
      }
    }

    if (resToConvert) {
      await reservationService.convertReservationToBooking({
        reservationId: resToConvert,
        bookingId: createdBooking._id,
        user,
      }).catch(() => {})
    }

    // Broadcast live availability update
    broadcastAvailabilityUpdate({ turfId, date, reason: 'booking_confirmed' })

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
      pending: ['confirmed', 'cancelled', 'expired', 'failed'],
      confirmed: ['completed', 'cancelled'],
      completed: ['cancelled'],
      cancelled: [], // Terminal status: cannot transition to confirmed or completed through ordinary update
      expired: [],
      failed: [],
    }

    if (!ALLOWED_STATUS_TRANSITIONS[previousStatus]?.includes(status)) {
      const error = new Error(`Cannot transition booking status from '${previousStatus}' to '${status}'.`)
      error.statusCode = 400
      error.code = 'INVALID_STATUS_TRANSITION'
      throw error
    }

    if (status === 'cancelled') {
      return this.cancelBooking(id, { cancellationReason }, adminUser, ip)
    }

    booking.status = status
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

    if (booking.paymentMethod === 'stripe' && booking.paymentStatus !== 'paid') {
      const error = new Error('Stripe payments must be verified online via Stripe and cannot be manually marked as paid by an administrator.')
      error.statusCode = 400
      error.code = 'MANUAL_STRIPE_PAYMENT_FORBIDDEN'
      throw error
    }

    const previousPaymentStatus = booking.paymentStatus
    booking.paymentStatus = 'paid'
    booking.amountPaid = booking.totalAmount
    booking.amountDue = 0
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
   * Handles both Admin-authorized cancellation and Customer cancellation with policy & cutoff verification,
   * safe concurrency control, automated Stripe refund processing, and slot release.
   */
  async cancelBooking(id, { cancellationReason = '' } = {}, requestingUser, ip = '') {
    const originalBooking = await Booking.findById(id)
    if (!originalBooking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const isAdmin = requestingUser.role === 'admin'
    const isOwner =
      originalBooking.user?._id?.toString() === requestingUser._id?.toString() ||
      originalBooking.user?.toString() === requestingUser._id?.toString()

    if (!isAdmin && !isOwner) {
      const error = new Error('You are not authorized to cancel this booking.')
      error.statusCode = 403
      error.code = 'FORBIDDEN'
      throw error
    }

    // Idempotent cancellation: if already cancelled, safe return
    if (originalBooking.status === 'cancelled') {
      return originalBooking.populate([
        { path: 'turf', select: 'name slug address images' },
        { path: 'sport', select: 'name slug' },
        { path: 'user', select: 'name email phone' },
        { path: 'paymentRecordedBy', select: 'name email' },
        { path: 'cancelledBy.user', select: 'name email' },
      ])
    }

    // Customer cannot cancel completed bookings
    if (!isAdmin && originalBooking.status === 'completed') {
      const error = new Error('Completed bookings cannot be cancelled by customers.')
      error.statusCode = 400
      error.code = 'CANNOT_CANCEL_COMPLETED_BOOKING'
      throw error
    }

    const settings = await BusinessSettings.getSettings()

    // If match scheduled end time in venue timezone has passed, transition to completed
    if (!isAdmin && originalBooking.status === 'confirmed') {
      const tz = originalBooking.turf?.timezone || settings?.timezone || DEFAULT_TIMEZONE
      const { endMs } = getBookingTimestamps(originalBooking, tz)
      if (Date.now() >= endMs) {
        await Booking.updateOne({ _id: originalBooking._id, status: 'confirmed' }, { $set: { status: 'completed' } })
        originalBooking.status = 'completed'
        const error = new Error('Completed bookings cannot be cancelled by customers.')
        error.statusCode = 400
        error.code = 'CANNOT_CANCEL_COMPLETED_BOOKING'
        throw error
      }
    }

    const refundDetails = calculateRefundDetails({ booking: originalBooking, settings })

    // Customer cancellation policy enforcement
    if (!isAdmin) {
      if (settings.cancellationPolicy?.enabled === false) {
        const error = new Error('Customer self-service cancellation is disabled by facility management.')
        error.statusCode = 400
        error.code = 'CANCELLATION_DISABLED'
        throw error
      }

      if (!refundDetails.canCustomerCancel) {
        const error = new Error(
          `Cancellations must be made at least ${refundDetails.cutoffHours} hours prior to the slot start time.`
        )
        error.statusCode = 400
        error.code = 'CANCELLATION_CUTOFF_EXCEEDED'
        throw error
      }
    }

    const effectiveReason =
      cancellationReason || (isAdmin ? 'Cancelled by Administrator' : 'Cancelled by Customer')

    // Atomic concurrency lock: transition status only if not cancelled yet
    const booking = await Booking.findOneAndUpdate(
      { _id: originalBooking._id, status: { $ne: 'cancelled' } },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: effectiveReason,
          cancelledAt: new Date(),
          'cancelledBy.user': requestingUser._id,
          'cancelledBy.role': requestingUser.role || (isAdmin ? 'admin' : 'customer'),
          refundPercentage: refundDetails.refundPercentage,
        },
        $push: {
          cancellationHistory: {
            action: 'cancelled',
            performedBy: {
              user: requestingUser._id,
              role: requestingUser.role || (isAdmin ? 'admin' : 'customer'),
            },
            timestamp: new Date(),
            previousStatus: originalBooking.status,
            newStatus: 'cancelled',
            reason: effectiveReason,
          },
        },
      },
      { new: true }
    )

    if (!booking) {
      // Concurrent cancellation request won the race
      return Booking.findById(originalBooking._id).populate([
        { path: 'turf', select: 'name slug address images' },
        { path: 'sport', select: 'name slug' },
        { path: 'user', select: 'name email phone' },
        { path: 'paymentRecordedBy', select: 'name email' },
        { path: 'cancelledBy.user', select: 'name email' },
      ])
    }

    // Release slot reservations immediately
    await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
    if (booking.coupon?.couponId) {
      await couponService.releaseCouponOnCancellation(booking._id).catch(() => {})
    }

    // Process refund logic according to payment method and status
    if (booking.paymentMethod === 'stripe' && booking.paymentStatus === 'paid') {
      if (refundDetails.eligibleRefundAmount > 0) {
        const stripe = await getStripeService()
        await stripe.processStripeRefund({
          booking,
          refundAmountPaise: refundDetails.eligibleRefundAmount,
          requestingUser,
          reason: effectiveReason,
        })
      } else {
        // Zero refund due under cancellation policy
        booking.refundStatus = 'not_required'
        booking.refundAmount = 0
        await booking.save()
      }
    } else if (booking.paymentMethod === 'stripe' && booking.paymentStatus !== 'paid') {
      booking.refundStatus = 'not_applicable'
      booking.paymentStatus = 'failed'
      booking.refundAmount = 0
      await booking.save()
    } else {
      // Pay at Venue / Cash / Counter
      if (booking.paymentStatus === 'paid') {
        booking.refundStatus = 'not_required'
        booking.refundAmount = refundDetails.eligibleRefundAmount
      } else {
        booking.refundStatus = 'not_applicable'
        booking.refundAmount = 0
      }
      await booking.save()
    }

    // Emit availability update strictly AFTER database write is complete
    broadcastAvailabilityUpdate({ turfId: booking.turf, date: booking.date, reason: 'booking_cancelled' })

    await logAudit({
      actorId: requestingUser._id,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking._id,
      details: {
        bookingId: booking.bookingId,
        cancelledBy: requestingUser.role || (isAdmin ? 'admin' : 'customer'),
        reason: booking.cancellationReason,
        refundPercentage: booking.refundPercentage,
        refundAmount: booking.refundAmount,
        refundStatus: booking.refundStatus,
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
   * Get Authoritative Cancellation & Refund Preview
   * Calculates the exact refund estimate according to configured business rules and timezone
   */
  async getCancellationPreview(id, requestingUser) {
    const booking = await Booking.findById(id).populate([
      { path: 'turf', select: 'name slug address images' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
    ])
    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const isAdmin = requestingUser.role === 'admin'
    const isOwner =
      booking.user?._id?.toString() === requestingUser._id?.toString() ||
      booking.user?.toString() === requestingUser._id?.toString()

    if (!isAdmin && !isOwner) {
      const error = new Error('You are not authorized to preview cancellation for this booking.')
      error.statusCode = 403
      error.code = 'FORBIDDEN'
      throw error
    }

    const settings = await BusinessSettings.getSettings()
    const refundDetails = calculateRefundDetails({ booking, settings })

    return {
      booking: {
        _id: booking._id,
        bookingId: booking.bookingId,
        turf: booking.turf,
        sport: booking.sport,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        selectedSlots: booking.selectedSlots,
        totalAmount: booking.totalAmount,
        amountPaid: booking.amountPaid,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        refundStatus: booking.refundStatus,
      },
      calculation: refundDetails,
    }
  },

  /**
   * Admin Retry of Failed Stripe Refund
   * Safely retries Stripe refund processing with idempotency key
   */
  async retryRefund(id, adminUser, ip = '') {
    const booking = await Booking.findById(id)
    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    if (booking.status !== 'cancelled') {
      const error = new Error('Only cancelled bookings can have refunds processed.')
      error.statusCode = 400
      error.code = 'BOOKING_NOT_CANCELLED'
      throw error
    }

    if (booking.paymentMethod !== 'stripe') {
      const error = new Error('Only Stripe online payments can be refunded via Stripe.')
      error.statusCode = 400
      error.code = 'NOT_STRIPE_PAYMENT'
      throw error
    }

    if (booking.refundStatus === 'succeeded') {
      const error = new Error('This booking has already been successfully refunded.')
      error.statusCode = 400
      error.code = 'REFUND_ALREADY_SUCCEEDED'
      throw error
    }

    const settings = await BusinessSettings.getSettings()
    const refundDetails = calculateRefundDetails({ booking, settings })

    const refundAmountToRetry =
      refundDetails.eligibleRefundAmount > 0
        ? refundDetails.eligibleRefundAmount
        : Math.round((booking.amountPaid || 0) * ((booking.refundPercentage || 100) / 100))

    if (refundAmountToRetry <= 0) {
      const error = new Error('Eligible refund amount for this booking is zero.')
      error.statusCode = 400
      error.code = 'ZERO_REFUND_AMOUNT'
      throw error
    }

    const retryIdempotencyKey = `retry_refund_${booking._id}_${Date.now()}`
    const stripe = await getStripeService()
    const result = await stripe.processStripeRefund({
      booking,
      refundAmountPaise: refundAmountToRetry,
      requestingUser: adminUser,
      reason: 'Admin retry of failed refund',
      idempotencyKey: retryIdempotencyKey,
    })

    await logAudit({
      actorId: adminUser._id,
      action: 'REFUND_RETRIED',
      entityType: 'Booking',
      entityId: booking._id,
      details: {
        bookingId: booking.bookingId,
        refundStatus: booking.refundStatus,
        refundAmount: booking.refundAmount,
        success: result.success,
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
    refundStatus = '',
    turf = '',
    date = '',
    startDate = '',
    endDate = '',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    await this.reconcileOverdueBookings().catch(() => {})
    const query = {}

    if (status) {
      query.status = status.toLowerCase()
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus.toLowerCase()
    }

    if (refundStatus) {
      query.refundStatus = refundStatus.toLowerCase()
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

    // Auto-complete if confirmed and scheduled end time in venue timezone has passed
    if (booking.status === 'confirmed') {
      const tz = booking.turf?.timezone || DEFAULT_TIMEZONE
      const { endMs } = getBookingTimestamps(booking, tz)
      if (Date.now() >= endMs) {
        await Booking.updateOne({ _id: booking._id, status: 'confirmed' }, { $set: { status: 'completed' } })
        booking.status = 'completed'
      }
    }

    return booking
  },

  /**
   * Helper to determine whether a booking is eligible for customer self-service cancellation
   */
  isBookingCancellableByCustomer(booking, settings) {
    if (!booking) return false
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return false
    }

    const policy = settings?.cancellationPolicy || {
      enabled: true,
      cutoffHours: settings?.bookingRules?.cancellationCutoffHours ?? 4,
      allowCancellationWithinCutoff: false,
    }

    if (policy.enabled === false) return false

    const tz = booking.turf?.timezone || settings?.timezone || DEFAULT_TIMEZONE
    const slotStartTimeMs = getSlotTimestamp(booking.date, booking.startTime, tz)
    const nowMs = Date.now()
    const hoursRemaining = (slotStartTimeMs - nowMs) / (1000 * 60 * 60)
    const cutoffHours = policy.cutoffHours ?? settings?.bookingRules?.cancellationCutoffHours ?? 4

    return hoursRemaining >= cutoffHours || Boolean(policy.allowCancellationWithinCutoff)
  },

  /**
   * Reconcile overdue confirmed bookings into completed bookings,
   * expire stale unconfirmed pending bookings, and release unconfirmed holds.
   * Idempotent and concurrency-safe under simultaneous requests.
   */
  async reconcileOverdueBookings({ userId, turfId } = {}) {
    try {
      const settings = await BusinessSettings.getSettings()
      const defaultTimezone = settings?.timezone || DEFAULT_TIMEZONE
      const todayStr = getBusinessToday(defaultTimezone)
      const nowMs = Date.now()

      // 1. Reconcile confirmed bookings whose end time has passed
      const confirmedQuery = {
        status: 'confirmed',
        date: { $lte: todayStr },
      }
      if (userId) confirmedQuery.user = userId
      if (turfId) confirmedQuery.turf = turfId

      const overdueConfirmedCandidates = await Booking.find(confirmedQuery)
        .populate('turf', 'timezone')
        .select('_id date startTime endTime durationMinutes turf status')

      const completedIds = []
      for (const booking of overdueConfirmedCandidates) {
        const tz = booking.turf?.timezone || defaultTimezone
        const { endMs } = getBookingTimestamps(booking, tz)
        if (nowMs >= endMs) {
          completedIds.push(booking._id)
        }
      }

      if (completedIds.length > 0) {
        // Atomic & Idempotent: strictly matches status: 'confirmed'
        // Never overwrites cancelled or already completed bookings
        await Booking.updateMany(
          { _id: { $in: completedIds }, status: 'confirmed' },
          { $set: { status: 'completed' } }
        )
      }

      // 2. Expire unconfirmed pending bookings that exceeded payment window
      const pendingQuery = {
        status: 'pending',
        paymentExpiresAt: { $ne: null, $lte: new Date(nowMs) },
      }
      if (userId) pendingQuery.user = userId
      if (turfId) pendingQuery.turf = turfId

      const expiredPending = await Booking.find(pendingQuery).select('_id turf date')
      if (expiredPending.length > 0) {
        const expiredIds = expiredPending.map((b) => b._id)
        await Booking.updateMany(
          { _id: { $in: expiredIds }, status: 'pending' },
          {
            $set: {
              status: 'expired',
              paymentStatus: 'failed',
              paymentFailureReason: 'Payment session expired',
            },
          }
        )
        await SlotReservation.updateMany(
          { booking: { $in: expiredIds } },
          { $set: { status: 'released' } }
        )
        for (const b of expiredPending) {
          broadcastAvailabilityUpdate({
            turfId: b.turf,
            date: b.date,
            reason: 'hold_expired',
          })
        }
      }

      // 3. Expire stale temporary reservations and held slots
      await reservationService.expireStaleReservations(turfId, todayStr).catch(() => {})
    } catch (err) {
      logger.error({ error: err.message }, 'Failed during booking reconciliation')
    }
  },

  /**
   * Get customer's booking history with smart customer-friendly filters,
   * live counts, calendar date filtering, timezone awareness, automatic completion reconciliation, and pagination.
   */
  async getUserBookings(userId, { page = 1, limit = 10, status = '', filter = '', date = '' } = {}) {
    // 1. Reconcile overdue bookings first for this customer
    await this.reconcileOverdueBookings({ userId })

    const settings = await BusinessSettings.getSettings()
    const timezone = settings?.timezone || DEFAULT_TIMEZONE
    const businessToday = getBusinessToday(timezone)
    const businessCurrentTime = getBusinessCurrentTime(timezone)

    const activeFilter = (filter || status || 'all').toLowerCase()

    // 2. Compute live counts for all filter tabs in parallel
    const [allCount, upcomingCount, todayCount, pastCount, cancelledCount] = await Promise.all([
      Booking.countDocuments({ user: userId }),
      Booking.countDocuments({
        user: userId,
        status: 'confirmed',
        $or: [
          { date: { $gt: businessToday } },
          { date: businessToday, endTime: { $gt: businessCurrentTime } },
        ],
      }),
      Booking.countDocuments({ user: userId, date: businessToday }),
      Booking.countDocuments({ user: userId, status: 'completed' }),
      Booking.countDocuments({ user: userId, status: 'cancelled' }),
    ])

    // 3. Build query and sort based on activeFilter and optional date
    let query = { user: userId }
    let sortObj = { createdAt: -1 }

    if (date) {
      query.date = date
      if (activeFilter === 'upcoming') {
        query.status = 'confirmed'
      } else if (activeFilter === 'past' || activeFilter === 'completed') {
        query.status = 'completed'
      } else if (activeFilter === 'cancelled') {
        query.status = 'cancelled'
      }
      sortObj = { startTime: 1 }
    } else if (activeFilter === 'upcoming') {
      query = {
        user: userId,
        status: 'confirmed',
        $or: [
          { date: { $gt: businessToday } },
          { date: businessToday, endTime: { $gt: businessCurrentTime } },
        ],
      }
      sortObj = { date: 1, startTime: 1 }
    } else if (activeFilter === 'today') {
      query = {
        user: userId,
        date: businessToday,
      }
      sortObj = { startTime: 1 }
    } else if (activeFilter === 'past') {
      query = {
        user: userId,
        status: 'completed',
      }
      sortObj = { date: -1, endTime: -1, createdAt: -1 }
    } else if (activeFilter === 'cancelled') {
      query = {
        user: userId,
        status: 'cancelled',
      }
      sortObj = { cancelledAt: -1, updatedAt: -1 }
    } else if (activeFilter === 'confirmed') {
      // Legacy backward compatibility
      query = { user: userId, status: 'confirmed' }
      sortObj = { createdAt: -1 }
    } else if (activeFilter === 'completed') {
      // Legacy backward compatibility
      query = { user: userId, status: 'completed' }
      sortObj = { date: -1, endTime: -1 }
    } else {
      // 'all'
      query = { user: userId }
      sortObj = { createdAt: -1 }
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    const [rawBookings, total] = await Promise.all([
      Booking.find(query)
        .populate('turf', 'name slug address images facilities timezone openingHours')
        .populate('sport', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(query),
    ])

    // Compute contextual properties such as canCancel for each booking
    const bookings = rawBookings.map((b) => {
      const bObj = b.toObject ? b.toObject() : { ...b }
      bObj.canCancel = this.isBookingCancellableByCustomer(bObj, settings)
      return bObj
    })

    return {
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      counts: {
        all: allCount,
        upcoming: upcomingCount,
        today: todayCount,
        past: pastCount,
        cancelled: cancelledCount,
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
    await this.reconcileOverdueBookings().catch(() => {})
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
      const possibleHours = closeH <= openH ? (closeH + 24 - openH) : (closeH - openH)
      totalPossibleSlotsToday += Math.max(0, possibleHours)

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
