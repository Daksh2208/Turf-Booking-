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
import { SlotReservation } from '../src/models/SlotReservation.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import bcrypt from 'bcryptjs'

describe('Part 11: Admin Booking Management, Cancellation Workflow and Dashboard Analytics Suite', () => {
  let adminCookie = ''
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminUser = null
  let customer1 = null
  let customer2 = null
  let testSport = null
  let testTurf = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up previous test runs
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'admin_part11@turf.com',
            'customer1_part11@turf.com',
            'customer2_part11@turf.com',
          ],
        },
      }),
      Sport.deleteMany({ slug: 'cricket-part11-test' }),
      Turf.deleteMany({ slug: 'arena-part11-test' }),
    ])

    const hashedPassword = await bcrypt.hash('Password@123', 10)

    // Create Admin
    adminUser = await User.create({
      name: 'Super Admin Part 11',
      email: 'admin_part11@turf.com',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
    })

    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin_part11@turf.com',
      password: 'Password@123',
    })
    adminCookie = adminLoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer 1
    customer1 = await User.create({
      name: 'Player One Part 11',
      email: 'customer1_part11@turf.com',
      phone: '9876543211',
      passwordHash: hashedPassword,
      role: 'customer',
      isActive: true,
    })

    const c1LoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'customer1_part11@turf.com',
      password: 'Password@123',
    })
    customer1Cookie = c1LoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer 2
    customer2 = await User.create({
      name: 'Player Two Part 11',
      email: 'customer2_part11@turf.com',
      phone: '9876543222',
      passwordHash: hashedPassword,
      role: 'customer',
      isActive: true,
    })

    const c2LoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'customer2_part11@turf.com',
      password: 'Password@123',
    })
    customer2Cookie = c2LoginRes.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Sport & Turf
    testSport = await Sport.create({
      name: 'Part 11 Cricket',
      slug: 'cricket-part11-test',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Part 11 Premier Turf',
      slug: 'arena-part11-test',
      sports: [testSport._id],
      address: {
        street: '500 Arena Boulevard',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
      },
      pricing: {
        baseRate: 80000, // ₹800/hr
        peakRate: 120000, // ₹1200/hr
        weekendRate: 140000,
        peakHours: { start: '18:00', end: '23:00' },
      },
      openingHours: { open: '06:00', close: '23:00' },
      capacity: { minPlayers: 2, maxPlayers: 22 },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: {
          $in: [
            'admin_part11@turf.com',
            'customer1_part11@turf.com',
            'customer2_part11@turf.com',
          ],
        },
      }),
      Sport.deleteMany({ slug: 'cricket-part11-test' }),
      Turf.deleteMany({ slug: 'arena-part11-test' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      BlockedSlot.deleteMany({ turf: testTurf?._id }),
      SlotReservation.deleteMany({ turf: testTurf?._id }),
    ])
  })

  // 1. Non-admin users cannot access admin booking APIs
  it('1. non-admin users cannot access admin booking APIs (403 Forbidden)', async () => {
    // Attempting GET /api/v1/admin/bookings
    const resList = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Cookie', customer1Cookie)
      .expect(403)
    expect(resList.body.success).toBe(false)

    // Attempting GET /api/v1/admin/dashboard
    const resDash = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', customer1Cookie)
      .expect(403)
    expect(resDash.body.success).toBe(false)
  })

  // 2. Admin booking list filters and pagination
  it('2. admin booking list supports search, turf, status, date, paymentStatus and pagination', async () => {
    // Create a booking with customer 1
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        sportId: testSport._id,
        date: '2026-11-20',
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const bookingRef = createRes.body.data.booking.bookingId

    // Filter by booking reference search
    const searchRes = await request(app)
      .get(`/api/v1/admin/bookings?search=${bookingRef}`)
      .set('Cookie', adminCookie)
      .expect(200)

    expect(searchRes.body.success).toBe(true)
    expect(searchRes.body.data.bookings.length).toBe(1)
    expect(searchRes.body.data.bookings[0].bookingId).toBe(bookingRef)
    expect(searchRes.body.data.pagination).toHaveProperty('total')
    expect(searchRes.body.data.pagination).toHaveProperty('totalPages')

    // Filter by Turf
    const turfRes = await request(app)
      .get(`/api/v1/admin/bookings?turf=${testTurf._id}`)
      .set('Cookie', adminCookie)
      .expect(200)
    expect(turfRes.body.data.bookings.some((b) => b.bookingId === bookingRef)).toBe(true)

    // Filter by paymentStatus = unpaid
    const unpaidRes = await request(app)
      .get('/api/v1/admin/bookings?paymentStatus=unpaid')
      .set('Cookie', adminCookie)
      .expect(200)
    expect(unpaidRes.body.data.bookings.some((b) => b.bookingId === bookingRef)).toBe(true)
  })

  // 3. Booking detail authorization
  it("3. customer cannot access another customer's booking detail, but admin can access any", async () => {
    // Customer 1 creates booking
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-20',
        startTime: '12:00',
        endTime: '13:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const bookingId = createRes.body.data.booking._id

    // Customer 2 attempts to view Customer 1's booking -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Cookie', customer2Cookie)
      .expect(403)
    expect(forbiddenRes.body.success).toBe(false)

    // Admin can access booking details via admin route
    const adminRes = await request(app)
      .get(`/api/v1/admin/bookings/${bookingId}`)
      .set('Cookie', adminCookie)
      .expect(200)
    expect(adminRes.body.success).toBe(true)
    expect(adminRes.body.data.booking._id).toBe(bookingId.toString())
  })

  // 4. Valid and invalid status transitions
  it('4. enforces valid status transitions and rejects invalid transitions (e.g. cancelled -> completed)', async () => {
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-20',
        startTime: '14:00',
        endTime: '15:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const booking = createRes.body.data.booking

    // Confirmed -> Completed is valid
    const completeRes = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'completed' })
      .expect(200)
    expect(completeRes.body.data.booking.status).toBe('completed')

    // Completed -> Cancelled is valid
    const cancelRes = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'cancelled', cancellationReason: 'Player injured' })
      .expect(200)
    expect(cancelRes.body.data.booking.status).toBe('cancelled')

    // Cancelled -> Completed is INVALID (400 INVALID_STATUS_TRANSITION)
    const invalidRes = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'completed' })
      .expect(400)
    expect(invalidRes.body.success).toBe(false)
    expect(invalidRes.body.error?.code || invalidRes.body.code).toBe('INVALID_STATUS_TRANSITION')

    // Repeated cancellation request is safe (idempotent 200)
    const repeatCancel = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'cancelled', cancellationReason: 'Repeat cancel' })
      .expect(200)
    expect(repeatCancel.body.data.booking.status).toBe('cancelled')
  })

  // 5. Cancellation releases the slot immediately
  it('5. cancellation releases occupied slot so it becomes available immediately in availability queries', async () => {
    // 1. Customer books 15:00 - 16:00
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-20',
        startTime: '15:00',
        endTime: '16:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const booking = createRes.body.data.booking

    // Slot is booked
    const bookedCheck = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-11-20`)
      .expect(200)
    const slot15Before = bookedCheck.body.data.slots.find((s) => s.startTime === '15:00')
    expect(slot15Before.status).toBe('booked')

    // Cancel booking via dedicated cancel endpoint
    const cancelRes = await request(app)
      .post(`/api/v1/admin/bookings/${booking._id}/cancel`)
      .set('Cookie', adminCookie)
      .send({ cancellationReason: 'Weather condition' })
      .expect(200)
    expect(cancelRes.body.data.booking.status).toBe('cancelled')

    // Slot is now available immediately!
    const availableCheck = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-11-20`)
      .expect(200)
    const slot15After = availableCheck.body.data.slots.find((s) => s.startTime === '15:00')
    expect(slot15After.status).toBe('available')
  })

  // 6. Cancellation does not delete historical booking data
  it('6. cancellation preserves booking record for historical reporting and audits', async () => {
    const bookingInDb = await Booking.findOne({
      turf: testTurf._id,
      date: '2026-11-20',
      startTime: '15:00',
    })
    expect(bookingInDb).toBeDefined()
    expect(bookingInDb.status).toBe('cancelled')
    expect(bookingInDb.cancelledAt).toBeDefined()
    expect(bookingInDb.cancellationReason).toBe('Weather condition')
    expect(bookingInDb.cancelledBy.role).toBe('admin')
    expect(bookingInDb.totalAmount).toBeGreaterThan(0)
  })

  // 7. Repeated cancellation requests are safe (idempotent)
  it('7. repeated cancellation requests are safe and do not corrupt data', async () => {
    const bookingInDb = await Booking.findOne({
      turf: testTurf._id,
      date: '2026-11-20',
      startTime: '15:00',
    })

    const repeatRes = await request(app)
      .post(`/api/v1/admin/bookings/${bookingInDb._id}/cancel`)
      .set('Cookie', adminCookie)
      .send({ cancellationReason: 'Duplicate click' })
      .expect(200)

    expect(repeatRes.body.success).toBe(true)
    expect(repeatRes.body.data.booking.status).toBe('cancelled')
  })

  // 8. Cancelled bookings do not count as occupied slots
  it('8. cancelled bookings do not prevent another customer from booking that slot', async () => {
    // Customer 2 can now book the previously cancelled slot (15:00 - 16:00)
    const rebookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-20',
        startTime: '15:00',
        endTime: '16:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    expect(rebookRes.body.success).toBe(true)
    expect(rebookRes.body.data.booking.status).toBe('confirmed')
  })

  // 9. Admin blocks still prevent availability after cancellation
  it('9. admin blocks still prevent availability even after booking cancellation', async () => {
    // 1. Customer books 16:00 - 17:00
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-21',
        startTime: '16:00',
        endTime: '17:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const booking = createRes.body.data.booking

    // 2. Admin cancels booking
    await request(app)
      .post(`/api/v1/admin/bookings/${booking._id}/cancel`)
      .set('Cookie', adminCookie)
      .send({ cancellationReason: 'Tournament scheduling' })
      .expect(200)

    // 3. Admin blocks this slot for maintenance
    await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: testTurf._id,
        date: '2026-11-21',
        startTime: '16:00',
        endTime: '17:00',
        reason: 'maintenance',
        note: 'Turf rolling maintenance',
      })
      .expect(201)

    // Slot must be BLOCKED, not available!
    const checkRes = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-11-21`)
      .expect(200)
    const slot16 = checkRes.body.data.slots.find((s) => s.startTime === '16:00')
    expect(slot16.status).toBe('blocked')
  })

  // 10. Pay at Venue bookings are NOT counted as collected revenue until payment is recorded
  it('10. unpaid Pay at Venue bookings are not counted as revenue until explicitly recorded as paid', async () => {
    // Today's date in business timezone
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1. Check current revenue before today's booking
    const dashBefore = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)
    const initialRevenue = dashBefore.body.data.metrics.todayRevenue

    // 2. Customer creates an unpaid Pay at Venue booking for today
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: todayStr,
        startTime: '07:00',
        endTime: '08:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const todayBooking = createRes.body.data.booking
    expect(todayBooking.paymentStatus).toBe('unpaid')

    // 3. Check dashboard: revenue must NOT increase because it is unpaid!
    const dashAfterUnpaid = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)
    expect(dashAfterUnpaid.body.data.metrics.todayRevenue).toBe(initialRevenue)
    expect(dashAfterUnpaid.body.data.metrics.todayUnpaidValue).toBeGreaterThan(0)

    // 4. Admin explicitly records payment
    const payRes = await request(app)
      .post(`/api/v1/admin/bookings/${todayBooking._id}/payment`)
      .set('Cookie', adminCookie)
      .send({
        paymentMethod: 'Pay at Venue',
        notes: 'Cash collected at counter',
      })
      .expect(200)

    expect(payRes.body.data.booking.paymentStatus).toBe('paid')
    expect(payRes.body.data.booking.paidAt).toBeDefined()
    expect(payRes.body.data.booking.paymentRecordedBy).toBeDefined()

    // 5. Dashboard now counts this as realized revenue!
    const dashAfterPaid = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)
    expect(dashAfterPaid.body.data.metrics.todayRevenue).toBe(
      initialRevenue + todayBooking.totalAmount
    )
  })

  // 11. Ordinary customers cannot mark bookings as paid
  it('11. ordinary customers cannot mark bookings as paid (403 Forbidden)', async () => {
    const anyBooking = await Booking.findOne({ paymentStatus: 'unpaid' })
    if (anyBooking) {
      const forbiddenPay = await request(app)
        .post(`/api/v1/admin/bookings/${anyBooking._id}/payment`)
        .set('Cookie', customer1Cookie)
        .send({ paymentMethod: 'upi' })
        .expect(403)

      expect(forbiddenPay.body.success).toBe(false)
    }
  })

  // 12. Dashboard counts respect the business timezone
  it('12. dashboard metrics report configured business timezone and date', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('timezone')
    expect(res.body.data).toHaveProperty('today')
    expect(res.body.data.timezone).toMatch(/Asia\/Kolkata|UTC/i)
  })

  // 13. Available-slot statistics account for bookings and blocked slots
  it('13. available-slot statistics accurately deduct active bookings and blocked slots without duplicate counting', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)

    const { metrics } = res.body.data
    expect(metrics).toHaveProperty('freeSlotsToday')
    expect(metrics).toHaveProperty('totalPossibleSlotsToday')
    expect(metrics).toHaveProperty('totalOccupiedSlotsToday')
    expect(metrics.freeSlotsToday).toBe(
      metrics.totalPossibleSlotsToday - metrics.totalOccupiedSlotsToday
    )
  })

  // 14. Historical prices remain unchanged if admin later edits turf rates
  it('14. historical booking prices remain completely unchanged if turf rates are later modified', async () => {
    // 1. Create booking at current rate (₹800/hr + 18% GST = ₹944 = 94400 paise)
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-22',
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    const bookingId = bookingRes.body.data.booking._id
    const originalTotal = bookingRes.body.data.booking.totalAmount
    const originalSlotPrice = bookingRes.body.data.booking.slotPrice

    // 2. Admin triples base rate on the turf arena (from ₹800 to ₹2400)
    await Turf.findByIdAndUpdate(testTurf._id, {
      'pricing.baseRate': 240000,
    })

    // 3. Query historical booking details
    const detailRes = await request(app)
      .get(`/api/v1/admin/bookings/${bookingId}`)
      .set('Cookie', adminCookie)
      .expect(200)

    // Snapshot prices MUST remain exactly unchanged!
    expect(detailRes.body.data.booking.slotPrice).toBe(originalSlotPrice)
    expect(detailRes.body.data.booking.totalAmount).toBe(originalTotal)
  })

  // 15. Customer booking creation and customer booking history continue to work
  it('15. customer booking creation and GET /api/v1/bookings/my continue to operate cleanly', async () => {
    const myBookingsRes = await request(app)
      .get('/api/v1/bookings/my')
      .set('Cookie', customer1Cookie)
      .expect(200)

    expect(myBookingsRes.body.success).toBe(true)
    expect(Array.isArray(myBookingsRes.body.data.bookings)).toBe(true)
    expect(myBookingsRes.body.data.bookings.length).toBeGreaterThan(0)
  })
})
