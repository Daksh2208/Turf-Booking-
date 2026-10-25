import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import { StripeEvent } from '../src/models/StripeEvent.js'
import stripeService from '../src/services/stripe.service.js'
import bcrypt from 'bcryptjs'

describe('Phase 13: Stripe Payment Integration Tests', () => {
  let adminCookie = ''
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminUser = null
  let customer1 = null
  let customer2 = null
  let testSport = null
  let testTurf = null

  const TEST_DATE = '2026-11-25'

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({
        email: { $in: ['stripe_admin@turf.com', 'stripe_c1@turf.com', 'stripe_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'stripe-test-sport' }),
      Turf.deleteMany({ slug: 'stripe-test-arena' }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_test_/ } }),
    ])

    const hashedPassword = await bcrypt.hash('Password123!', 10)

    adminUser = await User.create({
      name: 'Stripe Admin',
      email: 'stripe_admin@turf.com',
      passwordHash: hashedPassword,
      phone: '9988776655',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    })

    customer1 = await User.create({
      name: 'Stripe Customer 1',
      email: 'stripe_c1@turf.com',
      passwordHash: hashedPassword,
      phone: '9876543210',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    customer2 = await User.create({
      name: 'Stripe Customer 2',
      email: 'stripe_c2@turf.com',
      passwordHash: hashedPassword,
      phone: '9876543211',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    // Log in users to get session cookies
    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'stripe_admin@turf.com',
      password: 'Password123!',
    })
    adminCookie = loginAdmin.headers['set-cookie']

    const loginC1 = await request(app).post('/api/v1/auth/login').send({
      email: 'stripe_c1@turf.com',
      password: 'Password123!',
    })
    customer1Cookie = loginC1.headers['set-cookie']

    const loginC2 = await request(app).post('/api/v1/auth/login').send({
      email: 'stripe_c2@turf.com',
      password: 'Password123!',
    })
    customer2Cookie = loginC2.headers['set-cookie']

    testSport = await Sport.create({
      name: 'Stripe Test Sport',
      slug: 'stripe-test-sport',
      description: 'Sport for stripe tests',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Stripe Test Arena',
      slug: 'stripe-test-arena',
      description: 'Arena for stripe payment integration testing',
      sports: [testSport._id],
      address: {
        street: '100 Payment Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      pricing: {
        baseRate: 100000, // ₹1,000/hr
        peakRate: 150000,
        weekendRate: 120000,
        peakHours: { start: '18:00', end: '23:00' },
        weekendDays: [0, 6],
      },
      capacity: 12,
      openingHours: { open: '06:00', close: '23:00' },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['stripe_admin@turf.com', 'stripe_c1@turf.com', 'stripe_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'stripe-test-sport' }),
      Turf.deleteMany({ slug: 'stripe-test-arena' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      SlotReservation.deleteMany({ turf: testTurf?._id }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_test_/ } }),
    ])
  })

  describe('1. Default Disabled State & Safe Public Configuration', () => {
    it('returns public config showing online payment disabled when credentials are not configured', async () => {
      const res = await request(app).get('/api/v1/payments/stripe/config')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.enabled).toBe(false)
      expect(res.body.data.currency).toBe('inr')
      // Secret keys are NEVER exposed
      expect(res.body.data.publishableKey).toBe('')
      expect(res.body.data.STRIPE_SECRET_KEY).toBeUndefined()
      expect(res.body.data.STRIPE_WEBHOOK_SECRET).toBeUndefined()
    })

    it('rejects online checkout creation with clear guidance when Stripe is disabled', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe/checkout-session')
        .set('Cookie', customer1Cookie)
        .send({
          bookingData: {
            turfId: testTurf._id.toString(),
            date: TEST_DATE,
            startTime: '10:00',
            endTime: '11:00',
            selectedSlots: ['10:00'],
            playerCount: 6,
          },
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('STRIPE_NOT_CONFIGURED')
      expect(res.body.error?.message || res.body.message).toMatch(
        /Online payment is not configured yet. Please choose Pay at Venue./i
      )
    })

    it('ensures Pay at Venue continues working smoothly while Stripe is disabled', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id.toString(),
          date: TEST_DATE,
          startTime: '10:00',
          endTime: '11:00',
          selectedSlots: ['10:00'],
          playerCount: 8,
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.booking.paymentMethod).toBe('Pay at Venue')
      expect(res.body.data.booking.paymentStatus).toBe('unpaid')
      expect(res.body.data.booking.status).toBe('confirmed')
    })
  })

  describe('2. Authentication & Authorization Security', () => {
    it('rejects unauthenticated requests to create Stripe checkout sessions (401)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe/checkout-session')
        .send({
          bookingData: {
            turfId: testTurf._id.toString(),
            date: TEST_DATE,
            startTime: '12:00',
            endTime: '13:00',
          },
        })

      expect(res.status).toBe(401)
    })

    it('rejects admin users from creating customer booking payment sessions (403)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe/checkout-session')
        .set('Cookie', adminCookie)
        .send({
          bookingData: {
            turfId: testTurf._id.toString(),
            date: TEST_DATE,
            startTime: '12:00',
            endTime: '13:00',
          },
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('ADMIN_BOOKING_FORBIDDEN')
    })

    it('prevents customer 2 from paying for customer 1\'s booking (403 Forbidden)', async () => {
      // Create a booking owned by customer 1
      const booking = await Booking.create({
        bookingId: 'TB-TEST-OWNER-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '14:00',
        endTime: '15:00',
        selectedSlots: ['14:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
      })

      // Mock isEnabled = true to test authorization logic
      const isEnabledSpy = vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)

      const res = await request(app)
        .post('/api/v1/payments/stripe/checkout-session')
        .set('Cookie', customer2Cookie)
        .send({
          bookingId: booking._id.toString(),
        })

      isEnabledSpy.mockRestore()

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')
    })
  })

  describe('3. Admin Manual Payment Protection for Stripe Bookings', () => {
    it('blocks administrator from manually marking an unverified Stripe payment as paid (400)', async () => {
      const stripeBooking = await Booking.create({
        bookingId: 'TB-TEST-STRIPE-MANUAL-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '16:00',
        endTime: '17:00',
        selectedSlots: ['16:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
      })

      const res = await request(app)
        .post(`/api/v1/admin/bookings/${stripeBooking._id}/payment`)
        .set('Cookie', adminCookie)
        .send({
          paymentMethod: 'Cash',
          notes: 'Attempted manual cash recording for online stripe booking',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('MANUAL_STRIPE_PAYMENT_FORBIDDEN')

      // Verify the booking remains pending/unpaid in database
      const reloaded = await Booking.findById(stripeBooking._id)
      expect(reloaded.paymentStatus).toBe('pending')
      expect(reloaded.amountPaid).toBe(0)
    })

    it('allows administrator to manually record payment for Pay at Venue bookings', async () => {
      const venueBooking = await Booking.create({
        bookingId: 'TB-TEST-VENUE-PAY-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '17:00',
        endTime: '18:00',
        selectedSlots: ['17:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/admin/bookings/${venueBooking._id}/payment`)
        .set('Cookie', adminCookie)
        .send({
          paymentMethod: 'Cash',
          notes: 'Collected at counter',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.paymentStatus).toBe('paid')
      expect(res.body.data.booking.amountPaid).toBe(118000)
    })
  })

  describe('4. Mocked Stripe Checkout Session Lifecycle & Authoritative Verification', () => {
    it('creates a Stripe checkout session with server-calculated price and integer paise unit amount', async () => {
      const mockStripeClient = {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_session_123',
              url: 'https://checkout.stripe.com/c/pay/cs_test_session_123',
            }),
          },
        },
      }

      vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)
      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)

      const res = await request(app)
        .post('/api/v1/payments/stripe/checkout-session')
        .set('Cookie', customer1Cookie)
        .send({
          bookingData: {
            turfId: testTurf._id.toString(),
            date: TEST_DATE,
            startTime: '18:00',
            endTime: '19:00',
            selectedSlots: ['18:00'],
            playerCount: 10,
            // Client price tampering should be completely ignored
            fakePrice: 50,
          },
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sessionId).toBe('cs_test_session_123')
      expect(res.body.data.url).toBe('https://checkout.stripe.com/c/pay/cs_test_session_123')

      // Verify that mockStripeClient was called with authoritative server-calculated price
      // Rate is peak hour (18:00): baseRate 150000 paise + 18% GST (27000 paise) = 177000 paise
      expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalled()
      const createArgs = mockStripeClient.checkout.sessions.create.mock.calls[0][0]
      expect(createArgs.line_items[0].price_data.unit_amount).toBe(177000)
      expect(createArgs.line_items[0].price_data.currency).toBe('inr')

      vi.restoreAllMocks()
    })

    it('verifies that a forged frontend redirect does not mark a booking as paid', async () => {
      const pendingBooking = await Booking.create({
        bookingId: 'TB-TEST-FORGED-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '19:00',
        endTime: '20:00',
        selectedSlots: ['19:00'],
        slotPrice: 150000,
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_unpaid_session_999',
      })

      const mockStripeClient = {
        checkout: {
          sessions: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_unpaid_session_999',
              payment_status: 'unpaid',
              status: 'open',
            }),
          },
        },
      }

      vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)
      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)

      const res = await request(app)
        .get(`/api/v1/payments/stripe/status/${pendingBooking._id}`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.data.paymentStatus).toBe('pending')
      expect(res.body.data.booking.paymentStatus).toBe('pending')

      // Database verification
      const checkDb = await Booking.findById(pendingBooking._id)
      expect(checkDb.paymentStatus).toBe('pending')
      expect(checkDb.status).toBe('pending')

      vi.restoreAllMocks()
    })

    it('marks booking as paid and confirmed when Stripe verifies payment clearance', async () => {
      const pendingBooking = await Booking.create({
        bookingId: 'TB-TEST-PAID-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '20:00',
        endTime: '21:00',
        selectedSlots: ['20:00'],
        slotPrice: 150000,
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_paid_session_100',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '20:00',
        booking: pendingBooking._id,
        status: 'active',
      })

      const mockStripeClient = {
        checkout: {
          sessions: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_paid_session_100',
              payment_status: 'paid',
              status: 'complete',
              amount_total: 177000,
              payment_intent: 'pi_test_intent_777',
            }),
          },
        },
      }

      vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)
      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)

      const res = await request(app)
        .get(`/api/v1/payments/stripe/status/${pendingBooking._id}`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.data.paymentStatus).toBe('paid')
      expect(res.body.data.booking.status).toBe('confirmed')
      expect(res.body.data.booking.amountPaid).toBe(177000)

      const reloaded = await Booking.findById(pendingBooking._id)
      expect(reloaded.paymentStatus).toBe('paid')
      expect(reloaded.status).toBe('confirmed')
      expect(reloaded.stripePaymentIntentId).toBe('pi_test_intent_777')

      vi.restoreAllMocks()
    })

    it('releases slot reservation when Stripe session expires', async () => {
      const expiringBooking = await Booking.create({
        bookingId: 'TB-TEST-EXPIRE-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '21:00',
        endTime: '22:00',
        selectedSlots: ['21:00'],
        slotPrice: 150000,
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_expired_session_888',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '21:00',
        booking: expiringBooking._id,
        status: 'active',
      })

      const mockStripeClient = {
        checkout: {
          sessions: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_expired_session_888',
              payment_status: 'unpaid',
              status: 'expired',
            }),
          },
        },
      }

      vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)
      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)

      const res = await request(app)
        .get(`/api/v1/payments/stripe/status/${expiringBooking._id}`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.data.paymentStatus).toBe('failed')
      expect(res.body.data.booking.status).toBe('cancelled')

      // Verify slot reservation was released
      const reservation = await SlotReservation.findOne({ booking: expiringBooking._id })
      expect(reservation.status).toBe('released')

      vi.restoreAllMocks()
    })
  })

  describe('5. Webhook Verification, Idempotency & Late-Payment Safety', () => {
    it('rejects webhooks with missing signature header (400)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .send({ id: 'evt_123' })

      expect(res.status).toBe(400)
    })

    it('rejects webhooks with invalid signatures', async () => {
      const res = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', 'invalid_signature_t=123,v1=fake')
        .send(JSON.stringify({ id: 'evt_123' }))

      expect(res.status).toBe(400)
    })

    it('processes checkout.session.completed webhook and prevents double-processing on duplicate delivery', async () => {
      const webhookBooking = await Booking.create({
        bookingId: 'TB-TEST-WEBHOOK-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '22:00',
        endTime: '23:00',
        selectedSlots: ['22:00'],
        slotPrice: 150000,
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_webhook_session_999',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '22:00',
        booking: webhookBooking._id,
        status: 'active',
      })

      const mockEvent = {
        id: 'evt_test_webhook_unique_001',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_webhook_session_999',
            client_reference_id: webhookBooking._id.toString(),
            payment_status: 'paid',
            amount_total: 177000,
            payment_intent: 'pi_test_webhook_123',
          },
        },
      }

      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      }

      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)
      const origSecret = env.STRIPE_WEBHOOK_SECRET
      env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key'

      // First webhook delivery
      const res1 = await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_123')
      expect(res1.received).toBe(true)
      expect(res1.duplicate).toBeUndefined()

      // Verify booking updated to paid
      const bookingAfter1 = await Booking.findById(webhookBooking._id)
      expect(bookingAfter1.paymentStatus).toBe('paid')
      expect(bookingAfter1.status).toBe('confirmed')
      expect(bookingAfter1.amountPaid).toBe(177000)

      // Duplicate webhook delivery
      const res2 = await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_123')
      expect(res2.received).toBe(true)
      expect(res2.duplicate).toBe(true)

      env.STRIPE_WEBHOOK_SECRET = origSecret
      vi.restoreAllMocks()
    })

    it('safely flags late payment for manual refund if slot was reassigned after expiration', async () => {
      const lateBooking = await Booking.create({
        bookingId: 'TB-TEST-LATE-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '07:00',
        endTime: '08:00',
        selectedSlots: ['07:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'cancelled',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_late_session_555',
      })

      // Another active customer has booked slot 07:00
      const anotherBooking = await Booking.create({
        bookingId: 'TB-TEST-OCCUPANT-01',
        user: customer2._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '07:00',
        endTime: '08:00',
        selectedSlots: ['07:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '07:00',
        booking: anotherBooking._id,
        status: 'active',
      })

      const mockEvent = {
        id: 'evt_test_late_payment_002',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_late_session_555',
            client_reference_id: lateBooking._id.toString(),
            payment_status: 'paid',
            amount_total: 118000,
            payment_intent: 'pi_test_late_intent_555',
          },
        },
      }

      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      }

      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)
      const origSecret = env.STRIPE_WEBHOOK_SECRET
      env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key'

      await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_456')

      // Verify late booking was NOT silently confirmed into the occupied slot
      const reloadedLate = await Booking.findById(lateBooking._id)
      expect(reloadedLate.paymentStatus).toBe('paid')
      expect(reloadedLate.status).toBe('cancelled')
      expect(reloadedLate.paymentNotes).toMatch(/Requires refund/i)

      env.STRIPE_WEBHOOK_SECRET = origSecret
      vi.restoreAllMocks()
    })
  })
})
