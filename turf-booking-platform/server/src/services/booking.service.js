import { Booking } from '../models/Booking.js'
import { Turf } from '../models/Turf.js'
import { Sport } from '../models/Sport.js'
import { AddOn } from '../models/AddOn.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { User } from '../models/User.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import { logAudit } from '../utils/auditLogger.js'
import pricingService from './pricing.service.js'

export const bookingService = {
  /**
   * Determine rate type and price for a slot based on date and time
   * Delegates to the central pricingService (single source of truth)
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
   */
  async getTurfSlots(turfId, dateStr) {
    const turf = await Turf.findById(turfId)
    if (!turf || !turf.isActive) {
      const error = new Error('Turf arena not found or inactive.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    const settings = await BusinessSettings.getSettings()
    const slotDuration = settings.bookingRules?.slotDurationMinutes || 60

    // Parse open/close hours (e.g. "06:00" to "23:00")
    const openTime = turf.openingHours?.open || '06:00'
    const closeTime = turf.openingHours?.close || '23:00'

    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)

    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM

    // Fetch confirmed/pending bookings for this turf on this date
    const [activeBookings, blockedSlots] = await Promise.all([
      Booking.find({
        turf: turfId,
        date: dateStr,
        status: { $in: ['pending', 'confirmed'] },
      }),
      BlockedSlot.find({
        turf: turfId,
        date: dateStr,
      }),
    ])

    const slots = []

    for (let current = openMinutes; current + slotDuration <= closeMinutes; current += slotDuration) {
      const startH = String(Math.floor(current / 60)).padStart(2, '0')
      const startM = String(current % 60).padStart(2, '0')
      const endH = String(Math.floor((current + slotDuration) / 60)).padStart(2, '0')
      const endM = String((current + slotDuration) % 60).padStart(2, '0')

      const startTime = `${startH}:${startM}`
      const endTime = `${endH}:${endM}`

      // Check if slot is blocked
      const blockedMatch = blockedSlots.find((b) => {
        return (
          (startTime >= b.startTime && startTime < b.endTime) ||
          (endTime > b.startTime && endTime <= b.endTime)
        )
      })

      // Check if slot is booked
      const bookedMatch = activeBookings.find((b) => {
        return (
          (startTime >= b.startTime && startTime < b.endTime) ||
          (endTime > b.startTime && endTime <= b.endTime)
        )
      })

      const { rateType, price } = this.calculateSlotPrice(turf, dateStr, startTime, endTime)

      let status = 'available'
      let reason = ''

      if (blockedMatch) {
        status = 'blocked'
        reason = blockedMatch.reason === 'maintenance' ? 'Arena Maintenance' : blockedMatch.reason === 'tournament' ? 'Tournament Match' : blockedMatch.note || 'Slot Blocked'
      } else if (bookedMatch) {
        status = 'booked'
        reason = 'Reserved by Player'
      }

      slots.push({
        date: dateStr,
        startTime,
        endTime,
        durationMinutes: slotDuration,
        rateType,
        price, // in paise
        priceFormatted: `₹${(price / 100).toFixed(2)}`,
        status, // 'available' | 'booked' | 'blocked'
        reason,
      })
    }

    return {
      turf: {
        id: turf._id,
        name: turf.name,
        slug: turf.slug,
        size: turf.size,
        surface: turf.surface,
      },
      date: dateStr,
      slots,
    }
  },

  /**
   * Create Booking (Customer or Admin)
   */
  async createBooking(data, user, ip = '') {
    const { turfId, sportId, date, startTime, endTime, addOns = [], paymentMethod = 'pay_at_venue' } = data

    const turf = await Turf.findById(turfId)
    if (!turf || !turf.isActive) {
      const error = new Error('Turf arena not found or inactive.')
      error.statusCode = 404
      error.code = 'TURF_NOT_FOUND'
      throw error
    }

    // Check if slot is blocked
    const isBlocked = await BlockedSlot.findOne({
      turf: turfId,
      date,
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      ],
    })
    if (isBlocked) {
      const error = new Error(`Slot is unavailable due to ${isBlocked.reason}.`)
      error.statusCode = 400
      error.code = 'SLOT_BLOCKED'
      throw error
    }

    // Check if slot is already booked (cancelled bookings DO NOT conflict)
    const existingBooking = await Booking.findOne({
      turf: turfId,
      date,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      ],
    })
    if (existingBooking) {
      const error = new Error('This slot is already booked.')
      error.statusCode = 409
      error.code = 'SLOT_ALREADY_BOOKED'
      throw error
    }

    // Calculate slot pricing
    const { rateType, price: slotPrice } = this.calculateSlotPrice(turf, date, startTime, endTime)

    // Calculate Add-Ons
    let addOnsDetails = []
    let addOnsTotal = 0

    if (Array.isArray(addOns) && addOns.length > 0) {
      for (const item of addOns) {
        const addon = await AddOn.findById(item.addOnId)
        if (addon && addon.isActive) {
          const qty = Number(item.quantity) || 1
          const itemTotal = addon.price * qty
          addOnsTotal += itemTotal
          addOnsDetails.push({
            addOn: addon._id,
            name: addon.name,
            price: addon.price,
            quantity: qty,
          })
        }
      }
    }

    const subtotal = slotPrice + addOnsTotal

    // Calculate Taxes
    const settings = await BusinessSettings.getSettings()
    const taxRate = settings.taxSettings?.taxEnabled ? settings.taxSettings.taxRatePercentage : 0
    const taxAmount = Math.round((subtotal * taxRate) / 100)
    const totalAmount = subtotal + taxAmount

    // Unique readable Booking ID: TB-YYMMDD-XXXX
    const dateCode = date.replace(/-/g, '').slice(2)
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const bookingId = `TB-${dateCode}-${randomCode}`

    const booking = await Booking.create({
      bookingId,
      user: user._id,
      turf: turfId,
      sport: sportId,
      date,
      startTime,
      endTime,
      rateType,
      slotPrice,
      addOns: addOnsDetails,
      addOnsTotal,
      subtotal,
      taxRatePercentage: taxRate,
      taxAmount,
      totalAmount,
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod,
    })

    await logAudit({
      actorId: user._id,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: booking._id,
      details: { bookingId, turf: turf.name, totalAmount },
      ip,
    })

    return booking.populate([
      { path: 'turf', select: 'name slug address images' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
    ])
  },

  /**
   * Update booking status (Admin only)
   * If status changed to 'cancelled', the slot is immediately released for booking!
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
    booking.status = status

    if (status === 'cancelled') {
      booking.cancellationReason = cancellationReason || 'Cancelled by Administrator'
      booking.cancelledAt = new Date()
    } else if (status === 'completed') {
      booking.paymentStatus = 'paid'
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
      { path: 'turf', select: 'name slug address' },
      { path: 'sport', select: 'name slug' },
      { path: 'user', select: 'name email phone' },
    ])
  },

  /**
   * Admin Booking Search & Filtering
   */
  async getAdminBookings({ page = 1, limit = 20, status = '', search = '', date = '' } = {}) {
    const query = {}

    if (status) query.status = status
    if (date) query.date = date

    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('turf', 'name slug address')
        .populate('sport', 'name slug')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ])

    return {
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    }
  },

  /**
   * Get single booking by ID
   */
  async getBookingById(id) {
    const booking = await Booking.findById(id)
      .populate('turf', 'name slug address images')
      .populate('sport', 'name slug')
      .populate('user', 'name email phone')

    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    return booking
  },

  /**
   * Get customer's booking history
   */
  async getUserBookings(userId) {
    return Booking.find({ user: userId })
      .populate('turf', 'name slug address images')
      .populate('sport', 'name slug')
      .sort({ createdAt: -1 })
  },

  /**
   * Admin Dashboard Analytics (Today's bookings, revenue, users, free slots today)
   */
  async getDashboardMetrics() {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // 1. Today's non-cancelled bookings
    const todayBookingsQuery = {
      date: today,
      status: { $in: ['confirmed', 'completed', 'pending'] },
    }

    const [todayBookingsDocs, totalUsers, activeTurfs, recentBookings] = await Promise.all([
      Booking.find(todayBookingsQuery),
      User.countDocuments(),
      Turf.find({ isActive: true }),
      Booking.find()
        .populate('turf', 'name slug')
        .populate('sport', 'name slug')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(6),
    ])

    const todayBookings = todayBookingsDocs.length
    const todayRevenuePaise = todayBookingsDocs.reduce((acc, b) => acc + (b.totalAmount || 0), 0)

    // Calculate free slots today across all active turfs
    let totalPossibleSlotsToday = 0
    let totalBookedSlotsToday = todayBookings
    let totalBlockedSlotsToday = 0

    const todayBlocked = await BlockedSlot.find({ date: today })
    totalBlockedSlotsToday = todayBlocked.length

    for (const turf of activeTurfs) {
      const openH = Number((turf.openingHours?.open || '06:00').split(':')[0])
      const closeH = Number((turf.openingHours?.close || '23:00').split(':')[0])
      const hours = Math.max(0, closeH - openH)
      totalPossibleSlotsToday += hours
    }

    const freeSlotsToday = Math.max(0, totalPossibleSlotsToday - totalBookedSlotsToday - totalBlockedSlotsToday)

    return {
      today,
      metrics: {
        todayBookings,
        todayRevenue: todayRevenuePaise,
        todayRevenueFormatted: `₹${(todayRevenuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        totalUsers,
        freeSlotsToday,
        totalPossibleSlotsToday,
        activeTurfsCount: activeTurfs.length,
      },
      recentBookings,
    }
  },
}

export default bookingService
