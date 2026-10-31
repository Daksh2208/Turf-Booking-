import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { AddOn } from '../src/models/AddOn.js'
import { Booking } from '../src/models/Booking.js'
import { BlockedSlot } from '../src/models/BlockedSlot.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import { Reservation } from '../src/models/Reservation.js'
import { HeldSlot } from '../src/models/HeldSlot.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import { Coupon } from '../src/models/Coupon.js'
import pricingService from '../src/services/pricing.service.js'
import reservationService from '../src/services/reservation.service.js'
import * as socketModule from '../src/socket.js'

describe('PHASE 3: Booking & Pricing Reliability Production Engineering Suite', () => {
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminCookie = ''
  let user1 = null
  let user2 = null
  let adminUser = null
  let footballSport = null
  let cricketSport = null
  let inactiveSport = null
  let testTurf = null
  let testAddOnBooking = null
  let testAddOnHourly = null
  let testAddOnPlayer = null
  let testCoupon = null

  // Fixed test dates in the future
  const TEST_WEEKDAY = '2026-11-24' // Tuesday
  const TEST_WEEKEND = '2026-11-28' // Saturday

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up previous test artifacts
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p3_cust1@turf.com', 'p3_cust2@turf.com', 'p3_admin@turf.com'] },
      }),
      Sport.deleteMany({ slug: { $in: ['p3-football', 'p3-cricket', 'p3-inactive'] } }),
      Turf.deleteMany({ slug: 'p3-champions-arena' }),
      AddOn.deleteMany({ name: { $in: ['P3 Ball Flat', 'P3 Coach Hourly', 'P3 Jersey Player'] } }),
      Coupon.deleteMany({ code: 'P3SAVE10' }),
      Booking.deleteMany({ date: { $in: [TEST_WEEKDAY, TEST_WEEKEND] } }),
      SlotReservation.deleteMany({ date: { $in: [TEST_WEEKDAY, TEST_WEEKEND] } }),
      Reservation.deleteMany({ date: { $in: [TEST_WEEKDAY, TEST_WEEKEND] } }),
      HeldSlot.deleteMany({ date: { $in: [TEST_WEEKDAY, TEST_WEEKEND] } }),
      BlockedSlot.deleteMany({ date: { $in: [TEST_WEEKDAY, TEST_WEEKEND] } }),
    ])

    const passwordHash = await bcrypt.hash('Password@123', 10)

    // Seed Users
    user1 = await User.create({
      name: 'P3 Customer One',
      email: 'p3_cust1@turf.com',
      phone: '9876543210',
      passwordHash,
      role: 'customer',
      isActive: true,
    })

    user2 = await User.create({
      name: 'P3 Customer Two',
      email: 'p3_cust2@turf.com',
      phone: '9876543211',
      passwordHash,
      role: 'customer',
      isActive: true,
    })

    adminUser = await User.create({
      name: 'P3 Platform Admin',
      email: 'p3_admin@turf.com',
      phone: '9876543212',
      passwordHash,
      role: 'admin',
      isActive: true,
    })

    // Logins to get session cookies
    const login1 = await request(app).post('/api/v1/auth/login').send({
      email: 'p3_cust1@turf.com',
      password: 'Password@123',
    })
    customer1Cookie = login1.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    const login2 = await request(app).post('/api/v1/auth/login').send({
      email: 'p3_cust2@turf.com',
      password: 'Password@123',
    })
    customer2Cookie = login2.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'p3_admin@turf.com',
      password: 'Password@123',
    })
    adminCookie = loginAdmin.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    // Seed Sports
    footballSport = await Sport.create({
      name: 'P3 Football',
      slug: 'p3-football',
      icon: 'football',
      isActive: true,
    })

    cricketSport = await Sport.create({
      name: 'P3 Cricket',
      slug: 'p3-cricket',
      icon: 'cricket',
      isActive: true,
    })

    inactiveSport = await Sport.create({
      name: 'P3 Inactive Sport',
      slug: 'p3-inactive',
      icon: 'ban',
      isActive: false,
    })

    // Seed Turf (only associates with footballSport, base: 1000, peak: 1500 (18:00-23:00), weekend: 1400)
    testTurf = await Turf.create({
      name: 'P3 Champions Arena',
      slug: 'p3-champions-arena',
      sports: [footballSport._id], // Cricket is NOT supported on this turf
      surface: 'Artificial Turf',
      size: '7v7',
      address: {
        street: '123 Stadium Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      openingHours: { open: '06:00', close: '23:00' },
      capacity: { minPlayers: 4, maxPlayers: 16 },
      pricing: {
        baseRate: 100000, // ₹1,000 in integer paise
        peakRate: 150000, // ₹1,500
        weekendRate: 140000, // ₹1,400
        weekendDays: [0, 6], // Sunday, Saturday
        peakHours: { start: '18:00', end: '23:00' },
      },
      isActive: true,
    })

    // Seed Add-ons
    testAddOnBooking = await AddOn.create({
      name: 'P3 Ball Flat',
      price: 20000, // ₹200 flat
      pricingUnit: 'per_booking',
      isActive: true,
    })

    testAddOnHourly = await AddOn.create({
      name: 'P3 Coach Hourly',
      price: 50000, // ₹500/hr
      pricingUnit: 'per_hour',
      isActive: true,
    })

    testAddOnPlayer = await AddOn.create({
      name: 'P3 Jersey Player',
      price: 5000, // ₹50/player
      pricingUnit: 'per_player',
      isActive: true,
    })

    // Seed Coupon (10% discount, max ₹500)
    testCoupon = await Coupon.create({
      code: 'P3SAVE10',
      description: '10% off for Phase 3 test',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountAmount: 50000,
      minBookingAmount: 50000,
      isActive: true,
      startAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })

    // Ensure BusinessSettings GST is 18%
    const settings = await BusinessSettings.getSettings()
    settings.taxSettings = {
      taxEnabled: true,
      taxName: 'GST',
      taxRatePercentage: 18,
    }
    settings.bookingRules.cancellationCutoffHours = 4
    await settings.save()
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p3_cust1@turf.com', 'p3_cust2@turf.com', 'p3_admin@turf.com'] },
      }),
      Sport.deleteMany({ slug: { $in: ['p3-football', 'p3-cricket', 'p3-inactive'] } }),
      Turf.deleteMany({ slug: 'p3-champions-arena' }),
      AddOn.deleteMany({ name: { $in: ['P3 Ball Flat', 'P3 Coach Hourly', 'P3 Jersey Player'] } }),
      Coupon.deleteMany({ code: 'P3SAVE10' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      SlotReservation.deleteMany({ turf: testTurf?._id }),
      Reservation.deleteMany({ turf: testTurf?._id }),
      HeldSlot.deleteMany({ turf: testTurf?._id }),
      BlockedSlot.deleteMany({ turf: testTurf?._id }),
    ])
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 1 — ACCURATE PRICE CALCULATIONS
  // --------------------------------------------------------------------------
  describe('Requirement 1: Authoritative Dynamic Pricing Engine', () => {
    it('1.1 calculates standard weekday normal-hour slot at base rate in integer paise', async () => {
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKDAY,
        startTime: '10:00',
        endTime: '11:00',
      })

      expect(quote.turfSubtotal).toBe(100000) // ₹1,000
      expect(quote.hourlySegments[0].rateType).toBe('base')
      expect(quote.tax.taxAmount).toBe(18000) // 18% of 100000
      expect(quote.finalTotal).toBe(118000) // ₹1,180
    })

    it('1.2 calculates weekday peak-hour slot at peak rate', async () => {
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKDAY,
        startTime: '19:00',
        endTime: '20:00',
      })

      expect(quote.turfSubtotal).toBe(150000) // ₹1,500 peak rate
      expect(quote.hourlySegments[0].rateType).toBe('peak')
      expect(quote.tax.taxAmount).toBe(27000) // 18% of 150000
      expect(quote.finalTotal).toBe(177000) // ₹1,770
    })

    it('1.3 calculates weekend normal-hour slot at weekend rate', async () => {
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKEND,
        startTime: '10:00',
        endTime: '11:00',
      })

      expect(quote.turfSubtotal).toBe(140000) // ₹1,400 weekend rate
      expect(quote.hourlySegments[0].rateType).toBe('weekend')
      expect(quote.finalTotal).toBe(165200) // ₹1,400 + 18% GST (25200)
    })

    it('1.4 resolves weekend + peak overlap deterministically using max(weekendRate, peakRate)', async () => {
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKEND,
        startTime: '20:00',
        endTime: '21:00',
      })

      // peakRate (150000) > weekendRate (140000) -> 150000
      expect(quote.turfSubtotal).toBe(150000)
      expect(quote.hourlySegments[0].rateType).toBe('weekend_peak')
    })

    it('1.5 handles weekend + peak overlap when weekendRate is undefined, safely falling back to max(baseRate, peakRate)', () => {
      const turfNoWeekend = {
        pricing: {
          baseRate: 100000,
          peakRate: 120000,
          weekendRate: undefined,
          weekendDays: [6],
        },
      }

      const pricing = pricingService.getSegmentPricing(turfNoWeekend, TEST_WEEKEND, '19:00', '20:00')
      expect(pricing.rateType).toBe('weekend_peak')
      expect(pricing.segmentPrice).toBe(120000) // max(baseRate 100000, peakRate 120000)
    })

    it('1.6 calculates multi-slot booking spanning normal and peak hours', async () => {
      // 17:00 to 19:00 on weekday: 17-18 base (100000), 18-19 peak (150000)
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKDAY,
        startTime: '17:00',
        endTime: '19:00',
      })

      expect(quote.hourlySegments).toHaveLength(2)
      expect(quote.hourlySegments[0].segmentPrice).toBe(100000)
      expect(quote.hourlySegments[1].segmentPrice).toBe(150000)
      expect(quote.turfSubtotal).toBe(250000) // ₹2,500
    })

    it('1.7 calculates add-ons with distinct pricing units: per_booking, per_hour, and per_player', async () => {
      // 2 hours duration, 10 players
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKDAY,
        startTime: '10:00',
        endTime: '12:00',
        playerCount: 10,
        addOns: [
          { addOnId: testAddOnBooking._id.toString(), quantity: 1 }, // ₹200 flat = 20000
          { addOnId: testAddOnHourly._id.toString(), quantity: 1 },  // ₹500/hr * 2h = 100000
          { addOnId: testAddOnPlayer._id.toString(), quantity: 1 },  // ₹50/player * 10p = 50000
        ],
      })

      // Turf: 2h * 100000 = 200000
      expect(quote.turfSubtotal).toBe(200000)
      expect(quote.addOnsSubtotal).toBe(20000 + 100000 + 50000) // 170000
      expect(quote.preDiscountSubtotal).toBe(370000)
      expect(quote.tax.taxAmount).toBe(Math.round((370000 * 18) / 100)) // 66600
      expect(quote.finalTotal).toBe(370000 + 66600) // 436600
    })

    it('1.8 correctly applies coupon discount before GST calculation', async () => {
      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id.toString(),
        date: TEST_WEEKDAY,
        startTime: '10:00',
        endTime: '11:00',
        couponCode: 'P3SAVE10',
      })

      // Turf: 100000. 10% discount = 10000.
      expect(quote.turfSubtotal).toBe(100000)
      expect(quote.discountAmount).toBe(10000)
      expect(quote.taxableAmount).toBe(90000)
      expect(quote.tax.taxAmount).toBe(Math.round((90000 * 18) / 100)) // 16200
      expect(quote.finalTotal).toBe(90000 + 16200) // 106200
    })

    it('1.9 rejects client price tampering and detects price change when expectedTotal is supplied', async () => {
      // Customer tries to book with stale / altered price
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          expectedTotal: 9999, // Stale price doesn't match actual ₹1,180
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(409)
      expect(res.body.error?.code || res.body.code).toBe('PRICE_CHANGED')
    })
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 2 — PREVENT DOUBLE BOOKINGS
  // --------------------------------------------------------------------------
  describe('Requirement 2: Concurrency & Duplicate Booking Protection', () => {
    it('2.1 allows only one customer when two submit simultaneous holds for the same slot', async () => {
      const slotTime = '08:00'

      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/v1/reservations/hold')
          .set('Cookie', customer1Cookie)
          .send({
            turfId: testTurf._id.toString(),
            date: TEST_WEEKDAY,
            slots: [slotTime],
          }),
        request(app)
          .post('/api/v1/reservations/hold')
          .set('Cookie', customer2Cookie)
          .send({
            turfId: testTurf._id.toString(),
            date: TEST_WEEKDAY,
            slots: [slotTime],
          }),
      ])

      const statuses = [resA.status, resB.status].sort()
      // Exactly one succeeds (200), the other is rejected with conflict (409)
      expect(statuses).toEqual([200, 409])

      const conflictRes = resA.status === 409 ? resA : resB
      expect(conflictRes.body.error?.code || conflictRes.body.code).toBe('SLOT_ALREADY_HELD')

      // Clean up hold
      await reservationService.releaseReservation({
        user: user1,
        turfId: testTurf._id,
        date: TEST_WEEKDAY,
      })
      await reservationService.releaseReservation({
        user: user2,
        turfId: testTurf._id,
        date: TEST_WEEKDAY,
      })
    })

    it('2.2 allows only one booking when two customers simultaneously book the same slot', async () => {
      const slotTime = '09:00'

      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/v1/bookings')
          .set('Cookie', customer1Cookie)
          .send({
            turfId: testTurf._id.toString(),
            sportId: footballSport._id.toString(),
            date: TEST_WEEKDAY,
            startTime: slotTime,
            endTime: '10:00',
            selectedSlots: [slotTime],
            paymentMethod: 'Pay at Venue',
          }),
        request(app)
          .post('/api/v1/bookings')
          .set('Cookie', customer2Cookie)
          .send({
            turfId: testTurf._id.toString(),
            sportId: footballSport._id.toString(),
            date: TEST_WEEKDAY,
            startTime: slotTime,
            endTime: '10:00',
            selectedSlots: [slotTime],
            paymentMethod: 'Pay at Venue',
          }),
      ])

      const statuses = [resA.status, resB.status].sort()
      expect(statuses).toEqual([201, 409])

      const conflictRes = resA.status === 409 ? resA : resB
      expect(conflictRes.body.error?.code || conflictRes.body.code).toBe('SLOT_ALREADY_BOOKED')
    })

    it('2.3 rejects customer booking on an admin blocked slot', async () => {
      // Create admin block for 12:00-13:00
      await BlockedSlot.create({
        turf: testTurf._id,
        date: TEST_WEEKDAY,
        startTime: '12:00',
        endTime: '13:00',
        reason: 'maintenance',
      })

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '12:00',
          endTime: '13:00',
          selectedSlots: ['12:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('SLOT_BLOCKED')
    })
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 3 — SLOT HOLDS, EXPIRATION & MULTI-SLOT ATOMICITY
  // --------------------------------------------------------------------------
  describe('Requirement 3: Temporary Slot Holds & Expiration Reliability', () => {
    it('3.1 successfully creates a 10-minute slot hold with server expiration time', async () => {
      const res = await request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
          slots: ['13:00'],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.reservation.remainingSeconds).toBeGreaterThan(580)
      expect(res.body.data.reservation.remainingSeconds).toBeLessThanOrEqual(600)

      // Other customer sees this slot as 'held'
      const availRes = await request(app)
        .get(`/api/v1/availability?turfId=${testTurf._id}&date=${TEST_WEEKDAY}`)
        .set('Cookie', customer2Cookie)

      const slot13 = availRes.body.data.slots.find((s) => s.startTime === '13:00')
      expect(slot13.status).toBe('held')
      expect(slot13.isMine).toBe(false)

      // Releasing customer 1 hold
      await request(app)
        .post('/api/v1/reservations/release')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
        })
        .expect(200)
    })

    it('3.2 guarantees multi-slot atomicity: if one slot is unavailable, all requested slots are rolled back with zero orphaned holds', async () => {
      // First, customer 2 holds 15:00
      await request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
          slots: ['15:00'],
        })
        .expect(200)

      // Customer 1 attempts to hold 14:00 and 15:00 simultaneously
      const res = await request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
          slots: ['14:00', '15:00'],
        })

      expect(res.status).toBe(409)
      expect(res.body.error?.code || res.body.code).toBe('SLOT_ALREADY_HELD')

      // Verify that slot 14:00 was NOT orphaned as an active hold by Customer 1!
      const orphanedHold = await HeldSlot.findOne({
        turf: testTurf._id,
        date: TEST_WEEKDAY,
        slotTime: '14:00',
        status: 'active',
        user: user1._id,
      })
      expect(orphanedHold).toBeNull()

      // Slot 14:00 must remain completely available for anyone
      const availRes = await request(app)
        .get(`/api/v1/availability?turfId=${testTurf._id}&date=${TEST_WEEKDAY}`)

      const slot14 = availRes.body.data.slots.find((s) => s.startTime === '14:00')
      expect(slot14.status).toBe('available')

      // Clean up customer 2 hold
      await reservationService.releaseReservation({
        user: user2,
        turfId: testTurf._id,
        date: TEST_WEEKDAY,
      })
    })

    it('3.3 expired hold automatically releases and allows another customer to book', async () => {
      // Create a hold that expired 1 minute ago
      const expiredAt = new Date(Date.now() - 60000)
      const resDoc = await Reservation.create({
        reservationId: `RES-EXPIRED-TEST-${Date.now()}`,
        user: user1._id,
        turf: testTurf._id,
        date: TEST_WEEKDAY,
        slots: ['16:00'],
        startTime: '16:00',
        endTime: '17:00',
        status: 'active',
        expiresAt: expiredAt,
      })

      await HeldSlot.create({
        turf: testTurf._id,
        date: TEST_WEEKDAY,
        slotTime: '16:00',
        reservation: resDoc._id,
        user: user1._id,
        status: 'active',
        expiresAt: expiredAt,
      })

      // Customer 2 attempts to book 16:00
      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '16:00',
          endTime: '17:00',
          selectedSlots: ['16:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(bookingRes.status).toBe(201)
      expect(bookingRes.body.success).toBe(true)
    })

    it('3.4 checkout submission with an expired reservation ID is rejected with RESERVATION_EXPIRED (410)', async () => {
      const expiredAt = new Date(Date.now() - 60000)
      const expiredRes = await Reservation.create({
        reservationId: 'RES-EXP-SUBMIT',
        user: user1._id,
        turf: testTurf._id,
        date: TEST_WEEKDAY,
        slots: ['21:00'],
        startTime: '21:00',
        endTime: '22:00',
        status: 'active',
        expiresAt: expiredAt,
      })

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '21:00',
          endTime: '22:00',
          selectedSlots: ['21:00'],
          reservationId: expiredRes.reservationId,
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(410)
      expect(res.body.error?.code || res.body.code).toBe('RESERVATION_EXPIRED')
    })
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 4 — REAL-TIME SYNCHRONIZATION
  // --------------------------------------------------------------------------
  describe('Requirement 4: Real-Time Availability Broadcasts', () => {
    it('4.1 broadcasts availability update event on slot hold creation and release', async () => {
      const broadcastSpy = vi.spyOn(socketModule, 'broadcastAvailabilityUpdate')

      // Hold slot
      await request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
          slots: ['22:00'],
        })
        .expect(200)

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
          reason: 'hold_created',
        })
      )

      // Release slot
      await request(app)
        .post('/api/v1/reservations/release')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_WEEKDAY,
        })
        .expect(200)

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          turfId: testTurf._id,
          date: TEST_WEEKDAY,
          reason: 'hold_released',
        })
      )

      broadcastSpy.mockRestore()
    })
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 5 — CANCELLATION AND INVENTORY RELEASE
  // --------------------------------------------------------------------------
  describe('Requirement 5: Secure Cancellation & Inventory Lifecycle', () => {
    let testBookingId = null
    let testBookingDocId = null

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '06:00',
          endTime: '07:00',
          selectedSlots: ['06:00'],
          paymentMethod: 'Pay at Venue',
        })

      testBookingDocId = createRes.body.data.booking._id
      testBookingId = createRes.body.data.booking.bookingId
    })

    it('5.1 prevents a customer from cancelling another customer\'s booking (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingDocId}/cancel`)
        .set('Cookie', customer2Cookie)
        .send({ cancellationReason: 'Malicious attempt' })

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('FORBIDDEN')
    })

    it('5.2 customer successfully cancels their own booking before cutoff and slot is released', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingDocId}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Change of schedule' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.cancellationReason).toBe('Change of schedule')

      // Slot 06:00 is immediately released and available again
      const availRes = await request(app)
        .get(`/api/v1/availability?turfId=${testTurf._id}&date=${TEST_WEEKDAY}`)

      const slot06 = availRes.body.data.slots.find((s) => s.startTime === '06:00')
      expect(slot06.status).toBe('available')
    })

    it('5.3 duplicate cancellation is handled idempotently without error', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingDocId}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Repeated click' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
    })

    it('5.4 customer cannot cancel a completed booking', async () => {
      const completedBooking = await Booking.create({
        bookingId: 'TB-COMPLETED-TEST',
        user: user1._id,
        turf: testTurf._id,
        sport: footballSport._id,
        date: TEST_WEEKDAY,
        startTime: '10:00',
        endTime: '11:00',
        slotPrice: 100000,
        subtotal: 100000,
        totalAmount: 118000,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking._id}/cancel`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('CANNOT_CANCEL_COMPLETED_BOOKING')
    })
  })

  // --------------------------------------------------------------------------
  // REQUIREMENT 6 — STRICT BACKEND VALIDATION & DATA INTEGRITY
  // --------------------------------------------------------------------------
  describe('Requirement 6: Strict Backend Validation & Data Consistency', () => {
    it('6.1 rejects booking with inactive turf (400 TURF_INACTIVE)', async () => {
      const inactiveSlug = `p3-inactive-${Date.now()}`
      const inactiveTurf = await Turf.create({
        name: 'P3 Inactive Turf',
        slug: inactiveSlug,
        sports: [footballSport._id],
        surface: 'Grass',
        size: '5v5',
        address: {
          street: '999 Inactive Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
        },
        openingHours: { open: '06:00', close: '23:00' },
        pricing: { baseRate: 100000 },
        isActive: false,
      })

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: inactiveTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('TURF_INACTIVE')
      await Turf.deleteOne({ _id: inactiveTurf._id })
    })

    it('6.2 rejects booking for past date (400 PAST_DATE_NOT_ALLOWED)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: '2020-01-01',
          startTime: '10:00',
          endTime: '11:00',
          selectedSlots: ['10:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('PAST_DATE_NOT_ALLOWED')
    })

    it('6.3 rejects sport that is not supported by the selected turf (400 SPORT_NOT_SUPPORTED)', async () => {
      // testTurf only supports footballSport; cricketSport must be rejected!
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: cricketSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('SPORT_NOT_SUPPORTED')
    })

    it('6.4 rejects inactive sport (400 SPORT_INACTIVE)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: inactiveSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('SPORT_INACTIVE')
    })

    it('6.5 rejects invalid add-on ID and invalid add-on quantity', async () => {
      const resInvalidId = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          addOns: [{ addOnId: '507f1f77bcf86cd799439011', quantity: 1 }],
          paymentMethod: 'Pay at Venue',
        })

      expect(resInvalidId.status).toBe(404)
      expect(resInvalidId.body.error?.code || resInvalidId.body.code).toBe('ADDON_NOT_FOUND')

      const resInvalidQty = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: footballSport._id.toString(),
          date: TEST_WEEKDAY,
          startTime: '07:00',
          endTime: '08:00',
          selectedSlots: ['07:00'],
          addOns: [{ addOnId: testAddOnBooking._id.toString(), quantity: -2 }],
          paymentMethod: 'Pay at Venue',
        })

      expect(resInvalidQty.status).toBe(400)
      expect(resInvalidQty.body.error?.code || resInvalidQty.body.code).toBe('INVALID_ADDON_QUANTITY')
    })
  })
})
