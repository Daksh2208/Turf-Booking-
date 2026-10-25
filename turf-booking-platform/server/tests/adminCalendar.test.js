import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { BlockedSlot } from '../src/models/BlockedSlot.js'
import { HeldSlot } from '../src/models/HeldSlot.js'
import { Reservation } from '../src/models/Reservation.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import bcrypt from 'bcryptjs'

describe('Admin Booking Calendar and Slot Management Suite', () => {
  let adminCookie = ''
  let customerCookie = ''
  let adminUser = null
  let customerUser = null
  let testSport = null
  let testTurf = null

  const testFutureDate = '2028-11-15'
  const testPastDate = '2025-01-10'

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up any test records
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_calendar_test@turf.com', 'customer_calendar_test@turf.com'] } }),
      Sport.deleteMany({ slug: 'calendar-sport-test' }),
      Turf.deleteMany({ slug: 'calendar-turf-test' }),
      Booking.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      BlockedSlot.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      HeldSlot.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      Reservation.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
    ])

    const hashedPassword = await bcrypt.hash('Password@123', 10)

    // Create Admin
    adminUser = await User.create({
      name: 'Calendar Admin',
      email: 'admin_calendar_test@turf.com',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
    })

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin_calendar_test@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLogin.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    // Create Customer
    customerUser = await User.create({
      name: 'Calendar Player',
      email: 'customer_calendar_test@turf.com',
      phone: '9898989898',
      passwordHash: hashedPassword,
      role: 'customer',
      isActive: true,
    })

    const custLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'customer_calendar_test@turf.com',
      password: 'Password@123',
    })
    customerCookie = custLogin.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    // Create Sport & Turf
    testSport = await Sport.create({
      name: 'Calendar Cricket',
      slug: 'calendar-sport-test',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Calendar Arena Test',
      slug: 'calendar-turf-test',
      sports: [testSport._id],
      openingHours: { open: '06:00', close: '23:00' },
      pricing: {
        baseRate: 80000,
        peakRate: 120000,
        weekendRate: 140000,
        peakHours: { start: '18:00', end: '23:00' },
      },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      isActive: true,
      address: { street: 'Main St', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015' },
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: { $in: ['admin_calendar_test@turf.com', 'customer_calendar_test@turf.com'] } }),
      Sport.deleteMany({ slug: 'calendar-sport-test' }),
      Turf.deleteMany({ slug: 'calendar-turf-test' }),
      Booking.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      BlockedSlot.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      HeldSlot.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
      Reservation.deleteMany({ date: { $in: [testFutureDate, testPastDate] } }),
    ])
  })

  describe('1. Security & Role Authorization', () => {
    it('rejects unauthenticated requests to calendar endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/calendar/summary')
      expect(res.status).toBe(401)
    })

    it('rejects non-admin customers from accessing calendar endpoints with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/calendar/summary')
        .set('Cookie', [customerCookie])
      expect(res.status).toBe(403)
    })

    it('allows authenticated administrator to access calendar endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/calendar/summary')
        .set('Cookie', [adminCookie])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.summary).toBeDefined()
      expect(res.body.data.days).toBeDefined()
    })
  })

  describe('2. Date Navigation, Validation & Boundaries', () => {
    it('rejects invalid date formats with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/calendar/summary?startDate=bad-date&endDate=2028-11-20')
        .set('Cookie', [adminCookie])
      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('INVALID_DATE_FORMAT')
    })

    it('rejects inverted date ranges where startDate > endDate with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/calendar/summary?startDate=2028-11-20&endDate=2028-11-10')
        .set('Cookie', [adminCookie])
      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('INVALID_DATE_RANGE')
    })

    it('allows browsing historical dates for reporting', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/calendar/summary?startDate=${testPastDate}&endDate=${testPastDate}`)
        .set('Cookie', [adminCookie])
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.days[0].isPast).toBe(true)
    })
  })

  describe('3. Metric Calculations: Distinct Bookings vs Occupied Slots vs Holds vs Revenue', () => {
    let multiSlotBooking = null
    let singleSlotPaidBooking = null
    let cancelledBooking = null
    let testBlock = null

    beforeAll(async () => {
      // 1. Multi-slot booking (2 hours: 10:00 to 12:00) with status 'confirmed', paymentStatus 'unpaid'
      multiSlotBooking = await Booking.create({
        bookingId: 'BK-CAL-MULTI',
        user: customerUser._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: testFutureDate,
        startTime: '10:00',
        endTime: '12:00',
        selectedSlots: ['10:00', '11:00'],
        durationMinutes: 120,
        playerCount: 10,
        slotPrice: 160000,
        subtotal: 160000,
        totalAmount: 188800, // ₹1,888.00
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
        contactDetails: { name: 'Player One', email: 'cust1@turf.com', phone: '9898989898' },
      })

      // 2. Single-slot paid booking (1 hour: 14:00 to 15:00) with status 'confirmed', paymentStatus 'paid'
      singleSlotPaidBooking = await Booking.create({
        bookingId: 'BK-CAL-PAID',
        user: customerUser._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: testFutureDate,
        startTime: '14:00',
        endTime: '15:00',
        selectedSlots: ['14:00'],
        durationMinutes: 60,
        playerCount: 6,
        slotPrice: 80000,
        subtotal: 80000,
        totalAmount: 94400, // ₹944.00
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        amountPaid: 94400,
        contactDetails: { name: 'Player Two', email: 'cust2@turf.com', phone: '9898989899' },
      })

      // 3. Cancelled booking (16:00 to 17:00) - slots must NOT be counted as occupied!
      cancelledBooking = await Booking.create({
        bookingId: 'BK-CAL-CANC',
        user: customerUser._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: testFutureDate,
        startTime: '16:00',
        endTime: '17:00',
        selectedSlots: ['16:00'],
        durationMinutes: 60,
        playerCount: 10,
        slotPrice: 80000,
        subtotal: 80000,
        totalAmount: 94400,
        status: 'cancelled',
        paymentStatus: 'unpaid',
      })

      // 4. Admin Blocked Slot (18:00 to 20:00 = 2 hours)
      testBlock = await BlockedSlot.create({
        turf: testTurf._id,
        date: testFutureDate,
        startTime: '18:00',
        endTime: '20:00',
        reason: 'maintenance',
        note: 'Pitch leveling',
        createdBy: adminUser._id,
      })

      // 5. Active temporary hold (08:00)
      const resv = await Reservation.create({
        reservationId: 'RES-CAL-TEST',
        turf: testTurf._id,
        date: testFutureDate,
        user: customerUser._id,
        startTime: '08:00',
        endTime: '09:00',
        slots: ['08:00'],
        status: 'active',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future
      })

      await HeldSlot.create({
        turf: testTurf._id,
        date: testFutureDate,
        slotTime: '08:00',
        reservation: resv._id,
        user: customerUser._id,
        status: 'active',
        expiresAt: resv.expiresAt,
      })
    })

    it('correctly distinguishes total bookings (2) from occupied slots (3) in calendar summary', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/calendar/summary?startDate=${testFutureDate}&endDate=${testFutureDate}&turfId=${testTurf._id}`)
        .set('Cookie', [adminCookie])

      expect(res.status).toBe(200)
      const day = res.body.data.days[0]

      // Non-cancelled bookings count = 2 (multiSlotBooking + singleSlotPaidBooking)
      expect(day.totalBookings).toBe(2)
      // Cancelled booking is counted under cancelledBookings, NOT totalBookings
      expect(day.cancelledBookings).toBe(1)

      // Distinct occupied slots = 3 ('10:00', '11:00', '14:00')
      expect(day.occupiedSlots).toBe(3)

      // Blocked slots = 2 ('18:00', '19:00')
      expect(day.blockedSlots).toBe(2)

      // Active temporary holds = 1 ('08:00')
      expect(day.heldSlots).toBe(1)

      // Revenue strictly counts only paid bookings (₹944 = 94400 paise)
      expect(day.revenuePaise).toBe(94400)
      expect(day.revenueFormatted).toBe('₹944.00')

      // Amount due = ₹1,888.00 (from unpaid Pay at Venue booking)
      expect(day.duePaise).toBe(188800)
    })

    it('returns detailed slot breakdown in day schedule endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/calendar/day?date=${testFutureDate}&turfId=${testTurf._id}`)
        .set('Cookie', [adminCookie])

      expect(res.status).toBe(200)
      const data = res.body.data
      expect(data.date).toBe(testFutureDate)
      expect(data.turf.name).toBe('Calendar Arena Test')

      // Check slot statuses
      const slot08 = data.slots.find((s) => s.startTime === '08:00')
      expect(slot08.status).toBe('held')
      expect(slot08.held).toBeDefined()

      const slot10 = data.slots.find((s) => s.startTime === '10:00')
      expect(slot10.status).toBe('confirmed')
      expect(slot10.booking.bookingId).toBe('BK-CAL-MULTI')

      const slot11 = data.slots.find((s) => s.startTime === '11:00')
      expect(slot11.status).toBe('confirmed')
      expect(slot11.booking.bookingId).toBe('BK-CAL-MULTI')

      const slot14 = data.slots.find((s) => s.startTime === '14:00')
      expect(slot14.status).toBe('confirmed')
      expect(slot14.booking.paymentStatus).toBe('paid')

      const slot16 = data.slots.find((s) => s.startTime === '16:00')
      // Released slot from cancelled booking must be available!
      expect(slot16.status).toBe('available')

      const slot18 = data.slots.find((s) => s.startTime === '18:00')
      expect(slot18.status).toBe('blocked')
      expect(slot18.blocked.reason).toBe('maintenance')
    })

    it('returns 7-day schedule grid with events in week schedule endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/calendar/week?startDate=${testFutureDate}&turfId=${testTurf._id}`)
        .set('Cookie', [adminCookie])

      expect(res.status).toBe(200)
      const data = res.body.data
      expect(data.days).toHaveLength(7)
      const targetDay = data.days.find((d) => d.date === testFutureDate)
      expect(targetDay).toBeDefined()
      expect(targetDay.events.length).toBeGreaterThanOrEqual(3) // 2 bookings + 1 block + 1 hold
    })
  })

  describe('4. Slot Blocking & Concurrency Protection', () => {
    it('prevents blocking a slot that has an active booking (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/blocked-slots')
        .set('Cookie', [adminCookie])
        .send({
          turf: testTurf._id,
          date: testFutureDate,
          startTime: '10:00',
          endTime: '11:00',
          reason: 'maintenance',
        })

      expect(res.status).toBe(409)
      expect(res.body.error?.code || res.body.code).toBe('BOOKING_CONFLICT')
    })

    it('prevents blocking a slot that has an active temporary hold (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/blocked-slots')
        .set('Cookie', [adminCookie])
        .send({
          turf: testTurf._id,
          date: testFutureDate,
          startTime: '08:00',
          endTime: '09:00',
          reason: 'maintenance',
        })

      expect(res.status).toBe(409)
      expect(res.body.error?.code || res.body.code).toBe('RESERVATION_HOLD_CONFLICT')
    })

    it('allows blocking an available future slot and then unblocking it', async () => {
      // Block 21:00 to 22:00
      const blockRes = await request(app)
        .post('/api/v1/admin/blocked-slots')
        .set('Cookie', [adminCookie])
        .send({
          turf: testTurf._id,
          date: testFutureDate,
          startTime: '21:00',
          endTime: '22:00',
          reason: 'private_event',
          note: 'Evening private hire',
        })

      expect(blockRes.status).toBe(201)
      const blockId = blockRes.body.data.blockedSlot._id

      // Verify slot is now blocked
      const dayRes = await request(app)
        .get(`/api/v1/admin/calendar/day?date=${testFutureDate}&turfId=${testTurf._id}`)
        .set('Cookie', [adminCookie])
      const slot21 = dayRes.body.data.slots.find((s) => s.startTime === '21:00')
      expect(slot21.status).toBe('blocked')

      // Unblock it
      const unblockRes = await request(app)
        .delete(`/api/v1/admin/blocked-slots/${blockId}`)
        .set('Cookie', [adminCookie])
      expect(unblockRes.status).toBe(200)

      // Verify slot returns to available
      const dayResAfter = await request(app)
        .get(`/api/v1/admin/calendar/day?date=${testFutureDate}&turfId=${testTurf._id}`)
        .set('Cookie', [adminCookie])
      const slot21After = dayResAfter.body.data.slots.find((s) => s.startTime === '21:00')
      expect(slot21After.status).toBe('available')
    })
  })
})
