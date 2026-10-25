import mongoose from 'mongoose'
import { Reservation } from '../models/Reservation.js'
import { HeldSlot } from '../models/HeldSlot.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { Booking } from '../models/Booking.js'
import { Turf } from '../models/Turf.js'
import pricingService from './pricing.service.js'
import { broadcastAvailabilityUpdate } from '../socket.js'
import { logger } from '../config/logger.js'

// Default hold duration: 10 minutes (600 seconds)
export const HOLD_DURATION_MINUTES = 10
export const HOLD_DURATION_MS = HOLD_DURATION_MINUTES * 60 * 1000

export const reservationService = {
  /**
   * Lazily expire stale reservations and held slots whose expiresAt is in the past
   */
  async expireStaleReservations(turfId, date) {
    const now = new Date()
    const query = { status: 'active', expiresAt: { $lte: now } }
    if (turfId) query.turf = turfId
    if (date) query.date = date

    const expiredRes = await Reservation.find(query).select('_id turf date')
    if (expiredRes.length > 0) {
      const resIds = expiredRes.map((r) => r._id)
      await Reservation.updateMany({ _id: { $in: resIds } }, { $set: { status: 'expired' } })
      await HeldSlot.updateMany({ reservation: { $in: resIds } }, { $set: { status: 'expired' } })

      // Broadcast update for each affected turf/date
      const affected = new Set(expiredRes.map((r) => `${r.turf}:${r.date}`))
      for (const key of affected) {
        const [tId, d] = key.split(':')
        broadcastAvailabilityUpdate({ turfId: tId, date: d, reason: 'hold_expired' })
      }
    }
  },

  /**
   * Hold one or more discrete slots for an authenticated customer
   */
  async holdSlots({ user, turfId, date, slots: requestedSlots, reservationId } = {}) {
    if (!user || !user._id) {
      const err = new Error('Authentication required to reserve a slot.')
      err.statusCode = 401
      err.code = 'UNAUTHENTICATED'
      throw err
    }

    if (user.role === 'admin') {
      const err = new Error('Administrators cannot reserve customer slots.')
      err.statusCode = 403
      err.code = 'ADMIN_RESERVATION_FORBIDDEN'
      throw err
    }

    if (!turfId || !mongoose.Types.ObjectId.isValid(turfId)) {
      const err = new Error('Valid turf arena ID is required.')
      err.statusCode = 400
      err.code = 'INVALID_TURF_ID'
      throw err
    }

    const turf = await Turf.findById(turfId)
    if (!turf || !turf.isActive) {
      const err = new Error('Turf arena not found or currently inactive.')
      err.statusCode = 404
      err.code = 'TURF_NOT_FOUND'
      throw err
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const err = new Error('Valid date is required in YYYY-MM-DD format.')
      err.statusCode = 400
      err.code = 'INVALID_DATE'
      throw err
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    if (date < todayStr) {
      const err = new Error('Cannot reserve slots for past dates.')
      err.statusCode = 400
      err.code = 'PAST_DATE_NOT_ALLOWED'
      throw err
    }

    if (!Array.isArray(requestedSlots) || requestedSlots.length === 0) {
      const err = new Error('At least one slot must be selected to create a reservation.')
      err.statusCode = 400
      err.code = 'MISSING_SLOTS'
      throw err
    }

    // Normalize and sort slot times
    const slotTimes = [...new Set(requestedSlots.map((s) => (typeof s === 'string' ? s : s.startTime)))].sort()

    // Validate slot times format and operating hours
    const openTime = turf.openingHours?.open || '06:00'
    const closeTime = turf.openingHours?.close || '23:00'

    for (const st of slotTimes) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(st)) {
        const err = new Error(`Invalid slot time format "${st}". Expected HH:mm.`)
        err.statusCode = 400
        err.code = 'INVALID_SLOT_TIME'
        throw err
      }
      if (st < openTime || st >= closeTime) {
        const err = new Error(
          `Slot ${st} is outside the arena operating hours (${openTime} - ${closeTime}).`
        )
        err.statusCode = 400
        err.code = 'OUTSIDE_OPERATING_HOURS'
        throw err
      }
    }

    const startTime = slotTimes[0]
    const lastStart = slotTimes[slotTimes.length - 1]
    const lastHour = Number(lastStart.split(':')[0]) + 1
    const endTime = `${String(lastHour).padStart(2, '0')}:00`

    // 1. Expire stale holds first
    await this.expireStaleReservations(turfId, date)

    // 2. Check Admin Blocked Slots
    for (const st of slotTimes) {
      const blocked = await BlockedSlot.findOne({
        turf: turfId,
        date,
        startTime: { $lte: st },
        endTime: { $gt: st },
      })
      if (blocked) {
        const err = new Error(`Slot ${st} is unavailable due to admin block: ${blocked.reason}.`)
        err.statusCode = 400
        err.code = 'SLOT_BLOCKED'
        throw err
      }
    }

    // 3. Check Confirmed / Pending Bookings
    const booked = await Booking.findOne({
      turf: turfId,
      date,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { selectedSlots: { $in: slotTimes } },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } },
          ],
        },
      ],
    })
    if (booked) {
      const err = new Error('One or more selected slots are already booked by another customer.')
      err.statusCode = 409
      err.code = 'SLOT_ALREADY_BOOKED'
      throw err
    }

    // 4. Check active holds by OTHER customers
    const otherHeldSlot = await HeldSlot.findOne({
      turf: turfId,
      date,
      slotTime: { $in: slotTimes },
      status: 'active',
      user: { $ne: user._id },
      expiresAt: { $gt: new Date() },
    })
    if (otherHeldSlot) {
      const err = new Error(
        `Slot ${otherHeldSlot.slotTime} is temporarily held by another customer.`
      )
      err.statusCode = 409
      err.code = 'SLOT_ALREADY_HELD'
      throw err
    }

    // 5. Atomic Reservation Creation or Update
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS)
    let reservationDoc = null

    // Check if user already has an active reservation for this turf & date, or specified by reservationId
    let existingReservation = null
    if (reservationId) {
      existingReservation = await Reservation.findOne({
        reservationId,
        user: user._id,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })
    }
    if (!existingReservation) {
      existingReservation = await Reservation.findOne({
        turf: turfId,
        date,
        user: user._id,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })
    }

    if (existingReservation) {
      // Retain or renew expiration: preserve original remaining time unless renewing
      const effectiveExpiresAt = existingReservation.expiresAt > new Date()
        ? existingReservation.expiresAt
        : expiresAt

      // Identify slots to add and slots to release
      const oldSlots = existingReservation.slots || []
      const slotsToRemove = oldSlots.filter((s) => !slotTimes.includes(s))
      const slotsToAdd = slotTimes.filter((s) => !oldSlots.includes(s))

      if (slotsToRemove.length > 0) {
        await HeldSlot.updateMany(
          {
            reservation: existingReservation._id,
            slotTime: { $in: slotsToRemove },
          },
          { $set: { status: 'released' } }
        )
      }

      if (slotsToAdd.length > 0) {
        const newHeldDocs = slotsToAdd.map((st) => ({
          turf: turfId,
          date,
          slotTime: st,
          reservation: existingReservation._id,
          user: user._id,
          status: 'active',
          expiresAt: effectiveExpiresAt,
        }))
        try {
          await HeldSlot.insertMany(newHeldDocs)
        } catch (err) {
          if (err.code === 11000) {
            const conflictErr = new Error('One or more selected slots were just held by another customer.')
            conflictErr.statusCode = 409
            conflictErr.code = 'SLOT_ALREADY_HELD'
            throw conflictErr
          }
          throw err
        }
      }

      existingReservation.slots = slotTimes
      existingReservation.startTime = startTime
      existingReservation.endTime = endTime
      existingReservation.expiresAt = effectiveExpiresAt
      await existingReservation.save()

      reservationDoc = existingReservation
    } else {
      // Create new reservation
      const dateCode = date.replace(/-/g, '').slice(2)
      const randomCode = Math.floor(1000 + Math.random() * 9000)
      const newReservationId = `RES-${dateCode}-${randomCode}`

      try {
        reservationDoc = await Reservation.create({
          reservationId: newReservationId,
          user: user._id,
          turf: turfId,
          date,
          slots: slotTimes,
          startTime,
          endTime,
          status: 'active',
          expiresAt,
        })

        const heldDocs = slotTimes.map((st) => ({
          turf: turfId,
          date,
          slotTime: st,
          reservation: reservationDoc._id,
          user: user._id,
          status: 'active',
          expiresAt,
        }))

        await HeldSlot.insertMany(heldDocs)
      } catch (err) {
        if (reservationDoc?._id) {
          await Reservation.deleteOne({ _id: reservationDoc._id }).catch(() => {})
        }
        if (err.code === 11000) {
          const conflictErr = new Error('One or more selected slots were just held by another customer.')
          conflictErr.statusCode = 409
          conflictErr.code = 'SLOT_ALREADY_HELD'
          throw conflictErr
        }
        throw err
      }
    }

    // 6. Recalculate price quote
    let quote = null
    try {
      quote = await pricingService.calculateQuote({
        turfId,
        date,
        startTime,
        endTime,
        slots: slotTimes.map((st) => ({
          startTime: st,
          endTime: `${String(Number(st.split(':')[0]) + 1).padStart(2, '0')}:00`,
        })),
        playerCount: turf.capacity?.minPlayers || 10,
        user,
      })
    } catch (e) {
      logger.warn({ error: e.message }, 'Failed to compute price quote for hold')
    }

    // 7. Broadcast real-time availability update
    broadcastAvailabilityUpdate({ turfId, date, reason: 'hold_created' })

    const remainingSeconds = Math.max(
      0,
      Math.round((new Date(reservationDoc.expiresAt).getTime() - Date.now()) / 1000)
    )

    return {
      reservation: {
        id: reservationDoc._id,
        reservationId: reservationDoc.reservationId,
        turfId: reservationDoc.turf,
        date: reservationDoc.date,
        slots: reservationDoc.slots,
        startTime: reservationDoc.startTime,
        endTime: reservationDoc.endTime,
        expiresAt: reservationDoc.expiresAt,
        remainingSeconds,
        status: reservationDoc.status,
      },
      quote,
    }
  },

  /**
   * Retrieve active, unexpired reservation for current authenticated customer
   */
  async getCurrentReservation({ user, turfId, date } = {}) {
    if (!user || !user._id) return null

    await this.expireStaleReservations(turfId, date)

    const query = {
      user: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }
    if (turfId) query.turf = turfId
    if (date) query.date = date

    const reservation = await Reservation.findOne(query)
      .sort({ createdAt: -1 })
      .populate('turf', 'name slug address openingHours images')

    if (!reservation) return null

    const remainingSeconds = Math.max(
      0,
      Math.round((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000)
    )

    return {
      id: reservation._id,
      reservationId: reservation.reservationId,
      turfId: reservation.turf?._id || reservation.turf,
      turf: reservation.turf,
      date: reservation.date,
      slots: reservation.slots,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      expiresAt: reservation.expiresAt,
      remainingSeconds,
      status: reservation.status,
    }
  },

  /**
   * Explicitly release a reservation by user
   */
  async releaseReservation({ user, reservationId, turfId, date } = {}) {
    if (!user || !user._id) {
      const err = new Error('Authentication required.')
      err.statusCode = 401
      err.code = 'UNAUTHENTICATED'
      throw err
    }

    const query = { user: user._id, status: 'active' }
    if (reservationId) query.reservationId = reservationId
    if (turfId) query.turf = turfId
    if (date) query.date = date

    const reservation = await Reservation.findOne(query)
    if (!reservation) {
      return { success: true, released: false, message: 'No active reservation found to release.' }
    }

    reservation.status = 'released'
    await reservation.save()

    await HeldSlot.updateMany(
      { reservation: reservation._id, status: 'active' },
      { $set: { status: 'released' } }
    )

    broadcastAvailabilityUpdate({
      turfId: reservation.turf,
      date: reservation.date,
      reason: 'hold_released',
    })

    return { success: true, released: true, reservationId: reservation.reservationId }
  },

  /**
   * Renew/extend a customer's reservation
   */
  async renewReservation({ user, reservationId } = {}) {
    if (!user || !user._id) {
      const err = new Error('Authentication required.')
      err.statusCode = 401
      err.code = 'UNAUTHENTICATED'
      throw err
    }

    const reservation = await Reservation.findOne({
      reservationId,
      user: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() },
    })

    if (!reservation) {
      const err = new Error('Active reservation not found or has already expired.')
      err.statusCode = 404
      err.code = 'RESERVATION_NOT_FOUND'
      throw err
    }

    // Recheck if any slot was blocked or booked
    const blocked = await BlockedSlot.findOne({
      turf: reservation.turf,
      date: reservation.date,
      startTime: { $lt: reservation.endTime },
      endTime: { $gt: reservation.startTime },
    })
    if (blocked) {
      reservation.status = 'released'
      await reservation.save()
      await HeldSlot.updateMany({ reservation: reservation._id }, { $set: { status: 'released' } })
      const err = new Error('Slot was blocked by arena administration.')
      err.statusCode = 409
      err.code = 'SLOT_BLOCKED'
      throw err
    }

    const newExpiresAt = new Date(Date.now() + HOLD_DURATION_MS)
    reservation.expiresAt = newExpiresAt
    await reservation.save()

    await HeldSlot.updateMany(
      { reservation: reservation._id, status: 'active' },
      { $set: { expiresAt: newExpiresAt } }
    )

    broadcastAvailabilityUpdate({
      turfId: reservation.turf,
      date: reservation.date,
      reason: 'hold_renewed',
    })

    const remainingSeconds = Math.max(
      0,
      Math.round((newExpiresAt.getTime() - Date.now()) / 1000)
    )

    return {
      reservation: {
        id: reservation._id,
        reservationId: reservation.reservationId,
        turfId: reservation.turf,
        date: reservation.date,
        slots: reservation.slots,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        expiresAt: newExpiresAt,
        remainingSeconds,
        status: reservation.status,
      },
    }
  },

  /**
   * Convert reservation to confirmed booking atomically
   */
  async convertReservationToBooking({ reservationId, bookingId, user, session } = {}) {
    if (!reservationId) return null

    const query = { reservationId, user: user._id, status: 'active' }
    const reservation = await Reservation.findOne(query).session(session || null)
    if (!reservation) return null

    reservation.status = 'converted'
    reservation.booking = bookingId
    await reservation.save({ session: session || null })

    const heldQuery = { reservation: reservation._id, status: 'active' }
    if (session) {
      await HeldSlot.updateMany(heldQuery, { $set: { status: 'converted' } }, { session })
    } else {
      await HeldSlot.updateMany(heldQuery, { $set: { status: 'converted' } })
    }

    broadcastAvailabilityUpdate({
      turfId: reservation.turf,
      date: reservation.date,
      reason: 'booking_confirmed',
    })

    return reservation
  },
}

export default reservationService
