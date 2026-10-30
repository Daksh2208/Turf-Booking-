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
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import { StripeEvent } from '../src/models/StripeEvent.js'
import stripeService from '../src/services/stripe.service.js'
import { bookingService } from '../src/services/booking.service.js'
import bcrypt from 'bcryptjs'

describe('Phase 3.1: Customer Cancellation, Stripe Refund & Admin Refund Management Suite', () => {
  let adminCookie = ''
  let customer1Cookie = ''
  let customer2Cookie = ''
  let adminUser = null
  let customer1 = null
  let customer2 = null
  let testSport = null
  let testTurf = null

  // Target a future date 5 days away so we can test various advance notice windows
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  const TEST_DATE = futureDate.toISOString().split('T')[0]

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI)
    }

    // Clean up any previous test artifacts
    await Promise.all([
      User.deleteMany({
        email: { $in: ['cancel_admin@turf.com', 'cancel_c1@turf.com', 'cancel_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'cancel-test-sport' }),
      Turf.deleteMany({ slug: 'cancel-test-arena' }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_cancel_test_/ } }),
    ])

    const hashedPassword = await bcrypt.hash('Password123!', 10)

    adminUser = await User.create({
      name: 'Cancellation Admin',
      email: 'cancel_admin@turf.com',
      passwordHash: hashedPassword,
      phone: '9988771122',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    })

    customer1 = await User.create({
      name: 'Customer One',
      email: 'cancel_c1@turf.com',
      passwordHash: hashedPassword,
      phone: '9876500001',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    customer2 = await User.create({
      name: 'Customer Two',
      email: 'cancel_c2@turf.com',
      passwordHash: hashedPassword,
      phone: '9876500002',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
    })

    testSport = await Sport.create({
      name: 'Cancel Test Sport',
      slug: 'cancel-test-sport',
      icon: 'zap',
      playerCountPerTeam: 6,
      pricingRules: {
        baseHourlyRate: 100000, // 1000 INR in paise
        peakHourlyRate: 150000,
        weekendHourlyRate: 120000,
        weekendPeakHourlyRate: 180000,
      },
    })

    testTurf = await Turf.create({
      name: 'Cancellation Test Arena',
      slug: 'cancel-test-arena',
      sports: [testSport._id],
      defaultSport: testSport._id,
      address: {
        street: '100 Refund Boulevard',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
      },
      openingHours: { open: '06:00', close: '23:00' },
      customPricing: {
        baseHourlyRate: 100000,
        peakHourlyRate: 150000,
        weekendHourlyRate: 120000,
        weekendPeakHourlyRate: 180000,
      },
      isActive: true,
    })

    // Ensure BusinessSettings has the standard policy tiers
    const settings = await BusinessSettings.getSettings()
    settings.bookingRules.cancellationCutoffHours = 4
    settings.cancellationPolicy = {
      enabled: true,
      cutoffHours: 4,
      allowCancellationWithinCutoff: false,
      tiers: [
        { hoursBefore: 24, refundPercentage: 100 },
        { hoursBefore: 12, refundPercentage: 50 },
        { hoursBefore: 4, refundPercentage: 0 },
      ],
      defaultRefundPercentage: 0,
    }
    await settings.save()

    // Login users to get HTTP cookies
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'cancel_admin@turf.com',
      password: 'Password123!',
    })
    adminCookie = adminLogin.headers['set-cookie']?.[0] || ''

    const c1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'cancel_c1@turf.com',
      password: 'Password123!',
    })
    customer1Cookie = c1Login.headers['set-cookie']?.[0] || ''

    const c2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'cancel_c2@turf.com',
      password: 'Password123!',
    })
    customer2Cookie = c2Login.headers['set-cookie']?.[0] || ''
  })

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({
        email: { $in: ['cancel_admin@turf.com', 'cancel_c1@turf.com', 'cancel_c2@turf.com'] },
      }),
      Sport.deleteMany({ slug: 'cancel-test-sport' }),
      Turf.deleteMany({ slug: 'cancel-test-arena' }),
      Booking.deleteMany({ turf: testTurf?._id }),
      SlotReservation.deleteMany({ turf: testTurf?._id }),
      StripeEvent.deleteMany({ eventId: { $regex: /^evt_cancel_test_/ } }),
    ])
  })

  describe('1. Customer Cancellation Permissions & Security', () => {
    it('customer can cancel their own eligible confirmed booking', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-CANCEL-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '10:00',
        endTime: '11:00',
        selectedSlots: ['10:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '10:00',
        booking: booking._id,
        user: customer1._id,
        status: 'active',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Change in team match plan' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.cancellationReason).toBe('Change in team match plan')
      expect(res.body.data.booking.cancelledBy.role).toBe('customer')

      // Verify slot was released in DB
      const slot = await SlotReservation.findOne({ booking: booking._id })
      expect(slot.status).toBe('released')
    })

    it('customer cannot cancel another customer\'s booking (403 Forbidden)', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-CANCEL-02',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '11:00',
        endTime: '12:00',
        selectedSlots: ['11:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer2Cookie) // Customer 2 attempts to cancel Customer 1's booking
        .send({ cancellationReason: 'Malicious cancellation' })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')

      // Verify status was not altered
      const refreshed = await Booking.findById(booking._id)
      expect(refreshed.status).toBe('confirmed')
    })

    it('customer cannot cancel a completed booking (400 CANNOT_CANCEL_COMPLETED_BOOKING)', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-CANCEL-03',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '08:00',
        endTime: '09:00',
        selectedSlots: ['08:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Late cancellation after playing' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('CANNOT_CANCEL_COMPLETED_BOOKING')
    })

    it('customer cannot cancel after the configured cancellation cutoff deadline (400)', async () => {
      // Create a booking for today starting in 1 hour (less than cutoff of 4 hours)
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const nextHour = (now.getHours() + 1) % 24
      const timeStr = `${String(nextHour).padStart(2, '0')}:00`
      const endStr = `${String((nextHour + 1) % 24).padStart(2, '0')}:00`

      const lateBooking = await Booking.create({
        bookingId: 'TB-TEST-CANCEL-LATE-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: todayStr,
        startTime: timeStr,
        endTime: endStr,
        selectedSlots: [timeStr],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${lateBooking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Late notice cancellation' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('CANCELLATION_CUTOFF_EXCEEDED')
    })

    it('repeated cancellation requests return idempotently and do not duplicate side-effects', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-CANCEL-IDEM-01',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '13:00',
        endTime: '14:00',
        selectedSlots: ['13:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      // First cancel
      const res1 = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'First call' })
      expect(res1.status).toBe(200)

      // Second cancel (duplicate network retry)
      const res2 = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Duplicate retry' })
      expect(res2.status).toBe(200)
      expect(res2.body.data.booking.status).toBe('cancelled')
    })
  })

  describe('2. Refund Calculations & Policy Enforcement', () => {
    it('calculates 100% full refund when cancelled > 24 hours in advance', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-REFUND-FULL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE, // 5 days in advance
        startTime: '18:00',
        endTime: '19:00',
        selectedSlots: ['18:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        amountPaid: 118000,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_full_refund_100',
      })

      const previewRes = await request(app)
        .get(`/api/v1/bookings/${booking._id}/cancellation-preview`)
        .set('Cookie', customer1Cookie)

      expect(previewRes.status).toBe(200)
      expect(previewRes.body.data.calculation.refundPercentage).toBe(100)
      expect(previewRes.body.data.calculation.eligibleRefundAmount).toBe(118000)
      expect(previewRes.body.data.calculation.nonRefundableAmount).toBe(0)
      expect(previewRes.body.data.calculation.refundType).toBe('full')
    })

    it('calculates 50% partial refund when cancelled 12-24 hours before match', async () => {
      // Slot 18 hours in advance
      const eighteenHoursAhead = new Date(Date.now() + 18 * 60 * 60 * 1000)
      const targetDate = eighteenHoursAhead.toISOString().split('T')[0]
      const hours = String(eighteenHoursAhead.getHours()).padStart(2, '0')
      const targetTime = `${hours}:00`
      const endTime = `${String((Number(hours) + 1) % 24).padStart(2, '0')}:00`

      const booking = await Booking.create({
        bookingId: 'TB-TEST-REFUND-PARTIAL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: targetDate,
        startTime: targetTime,
        endTime: endTime,
        selectedSlots: [targetTime],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        amountPaid: 118000,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_partial_refund_50',
      })

      const previewRes = await request(app)
        .get(`/api/v1/bookings/${booking._id}/cancellation-preview`)
        .set('Cookie', customer1Cookie)

      expect(previewRes.status).toBe(200)
      expect(previewRes.body.data.calculation.refundPercentage).toBe(50)
      expect(previewRes.body.data.calculation.eligibleRefundAmount).toBe(59000) // 50% of 118000
      expect(previewRes.body.data.calculation.nonRefundableAmount).toBe(59000)
      expect(previewRes.body.data.calculation.refundType).toBe('partial')
    })

    it('Pay at Venue cancellation does not invoke Stripe and marks refund as not_applicable', async () => {
      const stripeSpy = vi.spyOn(stripeService, 'processStripeRefund')

      const booking = await Booking.create({
        bookingId: 'TB-TEST-PAY-AT-VENUE-CANCEL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '15:00',
        endTime: '16:00',
        selectedSlots: ['15:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Squad drop out' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.refundStatus).toBe('not_applicable')
      expect(res.body.data.booking.refundAmount).toBe(0)
      expect(stripeSpy).not.toHaveBeenCalled()

      stripeSpy.mockRestore()
    })

    it('unpaid Stripe booking does not receive a refund upon cancellation', async () => {
      const stripeSpy = vi.spyOn(stripeService, 'processStripeRefund')

      const booking = await Booking.create({
        bookingId: 'TB-TEST-UNPAID-STRIPE-CANCEL',
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
        stripeCheckoutSessionId: 'cs_test_unpaid_123',
      })

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Customer aborted checkout' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.refundStatus).toBe('not_applicable')
      expect(res.body.data.booking.paymentStatus).toBe('failed')
      expect(stripeSpy).not.toHaveBeenCalled()

      stripeSpy.mockRestore()
    })

    it('successful Stripe refund updates refund status and payment status accurately', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-STRIPE-SUCCESS-REFUND',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '19:00',
        endTime: '20:00',
        selectedSlots: ['19:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        amountPaid: 118000,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_success_999',
      })

      // Mock stripe refunds.create call on client
      const fakeRefund = {
        id: 're_test_mock_12345',
        status: 'succeeded',
        amount: 118000,
        payment_intent: 'pi_test_success_999',
      }
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue({
        refunds: {
          create: vi.fn().mockResolvedValue(fakeRefund),
        },
      })
      const isEnabledSpy = vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)

      const res = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Plans cancelled early' })

      clientSpy.mockRestore()
      isEnabledSpy.mockRestore()

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.refundStatus).toBe('succeeded')
      expect(res.body.data.booking.paymentStatus).toBe('refunded')
      expect(res.body.data.booking.refundAmount).toBe(118000)
      expect(res.body.data.booking.stripeRefundId).toBe('re_test_mock_12345')
      expect(res.body.data.booking.cancellationHistory?.length).toBeGreaterThan(0)
    })

    it('failed Stripe refund records failure status and allows safe admin retry', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-STRIPE-FAIL-RETRY',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '20:00',
        endTime: '21:00',
        selectedSlots: ['20:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        amountPaid: 118000,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_fail_111',
      })

      // 1. Simulate Stripe API failure during customer cancellation
      const clientSpy1 = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue({
        refunds: {
          create: vi.fn().mockRejectedValue(new Error('Stripe simulated network timeout')),
        },
      })
      const isEnabledSpy = vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)

      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Customer cancels with stripe outage' })

      clientSpy1.mockRestore()

      expect(cancelRes.status).toBe(200)
      expect(cancelRes.body.data.booking.status).toBe('cancelled')
      expect(cancelRes.body.data.booking.refundStatus).toBe('failed')
      expect(cancelRes.body.data.booking.refundFailureReason).toContain('Stripe simulated network timeout')

      // 2. Admin safely retries the failed refund
      const clientSpy2 = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue({
        refunds: {
          create: vi.fn().mockResolvedValue({
            id: 're_test_retried_succeeded',
            status: 'succeeded',
            amount: 118000,
            payment_intent: 'pi_test_fail_111',
          }),
        },
      })

      const retryRes = await request(app)
        .post(`/api/v1/admin/bookings/${booking._id}/refund/retry`)
        .set('Cookie', adminCookie)
        .send({})

      clientSpy2.mockRestore()
      isEnabledSpy.mockRestore()

      expect(retryRes.status).toBe(200)
      expect(retryRes.body.data.booking.refundStatus).toBe('succeeded')
      expect(retryRes.body.data.booking.stripeRefundId).toBe('re_test_retried_succeeded')
      expect(retryRes.body.data.booking.paymentStatus).toBe('refunded')
    })
  })

  describe('3. Inventory & Concurrency Protection', () => {
    it('cancelled booking releases slots so they can immediately be reserved by another customer', async () => {
      const slotTime = '17:00'
      const booking = await Booking.create({
        bookingId: 'TB-TEST-RELEASE-REBOOK',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: slotTime,
        endTime: '18:00',
        selectedSlots: [slotTime],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: slotTime,
        booking: booking._id,
        user: customer1._id,
        status: 'active',
      })

      // Cancel booking
      await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Releasing for friend' })

      // Verify slot status in DB
      const releasedSlot = await SlotReservation.findOne({ booking: booking._id })
      expect(releasedSlot.status).toBe('released')

      // Customer 2 now successfully books the released slot
      const newBookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer2Cookie)
        .send({
          turfId: testTurf._id.toString(),
          sportId: testSport._id.toString(),
          date: TEST_DATE,
          startTime: slotTime,
          endTime: '18:00',
          playerCount: 10,
          contactDetails: { name: 'Customer Two', email: 'cancel_c2@turf.com', phone: '9876500002' },
          paymentMethod: 'Pay at Venue',
        })

      expect(newBookingRes.status).toBe(201)
      expect(newBookingRes.body.data.booking.status).toBe('confirmed')
    })

    it('concurrent cancellation requests remain safe and execute atomically', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-CONCURRENT-CANCEL',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '21:00',
        endTime: '22:00',
        selectedSlots: ['21:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      await SlotReservation.create({
        turf: testTurf._id,
        date: TEST_DATE,
        slotTime: '21:00',
        booking: booking._id,
        user: customer1._id,
        status: 'active',
      })

      // Fire 2 concurrent cancellations
      const [call1, call2] = await Promise.all([
        request(app)
          .post(`/api/v1/bookings/${booking._id}/cancel`)
          .set('Cookie', customer1Cookie)
          .send({ cancellationReason: 'Request 1' }),
        request(app)
          .post(`/api/v1/bookings/${booking._id}/cancel`)
          .set('Cookie', customer1Cookie)
          .send({ cancellationReason: 'Request 2' }),
      ])

      expect(call1.status).toBe(200)
      expect(call2.status).toBe(200)

      const finalBooking = await Booking.findById(booking._id)
      expect(finalBooking.status).toBe('cancelled')
      // Exactly 1 cancellation action recorded in cancellationHistory
      const cancelledActions = finalBooking.cancellationHistory?.filter((h) => h.action === 'cancelled') || []
      expect(cancelledActions.length).toBe(1)
    })
  })

  describe('4. Admin Management & Webhook Idempotency', () => {
    it('admin can cancel an eligible booking and override cutoff window if needed', async () => {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const nextHour = (now.getHours() + 1) % 24
      const timeStr = `${String(nextHour).padStart(2, '0')}:00`
      const endStr = `${String((nextHour + 1) % 24).padStart(2, '0')}:00`

      const booking = await Booking.create({
        bookingId: 'TB-TEST-ADMIN-OVERRIDE',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: todayStr,
        startTime: timeStr,
        endTime: endStr,
        selectedSlots: [timeStr],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
      })

      const res = await request(app)
        .post(`/api/v1/admin/bookings/${booking._id}/cancel`)
        .set('Cookie', adminCookie)
        .send({ cancellationReason: 'Administrative rain cancellation' })

      expect(res.status).toBe(200)
      expect(res.body.data.booking.status).toBe('cancelled')
      expect(res.body.data.booking.cancelledBy.role).toBe('admin')
      expect(res.body.data.booking.cancellationReason).toBe('Administrative rain cancellation')
    })

    it('customer is forbidden from accessing admin cancellation endpoints (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/bookings/507f1f77bcf86cd799439011/cancel')
        .set('Cookie', customer1Cookie)
        .send({ cancellationReason: 'Hacker attempt' })

      expect(res.status).toBe(403)
      expect(['FORBIDDEN', 'ADMIN_REQUIRED']).toContain(res.body.error?.code)
    })

    it('admin can filter bookings by refundStatus in GET /api/v1/admin/bookings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/bookings?refundStatus=succeeded')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.bookings)).toBe(true)
    })

    it('Stripe charge.refunded webhook updates booking state idempotently on retries', async () => {
      const booking = await Booking.create({
        bookingId: 'TB-TEST-WEBHOOK-REFUND',
        user: customer1._id,
        turf: testTurf._id,
        sport: testSport._id,
        date: TEST_DATE,
        startTime: '10:00',
        endTime: '11:00',
        selectedSlots: ['10:00'],
        slotPrice: 100000,
        subtotal: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        amountPaid: 118000,
        status: 'cancelled',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: 'pi_test_webhook_refund_555',
      })

      const webhookEventPayload = {
        id: 'evt_cancel_test_refund_101',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_999',
            payment_intent: 'pi_test_webhook_refund_555',
            amount_refunded: 118000,
            refunded: true,
          },
        },
      }

      // Mock constructEvent to return our test event
      const clientSpy = vi.spyOn(stripeService, 'getStripeClient').mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(webhookEventPayload),
        },
      })
      const isEnabledSpy = vi.spyOn(stripeService, 'isEnabled').mockReturnValue(true)

      // First webhook delivery
      const res1 = await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_1')
      expect(res1.received).toBe(true)
      expect(res1.duplicate).toBeUndefined()

      const updated1 = await Booking.findById(booking._id)
      expect(updated1.refundStatus).toBe('succeeded')
      expect(updated1.paymentStatus).toBe('refunded')
      expect(updated1.refundAmount).toBe(118000)

      // Second webhook delivery (Stripe retry)
      const res2 = await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_1')
      expect(res2.received).toBe(true)
      expect(res2.duplicate).toBe(true)

      clientSpy.mockRestore()
      isEnabledSpy.mockRestore()
    })
  })
})
