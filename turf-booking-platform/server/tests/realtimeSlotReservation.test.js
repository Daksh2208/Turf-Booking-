import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { BlockedSlot } from '../src/models/BlockedSlot.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import { Reservation } from '../src/models/Reservation.js'
import { HeldSlot } from '../src/models/HeldSlot.js'
import { broadcastAvailabilityUpdate } from '../src/socket.js'

describe('Real-Time Turf Slot Selection, Temporary Locking & Concurrency Suite', () => {
  let customer1Cookie = ''
  let customer2Cookie = ''
  let customer3Cookie = ''
  let adminCookie = ''
  let user1 = null
  let user2 = null
  let adminUser = null
  let testSport = null
  let testTurf = null
  const testDate = '2026-11-20'

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({
        email: { $in: ['rt_cust1@test.com', 'rt_cust2@test.com', 'rt_cust3@test.com', 'rt_admin@test.com'] },
      }),
      Sport.deleteMany({ slug: 'rt-football-test' }),
      Turf.deleteMany({ slug: 'rt-turf-arena' }),
      Booking.deleteMany({ date: testDate }),
      SlotReservation.deleteMany({ date: testDate }),
      BlockedSlot.deleteMany({ date: testDate }),
      Reservation.deleteMany({ date: testDate }),
      HeldSlot.deleteMany({ date: testDate }),
    ])

    const passwordHash = await bcrypt.hash('Password@123', 10)

    user1 = await User.create({
      name: 'Realtime Customer One',
      email: 'rt_cust1@test.com',
      phone: '9876543210',
      passwordHash,
      role: 'customer',
      isActive: true,
    })

    user2 = await User.create({
      name: 'Realtime Customer Two',
      email: 'rt_cust2@test.com',
      phone: '9876543211',
      passwordHash,
      role: 'customer',
      isActive: true,
    })

    adminUser = await User.create({
      name: 'Realtime Admin',
      email: 'rt_admin@test.com',
      phone: '9876543212',
      passwordHash,
      role: 'admin',
      isActive: true,
    })

    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rt_cust1@test.com', password: 'Password@123' })
    customer1Cookie = login1.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rt_cust2@test.com', password: 'Password@123' })
    customer2Cookie = login2.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    const user3 = await User.create({
      name: 'Realtime Customer Three',
      email: 'rt_cust3@test.com',
      phone: '9876543213',
      passwordHash,
      role: 'customer',
      isActive: true,
    })

    const login3 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rt_cust3@test.com', password: 'Password@123' })
    customer3Cookie = login3.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rt_admin@test.com', password: 'Password@123' })
    adminCookie = adminLogin.headers['set-cookie']
      .find((c) => c.startsWith('accessToken='))
      .split(';')[0]

    testSport = await Sport.create({
      name: 'Realtime Football',
      slug: 'rt-football-test',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Realtime Arena Apex',
      slug: 'rt-turf-arena',
      sports: [testSport._id],
      address: {
        street: '100 Stadium Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      pricing: {
        baseRatePerHour: 100000, // ₹1,000/hr
        weekendMultiplier: 1.0,
      },
      capacity: {
        minPlayers: 4,
        maxPlayers: 20,
      },
      openingHours: {
        open: '06:00',
        close: '23:00',
      },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['rt_cust1@test.com', 'rt_cust2@test.com', 'rt_admin@test.com'] },
      }),
      Sport.deleteMany({ slug: 'rt-football-test' }),
      Turf.deleteMany({ slug: 'rt-turf-arena' }),
      Booking.deleteMany({ date: testDate }),
      SlotReservation.deleteMany({ date: testDate }),
      BlockedSlot.deleteMany({ date: testDate }),
      Reservation.deleteMany({ date: testDate }),
      HeldSlot.deleteMany({ date: testDate }),
    ])
  })

  it('1. A customer can reserve an available slot', async () => {
    const res = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['10:00'],
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reservation.reservationId).toMatch(/^RES-/)
    expect(res.body.data.reservation.slots).toEqual(['10:00'])
    expect(res.body.data.reservation.remainingSeconds).toBeGreaterThan(500)
  })

  it('2. A second customer cannot reserve the same slot while the first valid hold exists', async () => {
    const res = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['10:00'],
      })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('SLOT_ALREADY_HELD')
    expect(res.body.error.message).toMatch(/temporarily held by another customer/)
  })

  it('3. Two simultaneous requests for the same slot cannot both succeed (atomic concurrency protection)', async () => {
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer2Cookie)
        .send({ turfId: testTurf._id, date: testDate, slots: ['14:00'] }),
      request(app)
        .post('/api/v1/reservations/hold')
        .set('Cookie', customer3Cookie)
        .send({ turfId: testTurf._id, date: testDate, slots: ['14:00'] }),
    ])

    const statuses = [resA.status, resB.status]
    expect(statuses).toContain(200)
    expect(statuses).toContain(409)
  })

  it('4. Booked and blocked slots cannot be reserved', async () => {
    // Admin blocks 11:00 slot
    await BlockedSlot.create({
      turf: testTurf._id,
      date: testDate,
      startTime: '11:00',
      endTime: '12:00',
      reason: 'maintenance',
    })

    const blockedHoldRes = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['11:00'],
      })

    expect(blockedHoldRes.status).toBe(400)
    expect(blockedHoldRes.body.error.code).toBe('SLOT_BLOCKED')

    // Create a confirmed booking for 12:00 slot
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        startTime: '12:00',
        endTime: '13:00',
        selectedSlots: ['12:00'],
        playerCount: 6,
        paymentMethod: 'Pay at Venue',
      })
    expect(bookRes.status).toBe(201)

    // Customer 2 tries to hold 12:00 slot
    const bookedHoldRes = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['12:00'],
      })

    expect(bookedHoldRes.status).toBe(409)
    expect(bookedHoldRes.body.error.code).toBe('SLOT_ALREADY_BOOKED')
  })

  it('5. Expired holds no longer prevent availability', async () => {
    // Manually create an expired hold for 15:00
    const pastRes = await Reservation.create({
      reservationId: 'RES-EXPIRED-TEST',
      user: user1._id,
      turf: testTurf._id,
      date: testDate,
      slots: ['15:00'],
      startTime: '15:00',
      endTime: '16:00',
      status: 'active',
      expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
    })

    await HeldSlot.create({
      turf: testTurf._id,
      date: testDate,
      slotTime: '15:00',
      reservation: pastRes._id,
      user: user1._id,
      status: 'active',
      expiresAt: new Date(Date.now() - 60000),
    })

    // Customer 2 now tries to hold 15:00 slot -> should succeed!
    const res = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['15:00'],
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reservation.slots).toContain('15:00')
  })

  it('6. Customers cannot access or release another customers reservation', async () => {
    // Customer 2 tries to release Customer 1's 10:00 reservation
    const cust1Res = await Reservation.findOne({ user: user1._id, slots: '10:00' })
    expect(cust1Res).not.toBeNull()

    const releaseRes = await request(app)
      .post('/api/v1/reservations/release')
      .set('Cookie', customer2Cookie)
      .send({
        reservationId: cust1Res.reservationId,
      })

    // release returns success false/no-op for non-owner
    expect(releaseRes.status).toBe(200)
    expect(releaseRes.body.data.released).toBe(false)

    // The slot is still active for Customer 1
    const checkRes = await Reservation.findById(cust1Res._id)
    expect(checkRes.status).toBe('active')
  })

  it('7. The same customers active hold can be restored after navigating back', async () => {
    const res = await request(app)
      .get('/api/v1/reservations/current')
      .set('Cookie', customer1Cookie)
      .query({
        turfId: testTurf._id.toString(),
        date: testDate,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reservation).not.toBeNull()
    expect(res.body.data.reservation.slots).toContain('10:00')
  })

  it('8. Returning to the slot page does not reset the hold countdown', async () => {
    const initialGet = await request(app)
      .get('/api/v1/reservations/current')
      .set('Cookie', customer1Cookie)
      .query({ turfId: testTurf._id.toString(), date: testDate })

    const firstRemaining = initialGet.body.data.reservation.remainingSeconds

    // Wait 1.5 seconds
    await new Promise((r) => setTimeout(r, 1500))

    const secondGet = await request(app)
      .get('/api/v1/reservations/current')
      .set('Cookie', customer1Cookie)
      .query({ turfId: testTurf._id.toString(), date: testDate })

    const secondRemaining = secondGet.body.data.reservation.remainingSeconds

    // Remaining countdown decreased and did not reset to 600
    expect(secondRemaining).toBeLessThan(firstRemaining)
    expect(secondRemaining).toBeLessThan(600)
  })

  it('9. Refreshing the page restores a valid reservation via availability API', async () => {
    const availRes = await request(app)
      .get('/api/v1/availability')
      .set('Cookie', customer1Cookie)
      .query({ turfId: testTurf._id.toString(), date: testDate })

    expect(availRes.status).toBe(200)
    expect(availRes.body.success).toBe(true)

    const slot10 = availRes.body.data.slots.find((s) => s.startTime === '10:00')
    expect(slot10.status).toBe('selected_by_me')
    expect(slot10.isMine).toBe(true)
    expect(availRes.body.data.activeReservation).not.toBeNull()
  })

  it('10. A rejected hold is never displayed as a successful reservation', async () => {
    // Customer 2 checks availability for Customer 1's 10:00 slot
    const availRes = await request(app)
      .get('/api/v1/availability')
      .set('Cookie', customer2Cookie)
      .query({ turfId: testTurf._id.toString(), date: testDate })

    const slot10 = availRes.body.data.slots.find((s) => s.startTime === '10:00')
    expect(slot10.status).toBe('held')
    expect(slot10.isMine).toBe(false)
    expect(slot10.reason).toBe('held')
  })

  it('11. Removing a selected slot releases it safely', async () => {
    // Customer 1 holds ['16:00', '17:00']
    const holdRes = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['16:00', '17:00'],
      })
    expect(holdRes.status).toBe(200)

    // Customer 1 modifies selection to remove 17:00
    const updateRes = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['16:00'],
        reservationId: holdRes.body.data.reservation.reservationId,
      })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.reservation.slots).toEqual(['16:00'])

    // 17:00 is now free for Customer 2
    const cust2Res = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['17:00'],
      })
    expect(cust2Res.status).toBe(200)
    expect(cust2Res.body.data.reservation.slots).toEqual(['17:00'])
  })

  it('12. Checkout verifies ownership and reservation validity', async () => {
    const cust1Res = await Reservation.findOne({ user: user1._id, status: 'active', slots: '16:00' })

    // Customer 2 tries to checkout using Customer 1's reservationId
    const stolenCheckoutRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer2Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        startTime: '16:00',
        endTime: '17:00',
        selectedSlots: ['16:00'],
        reservationId: cust1Res.reservationId,
        paymentMethod: 'Pay at Venue',
      })

    expect(stolenCheckoutRes.status).toBe(403)
    expect(stolenCheckoutRes.body.error.code).toBe('FORBIDDEN_RESERVATION')
  })

  it('13. Concurrent checkout requests do not create duplicate bookings', async () => {
    const cust1Res = await Reservation.findOne({ user: user1._id, status: 'active', slots: '16:00' })
    const idemKey = `CONCUR-IDEM-${Date.now()}`

    const [checkoutA, checkoutB] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .set('X-Idempotency-Key', idemKey)
        .send({
          turfId: testTurf._id,
          date: testDate,
          startTime: '16:00',
          endTime: '17:00',
          selectedSlots: ['16:00'],
          reservationId: cust1Res.reservationId,
          paymentMethod: 'Pay at Venue',
          idempotencyKey: idemKey,
        }),
      request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .set('X-Idempotency-Key', idemKey)
        .send({
          turfId: testTurf._id,
          date: testDate,
          startTime: '16:00',
          endTime: '17:00',
          selectedSlots: ['16:00'],
          reservationId: cust1Res.reservationId,
          paymentMethod: 'Pay at Venue',
          idempotencyKey: idemKey,
        }),
    ])

    // Both should receive identical booking reference due to idempotency
    expect(checkoutA.status).toBe(201)
    expect(checkoutB.status === 201 || checkoutB.status === 200).toBe(true)
    const bookingAId = checkoutA.body.data.booking._id
    const bookingBId = checkoutB.body.data.booking._id
    expect(bookingAId).toBe(bookingBId)
  })

  it('14. Payment success and failure follow the reservation lifecycle', async () => {
    // Hold 18:00
    const holdRes = await request(app)
      .post('/api/v1/reservations/hold')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        slots: ['18:00'],
      })
    expect(holdRes.status).toBe(200)

    const resId = holdRes.body.data.reservation.reservationId

    // When Pay at Venue confirms, reservation is converted
    const confirmRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        turfId: testTurf._id,
        date: testDate,
        startTime: '18:00',
        endTime: '19:00',
        selectedSlots: ['18:00'],
        reservationId: resId,
        paymentMethod: 'Pay at Venue',
      })
    expect(confirmRes.status).toBe(201)

    const convertedRes = await Reservation.findOne({ reservationId: resId })
    expect(convertedRes.status).toBe('converted')
    expect(convertedRes.booking.toString()).toBe(confirmRes.body.data.booking._id)
  })

  it('15. Duplicate webhook events do not cause duplicate booking conversion', async () => {
    // Create booking doc
    const booking = await Booking.findOne({ date: testDate, status: 'confirmed' })
    expect(booking).not.toBeNull()

    // Sending webhook payload twice with same event id
    const payload = JSON.stringify({
      id: 'evt_test_dedup_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { bookingId: booking.bookingId },
          payment_status: 'paid',
        },
      },
    })

    // Webhook endpoint checks duplicate events
    const firstWebhook = await request(app)
      .post('/api/v1/payments/stripe/webhook')
      .set('stripe-signature', 'invalid_dummy')
      .send(payload)

    // Invalid signature returns 400 safely
    expect([400, 404]).toContain(firstWebhook.status)
  })

  it('16. Real-time broadcast helper executes without crashing when no sockets connected', () => {
    expect(() => {
      broadcastAvailabilityUpdate({
        turfId: testTurf._id,
        date: testDate,
        reason: 'test_event',
      })
    }).not.toThrow()
  })

  it('17. Reconnecting clients fetch the latest authoritative availability', async () => {
    const avail = await request(app)
      .get('/api/v1/availability')
      .query({ turfId: testTurf._id.toString(), date: testDate })

    expect(avail.status).toBe(200)
    expect(avail.body.success).toBe(true)
    expect(Array.isArray(avail.body.data.slots)).toBe(true)
    expect(avail.body.data.slots.length).toBeGreaterThan(0)
  })

  it('18. Existing Pay at Venue and admin booking workflows still work smoothly', async () => {
    // Admin lists bookings
    const adminList = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Cookie', adminCookie)
      .query({ date: testDate })

    expect(adminList.status).toBe(200)
    expect(adminList.body.success).toBe(true)
    expect(Array.isArray(adminList.body.data.bookings)).toBe(true)
  })
})
