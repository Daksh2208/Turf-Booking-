import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
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
import { BusinessSettings } from '../src/models/BusinessSettings.js'

describe('Part 10: Booking Engine, Checkout & Customer Booking History Suite', () => {
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminCookie = ''
  let user1 = null
  let user2 = null
  let adminUser = null
  let testSport = null
  let testTurf = null
  let testAddOn = null

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p10_cust1@test.com', 'p10_cust2@test.com', 'p10_admin@test.com'] },
      }),
      Sport.deleteMany({ slug: 'football-p10-test' }),
      Turf.deleteMany({ slug: 'turf-p10-arena' }),
      AddOn.deleteMany({ name: 'Pro Bibs P10' }),
      Booking.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
      SlotReservation.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
      BlockedSlot.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
    ])

    const passwordHash = await bcrypt.hash('Password@123', 10)

    // Create Customer 1
    user1 = await User.create({
      name: 'Rohan Sharma',
      email: 'p10_cust1@test.com',
      phone: '9876543210',
      passwordHash,
      role: 'customer',
      isActive: true,
    })
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'p10_cust1@test.com', password: 'Password@123' })
    customer1Cookie = login1.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Customer 2
    user2 = await User.create({
      name: 'Amit Patel',
      email: 'p10_cust2@test.com',
      phone: '9876543211',
      passwordHash,
      role: 'customer',
      isActive: true,
    })
    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'p10_cust2@test.com', password: 'Password@123' })
    customer2Cookie = login2.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Admin
    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'p10_admin@test.com',
      phone: '9876543212',
      passwordHash,
      role: 'admin',
      isActive: true,
    })
    const loginAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'p10_admin@test.com', password: 'Password@123' })
    adminCookie = loginAdmin.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    // Create Sport
    testSport = await Sport.create({
      name: 'Football P10',
      slug: 'football-p10-test',
      description: '5-a-side AstroTurf Football',
      minPlayers: 10,
      maxPlayers: 14,
      isActive: true,
    })

    // Create Turf: 06:00 to 23:00 operating hours
    testTurf = await Turf.create({
      name: 'P10 Thunder Arena',
      slug: 'turf-p10-arena',
      sports: [testSport._id],
      address: {
        street: '123 Sports Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      pricing: {
        baseRate: 100000, // ₹1000.00
        peakRate: 150000, // ₹1500.00
        weekendRate: 120000, // ₹1200.00
        peakHours: { start: '18:00', end: '22:00' },
        weekendDays: [0, 6],
      },
      openingHours: {
        open: '06:00',
        close: '23:00',
      },
      isActive: true,
    })

    // Create AddOn
    testAddOn = await AddOn.create({
      name: 'Pro Bibs P10',
      category: 'Equipment',
      price: 20000, // ₹200.00
      pricingUnit: 'per_booking',
      isActive: true,
    })

    // Ensure Business Settings GST is set to 18%
    await BusinessSettings.findOneAndUpdate(
      {},
      {
        $set: {
          'taxSettings.taxEnabled': true,
          'taxSettings.taxName': 'GST',
          'taxSettings.taxRatePercentage': 18,
        },
      },
      { upsert: true }
    )
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p10_cust1@test.com', 'p10_cust2@test.com', 'p10_admin@test.com'] },
      }),
      Sport.deleteMany({ slug: 'football-p10-test' }),
      Turf.deleteMany({ slug: 'turf-p10-arena' }),
      AddOn.deleteMany({ name: 'Pro Bibs P10' }),
      Booking.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
      SlotReservation.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
      BlockedSlot.deleteMany({ date: { $in: ['2026-11-10', '2026-11-11', '2026-11-12'] } }),
    ])
  })

  // 1. Successful Pay at Venue booking
  it('1. creates a successful Pay at Venue booking with server-calculated price, snapshots and unpaid status', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10', // Tuesday, standard base weekday
        startTime: '10:00',
        endTime: '11:00',
        contactDetails: {
          name: 'Rohan Sharma',
          email: 'rohan@example.com',
          phone: '9876543210',
        },
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    expect(res.body.success).toBe(true)
    const booking = res.body.data.booking
    expect(booking.bookingId).toMatch(/^TB-/)
    expect(booking.paymentMethod).toBe('Pay at Venue')
    expect(booking.paymentStatus).toBe('unpaid')
    expect(booking.status).toBe('confirmed')
    expect(booking.slotPrice).toBe(100000) // ₹1000 base rate
    expect(booking.taxRatePercentage).toBe(18)
    expect(booking.taxAmount).toBe(18000) // 18% of 100000
    expect(booking.totalAmount).toBe(118000) // 100000 + 18000
    expect(booking.contactDetails.name).toBe('Rohan Sharma')
    expect(booking.contactDetails.phone).toBe('9876543210')
  })

  // 2. Unauthenticated booking attempt
  it('2. rejects unauthenticated booking attempts with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '14:00',
        endTime: '15:00',
      })
      .expect(401)

    expect(res.body.success).toBe(false)
  })

  // 3. Invalid turf, date, slot or add-on IDs
  it('3. rejects invalid turf ID, past date, malformed times and invalid add-on IDs', async () => {
    // Malformed turfId
    await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: 'invalid-id-format',
        date: '2026-11-10',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(400)

    // Past date
    await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2020-01-01',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(400)

    // Inverted time range (start >= end)
    await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '15:00',
        endTime: '14:00',
      })
      .expect(400)

    // Invalid add-on ID
    await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '14:00',
        endTime: '15:00',
        addOns: [{ addOnId: new mongoose.Types.ObjectId(), quantity: 1 }],
      })
      .expect(404)
  })

  // 4. Booking outside operating hours
  it('4. rejects slot booking outside arena operating hours (06:00 to 23:00)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '04:00',
        endTime: '05:00',
      })
      .expect(400)

    const msg = res.body.error?.message || res.body.message
    expect(msg).toMatch(/outside the arena's operating hours/i)
  })

  // 5. Booking a blocked slot
  it('5. rejects booking a slot that is covered by an active admin block', async () => {
    // Admin blocks 12:00 to 14:00 for maintenance
    await request(app)
      .post('/api/v1/admin/blocked-slots')
      .set('Cookie', adminCookie)
      .send({
        turf: testTurf._id,
        date: '2026-11-10',
        startTime: '12:00',
        endTime: '14:00',
        reason: 'maintenance',
        note: 'Turf grass irrigation and lighting maintenance',
      })
      .expect(201)

    // Customer tries to book 12:00 to 13:00
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '12:00',
        endTime: '13:00',
      })
      .expect(400)

    const msg = res.body.error?.message || res.body.message
    expect(msg).toMatch(/unavailable due to admin block/i)
  })

  // 6. Booking an already-booked slot
  it('6. rejects booking a slot that is already booked by another active booking (409 Conflict)', async () => {
    // Rohan booked 10:00 to 11:00 in test 1.
    // Amit tries to book the exact same 10:00 to 11:00 slot:
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-10',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(409)

    const msg = res.body.error?.message || res.body.message
    expect(msg).toMatch(/already booked/i)
  })

  // 7. Two concurrent attempts to book the same slot
  it('7. safely handles concurrent booking requests: exactly one succeeds and one receives 409 Conflict', async () => {
    const slotPayload = {
      turfId: testTurf._id,
      date: '2026-11-11',
      startTime: '16:00',
      endTime: '17:00',
      paymentMethod: 'Pay at Venue',
    }

    // Launch 2 simultaneous booking attempts concurrently
    const [attempt1, attempt2] = await Promise.all([
      request(app).post('/api/v1/bookings').set('Cookie', customer1Cookie).send(slotPayload),
      request(app).post('/api/v1/bookings').set('Cookie', customer2Cookie).send(slotPayload),
    ])

    const statusCodes = [attempt1.status, attempt2.status].sort()
    // One must succeed with 201, one must fail with 409 Conflict
    expect(statusCodes).toEqual([201, 409])

    const successfulRes = attempt1.status === 201 ? attempt1 : attempt2
    const conflictingRes = attempt1.status === 409 ? attempt1 : attempt2

    expect(successfulRes.body.success).toBe(true)
    expect(conflictingRes.body.success).toBe(false)
    const conflictMsg = conflictingRes.body.error?.message || conflictingRes.body.message
    expect(conflictMsg).toMatch(/already booked/i)

    // Verify only 1 booking was created in the database for this slot
    const count = await Booking.countDocuments({
      turf: testTurf._id,
      date: '2026-11-11',
      startTime: '16:00',
      endTime: '17:00',
      status: { $in: ['confirmed', 'pending'] },
    })
    expect(count).toBe(1)
  })

  // 8. Booking multiple slots with correct price calculation
  it('8. books multiple continuous hours with correct multi-segment pricing', async () => {
    // 17:00 to 19:00 spans non-peak (17:00-18:00 = 100000) and peak (18:00-19:00 = 150000)
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-11',
        startTime: '17:00',
        endTime: '19:00',
      })
      .expect(201)

    const booking = res.body.data.booking
    expect(booking.durationMinutes).toBe(120)
    // 100000 (base) + 150000 (peak) = 250000
    expect(booking.slotPrice).toBe(250000)
    // 18% GST on 250000 = 45000
    expect(booking.taxAmount).toBe(45000)
    // Total = 295000
    expect(booking.totalAmount).toBe(295000)
  })

  // 9. Correct GST and add-on snapshots
  it('9. correctly snapshots add-on quantities, unit prices, and GST in booking records', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-11',
        startTime: '20:00',
        endTime: '21:00',
        addOns: [{ addOnId: testAddOn._id, quantity: 2 }],
      })
      .expect(201)

    const booking = res.body.data.booking
    expect(booking.addOns).toHaveLength(1)
    expect(booking.addOns[0].name).toBe('Pro Bibs P10')
    expect(booking.addOns[0].price).toBe(20000) // ₹200.00
    expect(booking.addOns[0].quantity).toBe(2)
    expect(booking.addOns[0].totalPrice).toBe(40000) // ₹400.00
    expect(booking.addOnsTotal).toBe(40000)

    // Slot is peak (20:00-21:00 = 150000)
    // Subtotal = 150000 + 40000 = 190000
    expect(booking.subtotal).toBe(190000)
    // 18% GST of 190000 = 34200
    expect(booking.taxAmount).toBe(34200)
    // Final total = 224200
    expect(booking.totalAmount).toBe(224200)
  })

  // 10. Client attempts to manipulate the final total
  it('10. ignores client-submitted price manipulation and enforces server authoritative price', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '08:00',
        endTime: '09:00',
        // Malicious client tries to send 1 rupee total:
        totalAmount: 100,
        subtotal: 50,
        slotPrice: 50,
        taxAmount: 0,
        status: 'completed',
        paymentStatus: 'paid',
      })
      .expect(201)

    const booking = res.body.data.booking
    // Server must recalculate: base rate 100000 + 18000 GST = 118000
    expect(booking.totalAmount).toBe(118000)
    expect(booking.slotPrice).toBe(100000)
    expect(booking.paymentStatus).toBe('unpaid')
    expect(booking.status).toBe('confirmed')
  })

  // 11. Customer cannot read another customer's booking
  it("11. prevents customers from accessing another customer's booking detail (403 Forbidden)", async () => {
    // Customer 1 creates a booking
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(201)

    const bookingId = bookingRes.body.data.booking._id

    // Customer 1 can read their own booking
    await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Cookie', customer1Cookie)
      .expect(200)

    // Customer 2 tries to read Customer 1's booking -> 403 Forbidden!
    const forbiddenRes = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Cookie', customer2Cookie)
      .expect(403)

    expect(forbiddenRes.body.success).toBe(false)
    const forbiddenMsg = forbiddenRes.body.error?.message || forbiddenRes.body.message
    expect(forbiddenMsg).toMatch(/not authorized/i)

    // Admin CAN view it for support
    await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Cookie', adminCookie)
      .expect(200)
  })

  // 12. Duplicate submission or safe request retry
  it('12. safely handles duplicate submission with idempotency key returning the same booking', async () => {
    const idempotencyKey = 'unique-key-xyz-12345'

    const res1 = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '15:00',
        idempotencyKey,
      })
      .expect(201)

    const firstBookingId = res1.body.data.booking.bookingId

    // Repeat identical request with same idempotency key (simulating retry or double-click)
    const res2 = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '15:00',
        idempotencyKey,
      })
      .expect(201)

    // Must return the exact same booking reference without creating a duplicate
    expect(res2.body.data.booking.bookingId).toBe(firstBookingId)
  })

  // 13. My Bookings only returns the current user's records
  it("13. GET /api/v1/bookings/my returns only the current authenticated customer's bookings", async () => {
    const res1 = await request(app)
      .get('/api/v1/bookings/my')
      .set('Cookie', customer1Cookie)
      .expect(200)

    expect(res1.body.success).toBe(true)
    const bookings1 = res1.body.data.bookings
    expect(bookings1.length).toBeGreaterThan(0)
    // Every single booking returned must belong to user1
    for (const b of bookings1) {
      expect(b.user.toString()).toBe(user1._id.toString())
    }

    const res2 = await request(app)
      .get('/api/v1/bookings/my')
      .set('Cookie', customer2Cookie)
      .expect(200)

    const bookings2 = res2.body.data.bookings
    for (const b of bookings2) {
      expect(b.user.toString()).toBe(user2._id.toString())
    }
  })

  // 14. Cancelled bookings are handled correctly by availability
  it('14. cancelling a booking immediately releases the slot so it can be booked by another customer', async () => {
    // 1. Customer 1 books 21:00-22:00 on 2026-11-12
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '21:00',
        endTime: '22:00',
      })
      .expect(201)

    const bookingId = createRes.body.data.booking._id

    // Check availability: slot 21:00 is booked
    const slotCheck1 = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-11-12`)
      .expect(200)
    const slot21 = slotCheck1.body.data.slots.find((s) => s.startTime === '21:00')
    expect(slot21.status).toBe('booked')

    // 2. Admin cancels the booking
    await request(app)
      .patch(`/api/v1/admin/bookings/${bookingId}/status`)
      .set('Cookie', adminCookie)
      .send({
        status: 'cancelled',
        cancellationReason: 'Customer requested reschedule',
      })
      .expect(200)

    // Check availability: slot 21:00 is now available!
    const slotCheck2 = await request(app)
      .get(`/api/v1/bookings/slots?turfId=${testTurf._id}&date=2026-11-12`)
      .expect(200)
    const slot21Freed = slotCheck2.body.data.slots.find((s) => s.startTime === '21:00')
    expect(slot21Freed.status).toBe('available')

    // 3. Customer 2 can now successfully book the released slot
    await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '21:00',
        endTime: '22:00',
      })
      .expect(201)
  })

  // 15. Existing authentication, pricing, inventory and admin functionality remains intact
  it('15. verifies admin dashboard and inventory operations continue functioning properly', async () => {
    const dashboardRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie)
      .expect(200)

    expect(dashboardRes.body.success).toBe(true)
    expect(dashboardRes.body.data.metrics).toHaveProperty('todayRevenue')
    expect(dashboardRes.body.data.metrics).toHaveProperty('todayBookings')
    expect(dashboardRes.body.data.metrics).toHaveProperty('freeSlotsToday')
  })

  // 16. Multi-hour base/peak transitions and player count calculation
  it('16. calculates 5-hour booking (first 3 hrs base + last 2 hrs peak) and records player count', async () => {
    // Weekday 2026-11-12: Peak starts at 18:00
    // 15:00 to 20:00 = 5 hours total
    // 15:00-18:00 (3 hours @ 100000 base) = 300000
    // 18:00-20:00 (2 hours @ 150000 peak) = 300000
    // Total slot price = 600000 paise (₹6,000)
    // 18% GST = 108000 paise
    // Final total = 708000 paise (₹7,080)
    const quoteRes = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '15:00',
        endTime: '20:00',
        playerCount: 16,
      })
      .expect(200)

    const quote = quoteRes.body.data.quote
    expect(quote.timeRange.durationHours).toBe(5)
    expect(quote.hourlySegments.length).toBe(5)
    expect(quote.turfSubtotal).toBe(600000)
    expect(quote.tax.taxAmount).toBe(108000)
    expect(quote.finalTotal).toBe(708000)
    expect(quote.playerCount).toBe(16)
    expect(quote.capacity.maxPlayers).toBe(22)

    // Book it
    await SlotReservation.deleteMany({ date: '2026-11-12', slotTime: { $in: ['15:00', '16:00', '17:00', '18:00', '19:00'] } })
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '15:00',
        endTime: '20:00',
        playerCount: 16,
      })
      .expect(201)

    const booking = bookingRes.body.data.booking
    expect(booking.durationMinutes).toBe(300)
    expect(booking.playerCount).toBe(16)
    expect(booking.slotPrice).toBe(600000)
    expect(booking.totalAmount).toBe(708000)
  })

  // 17. Enforces turf max capacity (rejects booking with > 22 players)
  it('17. rejects booking with player count exceeding turf arena capacity (max 22)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: '2026-11-12',
        startTime: '07:00',
        endTime: '08:00',
        playerCount: 25, // Exceeds max 22!
      })
      .expect(400)

    const msg = res.body.error?.message || res.body.message
    expect(msg).toMatch(/exceeds turf maximum capacity/i)
  })

  // 18. Customer favourites toggle and retrieval
  it('18. allows customer to toggle favourites and fetch saved favourites', async () => {
    // 1. Toggle on
    const toggleOnRes = await request(app)
      .post(`/api/v1/auth/favorites/toggle/${testTurf._id}`)
      .set('Cookie', customer1Cookie)
      .expect(200)

    expect(toggleOnRes.body.data.isFavorited).toBe(true)

    // 2. Fetch favorites list
    const favsRes = await request(app)
      .get('/api/v1/auth/favorites')
      .set('Cookie', customer1Cookie)
      .expect(200)

    expect(favsRes.body.success).toBe(true)
    expect(favsRes.body.data.favorites.some((f) => f._id.toString() === testTurf._id.toString())).toBe(true)

    // 3. Toggle off
    const toggleOffRes = await request(app)
      .post(`/api/v1/auth/favorites/toggle/${testTurf._id}`)
      .set('Cookie', customer1Cookie)
      .expect(200)

    expect(toggleOffRes.body.data.isFavorited).toBe(false)
  })

  // 19. Discrete multi-slot booking (e.g., 06:00-07:00, 07:00-08:00, 13:00-14:00, 14:00-15:00)
  it('19. books discrete non-contiguous slots without reserving unselected middle slots', async () => {
    const bookingDate = '2026-11-20'
    const selectedSlots = ['06:00', '07:00', '13:00', '14:00']

    // Clean up test date before running
    await Promise.all([
      Booking.deleteMany({ date: bookingDate }),
      SlotReservation.deleteMany({ date: bookingDate }),
    ])

    // 1. Get quote for discrete slots via POST /api/v1/pricing/quote
    const quoteRes = await request(app)
      .post('/api/v1/pricing/quote')
      .send({
        turfId: testTurf._id,
        date: bookingDate,
        selectedSlots,
      })
      .expect(200)

    expect(quoteRes.body.success).toBe(true)
    const quote = quoteRes.body.data.quote
    expect(quote.timeRange.durationHours).toBe(4)
    expect(quote.hourlySegments).toHaveLength(4)

    // 2. Book discrete slots
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: bookingDate,
        selectedSlots,
        paymentMethod: 'Pay at Venue',
      })
      .expect(201)

    expect(bookRes.body.success).toBe(true)
    expect(bookRes.body.data.booking.selectedSlots).toEqual(expect.arrayContaining(['06:00', '07:00', '13:00', '14:00']))

    // 3. Check availability: 06:00, 07:00, 13:00, 14:00 should be booked, but intermediate slots (e.g. 08:00, 09:00, 10:00, 11:00, 12:00) must remain AVAILABLE!
    const availRes = await request(app)
      .get(`/api/v1/availability?turfId=${testTurf._id}&date=${bookingDate}`)
      .expect(200)

    const slots = availRes.body.data.slots
    const slot06 = slots.find((s) => s.startTime === '06:00')
    const slot07 = slots.find((s) => s.startTime === '07:00')
    const slot08 = slots.find((s) => s.startTime === '08:00')
    const slot12 = slots.find((s) => s.startTime === '12:00')
    const slot13 = slots.find((s) => s.startTime === '13:00')
    const slot14 = slots.find((s) => s.startTime === '14:00')

    expect(slot06.status).toBe('booked')
    expect(slot07.status).toBe('booked')
    expect(slot08.status).toBe('available')
    expect(slot12.status).toBe('available')
    expect(slot13.status).toBe('booked')
    expect(slot14.status).toBe('booked')
  })
})
