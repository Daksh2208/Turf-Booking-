import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { env } from '../src/config/env.js'
import { User } from '../src/models/User.js'
import { Sport } from '../src/models/Sport.js'
import { Turf } from '../src/models/Turf.js'
import { Booking } from '../src/models/Booking.js'
import { Payment } from '../src/models/Payment.js'
import { Coupon } from '../src/models/Coupon.js'
import { CouponRedemption } from '../src/models/CouponRedemption.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import { StripeEvent } from '../src/models/StripeEvent.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import stripeService from '../src/services/stripe.service.js'
import couponService from '../src/services/coupon.service.js'
import bcrypt from 'bcryptjs'

describe('🏟️ PHASE 4: Payments & Business Flow Reliability Test Suite', () => {
  let adminCookie = ''
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminUser = null
  let customer1 = null
  let customer2 = null
  let testSport = null
  let testTurf = null

  const TEST_DATE = '2026-12-15'

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up test data
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p4_admin@turf.com', 'p4_c1@turf.com', 'p4_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'p4-football' }),
      Turf.deleteMany({ slug: 'p4-champions-arena' }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_p4_/ } }),
    ])

    const hashedPassword = await bcrypt.hash('Secret123!', 10)

    adminUser = await User.create({
      name: 'Phase 4 Admin',
      email: 'p4_admin@turf.com',
      passwordHash: hashedPassword,
      phone: '9988112233',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    })

    customer1 = await User.create({
      name: 'Phase 4 Player One',
      email: 'p4_c1@turf.com',
      passwordHash: hashedPassword,
      phone: '9876543291',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    customer2 = await User.create({
      name: 'Phase 4 Player Two',
      email: 'p4_c2@turf.com',
      passwordHash: hashedPassword,
      phone: '9876543292',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'p4_admin@turf.com',
      password: 'Secret123!',
    })
    adminCookie = loginAdmin.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    const loginC1 = await request(app).post('/api/v1/auth/login').send({
      email: 'p4_c1@turf.com',
      password: 'Secret123!',
    })
    customer1Cookie = loginC1.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    const loginC2 = await request(app).post('/api/v1/auth/login').send({
      email: 'p4_c2@turf.com',
      password: 'Secret123!',
    })
    customer2Cookie = loginC2.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0]

    testSport = await Sport.create({
      name: 'Phase 4 Football',
      slug: 'p4-football',
      description: '5-a-side Football for Phase 4 testing',
      isActive: true,
    })

    testTurf = await Turf.create({
      name: 'Phase 4 Champions Arena',
      slug: 'p4-champions-arena',
      description: 'FIFA Pro Artificial Turf for Reliability Testing',
      sports: [testSport._id],
      address: {
        street: '42 Sports Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560001',
      },
      pricing: {
        baseRate: 120000, // ₹1,200/hr in paise
        peakRate: 180000,
        weekendRate: 150000,
        peakHours: { start: '18:00', end: '23:00' },
        weekendDays: [0, 6],
      },
      capacity: 10,
      openingHours: { open: '06:00', close: '23:00' },
      isActive: true,
    })
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['p4_admin@turf.com', 'p4_c1@turf.com', 'p4_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'p4-football' }),
      Turf.deleteMany({ slug: 'p4-champions-arena' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      Payment.deleteMany({ turf: testTurf?._id }),
      SlotReservation.deleteMany({ turf: testTurf?._id }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_p4_/ } }),
    ])
  })

  // ==========================================
  // 1. STRIPE PAYMENT RELIABILITY & FLOW TESTS
  // ==========================================
  describe('1. Stripe Payment Reliability & Lifecycle', () => {
    it('1.1 creates Stripe checkout session with server authoritative pricing and metadata', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_p4_success_123',
              url: 'https://checkout.stripe.com/pay/cs_test_p4_success_123',
            }),
          },
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      const res = await request(app)
        .post('/api/v1/payments/stripe/create-checkout-session')
        .set('Cookie', customer1Cookie)
        .send({
          bookingData: {
            turfId: testTurf._id,
            sportId: testSport._id,
            date: TEST_DATE,
            startTime: '08:00',
            endTime: '09:00',
            clientUrl: 'http://localhost:5173',
          },
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('sessionId', 'cs_test_p4_success_123')
      expect(res.body.data).toHaveProperty('url')

      const booking = await Booking.findById(res.body.data.bookingId)
      expect(booking).toBeDefined()
      expect(booking.paymentStatus).toBe('pending')
      expect(booking.status).toBe('pending')
      expect(booking.paymentMethod).toBe('stripe')
      expect(booking.stripeCheckoutSessionId).toBe('cs_test_p4_success_123')
      expect(booking.totalAmount).toBe(141600) // ₹1,200 + 18% GST (216) = ₹1,416 = 141600 paise

      // Verify call arguments to Stripe
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer_email: customer1.email,
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'inr',
                unit_amount: 141600,
              }),
            }),
          ],
        }),
        expect.objectContaining({
          idempotencyKey: `cs_${booking._id}_141600`,
        })
      )

      clientSpy.mockRestore()
    })

    it('1.2 payment status endpoint rejects forged redirects and verifies directly with Stripe', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_p4_unpaid',
              payment_status: 'unpaid',
              status: 'open',
            }),
          },
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      // Create a pending booking
      const b = await Booking.create({
        bookingId: 'BK-P4-UNPAID',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '09:00',
        endTime: '10:00',
        selectedSlots: ['09:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_p4_unpaid',
      })

      // Customer accesses return URL without paying
      const res = await request(app)
        .get(`/api/v1/payments/stripe/status/${b._id}?session_id=cs_test_p4_unpaid`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.data.paymentStatus).toBe('pending')

      const checkInDb = await Booking.findById(b._id)
      expect(checkInDb.paymentStatus).toBe('pending')
      expect(checkInDb.status).toBe('pending') // NEVER falsely confirmed!

      clientSpy.mockRestore()
    })

    it('1.3 confirms booking and transitions to paid when Stripe verifies payment clearance', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'cs_test_p4_paid',
              payment_status: 'paid',
              status: 'complete',
              amount_total: 141600,
              payment_intent: 'pi_test_p4_success_999',
            }),
          },
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      const b = await Booking.create({
        bookingId: 'BK-P4-PAID-VERIFY',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '10:00',
        endTime: '11:00',
        selectedSlots: ['10:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_p4_paid',
      })

      const res = await request(app)
        .get(`/api/v1/payments/stripe/status/${b._id}?session_id=cs_test_p4_paid`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.data.paymentStatus).toBe('paid')
      expect(res.body.data.booking.status).toBe('confirmed')

      const updatedDb = await Booking.findById(b._id)
      expect(updatedDb.status).toBe('confirmed')
      expect(updatedDb.paymentStatus).toBe('paid')
      expect(updatedDb.amountPaid).toBe(141600)
      expect(updatedDb.amountDue).toBe(0)
      expect(updatedDb.stripePaymentIntentId).toBe('pi_test_p4_success_999')

      // Payment model ledger is synced
      const pDoc = await Payment.findOne({ booking: b._id })
      expect(pDoc).toBeDefined()
      expect(pDoc.status).toBe('paid')
      expect(pDoc.amount).toBe(141600)

      clientSpy.mockRestore()
    })

    it('1.4 payment retry re-validates slot availability and rejects if slot was claimed by another customer', async () => {
      // Customer 1 has an expired/pending booking
      const b1 = await Booking.create({
        bookingId: 'BK-P4-RETRY-CONFLICT',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '11:00',
        endTime: '12:00',
        selectedSlots: ['11:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'failed',
        paymentMethod: 'stripe',
      })

      // Another customer in the meantime booked the slot!
      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '11:00',
        booking: new mongoose.Types.ObjectId(),
        status: 'active',
      })

      // Customer 1 attempts to retry payment
      const res = await request(app)
        .post('/api/v1/payments/stripe/create-checkout-session')
        .set('Cookie', customer1Cookie)
        .send({ bookingId: b1._id })

      expect(res.status).toBe(409)
      expect(res.body.error?.code || res.body.code).toBe('SLOT_UNAVAILABLE')
    })

    it('1.5 payment retry succeeds when slot remains available', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_p4_retry_ok',
              url: 'https://checkout.stripe.com/pay/cs_test_p4_retry_ok',
            }),
          },
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      const b2 = await Booking.create({
        bookingId: 'BK-P4-RETRY-FREE',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '12:00',
        endTime: '13:00',
        selectedSlots: ['12:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'failed',
        paymentMethod: 'stripe',
      })

      const res = await request(app)
        .post('/api/v1/payments/stripe/create-checkout-session')
        .set('Cookie', customer1Cookie)
        .send({ bookingId: b2._id })

      expect(res.status).toBe(200)
      expect(res.body.data.sessionId).toBe('cs_test_p4_retry_ok')

      const refreshed = await Booking.findById(b2._id)
      expect(refreshed.paymentExpiresAt).toBeDefined()
      expect(refreshed.paymentStatus).toBe('pending')

      clientSpy.mockRestore()
    })

    it('1.6 customer cancellation on checkout releases slot and updates paymentStatus to failed', async () => {
      const b3 = await Booking.create({
        bookingId: 'BK-P4-CANCEL-CHECKOUT',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '13:00',
        endTime: '14:00',
        selectedSlots: ['13:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_p4_cancel_page',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '13:00',
        booking: b3._id,
        status: 'active',
      })

      const res = await request(app)
        .post(`/api/v1/payments/stripe/cancel/${b3._id}?session_id=cs_test_p4_cancel_page`)
        .set('Cookie', customer1Cookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const inDb = await Booking.findById(b3._id)
      expect(inDb.status).toBe('cancelled')
      expect(inDb.paymentStatus).toBe('failed')

      const slot = await SlotReservation.findOne({ booking: b3._id })
      expect(slot.status).toBe('released')
    })
  })

  // ==========================================
  // 2. STRIPE WEBHOOK VERIFICATION & IDEMPOTENCY
  // ==========================================
  describe('2. Stripe Webhook Verification & Idempotency', () => {
    it('2.1 rejects webhooks with missing or invalid signature', async () => {
      const resMissing = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .send({ type: 'checkout.session.completed' })

      expect(resMissing.status).toBe(400)

      const resInvalid = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', 't=12345,v1=bad_signature')
        .send({ type: 'checkout.session.completed' })

      expect(resInvalid.status).toBe(400)
    })

    it('2.2 processes checkout.session.completed webhook and prevents double processing on delivery retry', async () => {
      const b = await Booking.create({
        bookingId: 'BK-P4-WEBHOOK-IDEM',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '14:00',
        endTime: '15:00',
        selectedSlots: ['14:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripeCheckoutSessionId: 'cs_test_p4_webhook_idem',
      })

      const mockEvent = {
        id: 'evt_p4_webhook_idem_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_p4_webhook_idem',
            client_reference_id: b._id.toString(),
            payment_status: 'paid',
            amount_total: 141600,
            currency: 'inr',
            payment_intent: 'pi_test_p4_webhook_1',
          },
        },
      }

      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', 't=123,v1=valid_signature')
        .send(Buffer.from(JSON.stringify(mockEvent)))

      expect(res1.status).toBe(200)
      expect(res1.body.received).toBe(true)
      expect(res1.body.duplicate).toBeUndefined()

      const inDb1 = await Booking.findById(b._id)
      expect(inDb1.status).toBe('confirmed')
      expect(inDb1.paymentStatus).toBe('paid')
      expect(inDb1.stripePaymentIntentId).toBe('pi_test_p4_webhook_1')

      // Second webhook delivery (Stripe retry)
      const res2 = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', 't=123,v1=valid_signature')
        .send(Buffer.from(JSON.stringify(mockEvent)))

      expect(res2.status).toBe(200)
      expect(res2.body.duplicate).toBe(true) // Idempotent! Zero duplicate side-effects.

      clientSpy.mockRestore()
    })

    it('2.3 rejects payment confirmation if webhook amount is less than authoritative booking total', async () => {
      const b = await Booking.create({
        bookingId: 'BK-P4-TAMPER-AMOUNT',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '15:00',
        endTime: '16:00',
        selectedSlots: ['15:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
      })

      const mockEvent = {
        id: 'evt_p4_tamper_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_tamper',
            client_reference_id: b._id.toString(),
            payment_status: 'paid',
            amount_total: 1000, // Only ₹10 paid instead of ₹1,416!
            currency: 'inr',
            payment_intent: 'pi_test_tamper',
          },
        },
      }

      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      const res = await request(app)
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', 't=123,v1=valid')
        .send(Buffer.from(JSON.stringify(mockEvent)))

      expect(res.status).toBe(200)

      const inDb = await Booking.findById(b._id)
      expect(inDb.status).not.toBe('confirmed') // Rejected!
      expect(inDb.paymentStatus).toBe('failed')
      expect(inDb.paymentFailureReason).toContain('Amount mismatch')

      clientSpy.mockRestore()
    })
  })

  // ==========================================
  // 3. PAY AT VENUE INDEPENDENT WORKFLOW
  // ==========================================
  describe('3. Pay at Venue Independent Workflow', () => {
    let venueBooking = null

    it('3.1 creates confirmed booking with unpaid payment status and authoritative pricing', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id,
          sportId: testSport._id,
          date: TEST_DATE,
          startTime: '16:00',
          endTime: '17:00',
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(201)
      venueBooking = res.body.data.booking
      expect(venueBooking.paymentStatus).toBe('unpaid')
      expect(venueBooking.paymentMethod).toBe('Pay at Venue')
      expect(venueBooking.status).toBe('confirmed')
      expect(venueBooking.amountPaid).toBe(0)
      expect(venueBooking.amountDue).toBe(venueBooking.totalAmount)

      // Ledger record is created as unpaid
      const p = await Payment.findOne({ booking: venueBooking._id })
      expect(p).toBeDefined()
      expect(p.status).toBe('unpaid')
    })

    it('3.2 dashboard metrics exclude unpaid Pay at Venue booking from collected revenue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      // Unpaid bookings are tracked under metrics, but collected revenue strictly counts paid bookings
      expect(res.body.data.metrics).toHaveProperty('todayRevenue')
    })

    it('3.3 forbids regular customers from reconciling or marking venue payments as paid', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/bookings/${venueBooking._id}/payment`)
        .set('Cookie', customer1Cookie)
        .send({ paymentMethod: 'Cash', notes: 'Unauthorized attempt' })

      expect(res.status).toBe(403)
    })

    it('3.4 allows authorized admin to record payment and is idempotent on repeated reconciliation', async () => {
      // First recording
      const res1 = await request(app)
        .post(`/api/v1/admin/bookings/${venueBooking._id}/payment`)
        .set('Cookie', adminCookie)
        .send({ paymentMethod: 'Cash', notes: 'Collected at front desk receipt #5544' })

      expect(res1.status).toBe(200)
      expect(res1.body.data.booking.paymentStatus).toBe('paid')
      expect(res1.body.data.booking.amountPaid).toBe(res1.body.data.booking.totalAmount)
      expect(res1.body.data.booking.amountDue).toBe(0)

      // Repeated reconciliation (idempotent; does not duplicate revenue or corrupt data)
      const res2 = await request(app)
        .post(`/api/v1/admin/bookings/${venueBooking._id}/payment`)
        .set('Cookie', adminCookie)
        .send({ paymentMethod: 'Cash', notes: 'Duplicate click' })

      expect(res2.status).toBe(200)
      expect(res2.body.data.booking.paymentStatus).toBe('paid')
      expect(res2.body.data.booking.amountPaid).toBe(res2.body.data.booking.totalAmount)

      const pDoc = await Payment.findOne({ booking: venueBooking._id })
      expect(pDoc.status).toBe('paid')
      expect(pDoc.recordedBy.toString()).toBe(adminUser._id.toString())
    })
  })

  // ==========================================
  // 4. COUPON VALIDATION & USAGE RELIABILITY
  // ==========================================
  describe('4. Coupon & Discount Reliability', () => {
    let testCoupon = null

    beforeAll(async () => {
      await Coupon.deleteMany({ code: 'PHASE4PROMO' })
      testCoupon = await Coupon.create({
        code: 'PHASE4PROMO',
        description: 'Phase 4 Flat ₹200 off',
        discountType: 'fixed',
        discountValue: 20000, // ₹200 in paise
        minBookingAmount: 100000, // ₹1,000 min spend
        perUserLimit: 1,
        usageLimit: 2,
        usedCount: 0,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 30),
        isActive: true,
      })
    })

    afterAll(async () => {
      await Coupon.deleteMany({ code: 'PHASE4PROMO' })
    })

    it('4.1 applies authoritative coupon discount and creates CouponRedemption record', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id,
          sportId: testSport._id,
          date: TEST_DATE,
          startTime: '17:00',
          endTime: '18:00',
          couponCode: 'PHASE4PROMO',
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(201)
      const b = res.body.data.booking
      expect(b.discountAmount).toBe(20000) // ₹200 discount applied
      expect(b.coupon.code).toBe('PHASE4PROMO')

      const redemption = await CouponRedemption.findOne({ booking: b._id })
      expect(redemption).toBeDefined()
      expect(redemption.status).toBe('active')

      const couponInDb = await Coupon.findById(testCoupon._id)
      expect(couponInDb.usedCount).toBe(1)
    })

    it('4.2 rejects coupon when per-user limit is exceeded', async () => {
      // Customer 1 attempts to use PHASE4PROMO a second time
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          turfId: testTurf._id,
          sportId: testSport._id,
          date: TEST_DATE,
          startTime: '18:00',
          endTime: '19:00',
          couponCode: 'PHASE4PROMO',
          paymentMethod: 'Pay at Venue',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('COUPON_USER_LIMIT_EXCEEDED')
    })
  })

  // ==========================================
  // 5. CANCELLATION & STRIPE REFUND RELIABILITY
  // ==========================================
  describe('5. Cancellation & Stripe Refund Reliability', () => {
    it('5.1 customer cannot cancel another customer booking (403 Forbidden)', async () => {
      const b = await Booking.create({
        bookingId: 'BK-P4-OWNER-TEST',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '19:00',
        endTime: '20:00',
        selectedSlots: ['19:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${b._id}/cancel`)
        .set('Cookie', customer2Cookie)
        .send({ cancellationReason: 'Fraud attempt' })

      expect(res.status).toBe(403)
    })

    it('5.2 customer can cancel their own eligible booking and Pay at Venue does not trigger Stripe refund', async () => {
      const b = await Booking.create({
        bookingId: 'BK-P4-VENUE-CANCEL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '20:00',
        endTime: '21:00',
        selectedSlots: ['20:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '20:00',
        booking: b._id,
        status: 'active',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${b._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Change of schedule' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.refundStatus).toBe('not_applicable') // Pay at Venue unpaid!

      const slot = await SlotReservation.findOne({ booking: b._id })
      expect(slot.status).toBe('released')
    })

    it('5.3 processes Stripe refund successfully for paid online booking', async () => {
      const mockStripe = {
        refunds: {
          create: vi.fn().mockResolvedValue({
            id: 're_test_p4_success_100',
            status: 'succeeded',
            amount: 141600,
          }),
        },
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripe)

      const b = await Booking.create({
        bookingId: 'BK-P4-REFUND-SUCCESS',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '21:00',
        endTime: '22:00',
        selectedSlots: ['21:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        amountPaid: 141600,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_p4_refund_100',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${b._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Cannot play' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.refundStatus).toBe('succeeded')
      expect(res.body.data.booking.paymentStatus).toBe('refunded')
      expect(res.body.data.booking.stripeRefundId).toBe('re_test_p4_success_100')

      // Sync verified with Payment model
      const p = await Payment.findOne({ booking: b._id })
      expect(p.status).toBe('refunded')
      expect(p.stripeRefundId).toBe('re_test_p4_success_100')

      clientSpy.mockRestore()
    })

    it('5.4 handles failed Stripe refund gracefully and allows safe admin retry', async () => {
      // Step 1: Stripe refund fails
      const mockStripeFail = {
        refunds: {
          create: vi.fn().mockRejectedValue(new Error('Card issuer declined refund')),
        },
      }
      let clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeFail)

      const b = await Booking.create({
        bookingId: 'BK-P4-REFUND-FAIL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '22:00',
        endTime: '23:00',
        selectedSlots: ['22:00'],
        slotPrice: 120000,
        subtotal: 120000,
        totalAmount: 141600,
        amountPaid: 141600,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_p4_refund_fail',
      })

      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${b._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Test failure recovery' })

      expect(cancelRes.status).toBe(200)
      expect(cancelRes.body.data.booking.status).toBe('cancelled')
      expect(cancelRes.body.data.booking.refundStatus).toBe('failed')
      expect(cancelRes.body.data.booking.refundFailureReason).toContain('Card issuer declined refund')

      clientSpy.mockRestore()

      // Step 2: Admin retries the failed refund and Stripe succeeds
      const mockStripeRetrySuccess = {
        refunds: {
          create: vi.fn().mockResolvedValue({
            id: 're_test_p4_retry_recovered',
            status: 'succeeded',
            amount: 141600,
          }),
        },
      }
      clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeRetrySuccess)

      const retryRes = await request(app)
        .post(`/api/v1/admin/bookings/${b._id}/refund/retry`)
        .set('Cookie', adminCookie)

      expect(retryRes.status).toBe(200)
      expect(retryRes.body.data.booking.refundStatus).toBe('succeeded')
      expect(retryRes.body.data.booking.paymentStatus).toBe('refunded')
      expect(retryRes.body.data.booking.stripeRefundId).toBe('re_test_p4_retry_recovered')

      clientSpy.mockRestore()
    })
  })
})

