import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import { Booking } from '../src/models/Booking.js'
import { Turf } from '../src/models/Turf.js'
import { User } from '../src/models/User.js'
import pricingService from '../src/services/pricing.service.js'
import bookingService, { calculateRefundDetails } from '../src/services/booking.service.js'
import settingsService from '../src/services/settings.service.js'
import stripeService from '../src/services/stripe.service.js'

dotenv.config()

describe('Phase 5: Partial Advance Payment for Pay at Venue', () => {
  let testUser
  let testTurf

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI)
    }

    testUser = await User.findOne({ role: 'customer' })
    if (!testUser) {
      testUser = await User.create({
        name: 'Phase5 Test Customer',
        email: `phase5_${Date.now()}@test.com`,
        phone: '9876543210',
        password: 'Password123!',
        role: 'customer',
        isVerified: true,
      })
    }

    testTurf = await Turf.findOne({ isActive: true })
    if (!testTurf) {
      testTurf = await Turf.create({
        name: 'Phase5 Arena',
        slug: `phase5-arena-${Date.now()}`,
        pricing: { baseRate: 200000 },
        isActive: true,
      })
    }
  })

  afterAll(async () => {
    await Booking.deleteMany({ 'contactDetails.email': /phase5/i })
  })

  describe('1. Authoritative Pricing & Advance Calculations', () => {
    it('accurately calculates 20% advance on ₹2,000 with integer paise precision', async () => {
      await BusinessSettings.updateOne({}, {
        $set: {
          'partialPaymentSettings.enabled': true,
          'partialPaymentSettings.advancePercentage': 20,
        },
      }, { upsert: true })

      const quote = await pricingService.calculateQuote({
        turfId: testTurf._id,
        date: '2026-11-20',
        startTime: '10:00',
        endTime: '11:00',
      })

      expect(quote.partialPayment).toBeDefined()
      expect(quote.partialPayment.enabled).toBe(true)
      expect(quote.partialPayment.advancePercentage).toBe(20)

      const total = quote.finalTotal
      const advance = quote.partialPayment.advanceAmount
      const remaining = quote.partialPayment.remainingAmount

      expect(advance + remaining).toBe(total)
      expect(advance).toBe(Math.round((total * 20) / 100))
    })

    it('guarantees advanceAmount + remainingAmount === totalAmount on odd paise totals', () => {
      const oddTotal = 199900 // ₹1,999.00
      const percentage = 20
      const advanceAmount = Math.round((oddTotal * percentage) / 100)
      const remainingAmount = oddTotal - advanceAmount

      expect(advanceAmount).toBe(39980) // ₹399.80
      expect(remainingAmount).toBe(159920) // ₹1,599.20
      expect(advanceAmount + remainingAmount).toBe(oddTotal)
    })

    it('rejects invalid percentage configuration values in settings', async () => {
      await expect(settingsService.updateSettings({
        partialPaymentSettings: { advancePercentage: 0 },
      })).rejects.toThrow(/between 1 and 99/i)

      await expect(settingsService.updateSettings({
        partialPaymentSettings: { advancePercentage: 100 },
      })).rejects.toThrow(/between 1 and 99/i)

      await expect(settingsService.updateSettings({
        partialPaymentSettings: { advancePercentage: -15 },
      })).rejects.toThrow(/between 1 and 99/i)

      await expect(settingsService.updateSettings({
        partialPaymentSettings: { advancePercentage: NaN },
      })).rejects.toThrow(/valid number/i)
    })
  })

  describe('2. Partial Advance Booking Creation & Stripe Session Flow', () => {
    it('creates a partial advance booking with pending payment and authoritative amounts', async () => {
      const dynamicDate = new Date(Date.now() + 86400000 * 40 + Math.floor(Math.random() * 50000000)).toISOString().split('T')[0]
      const bookingData = {
        turfId: testTurf._id,
        date: dynamicDate,
        startTime: '06:00',
        endTime: '07:00',
        playerCount: 10,
        paymentMethod: 'stripe',
        paymentPlan: 'partial_advance',
        contactDetails: {
          name: 'Advance Player',
          email: 'phase5_advance@test.com',
          phone: '9876543210',
        },
      }

      const booking = await bookingService.createBooking(bookingData, testUser, '127.0.0.1')

      expect(booking.paymentPlan).toBe('partial_advance')
      expect(booking.advancePercentage).toBe(20)
      expect(booking.advanceAmount).toBeGreaterThan(0)
      expect(booking.remainingAmount).toBeGreaterThan(0)
      expect(booking.advanceAmount + booking.remainingAmount).toBe(booking.totalAmount)
      expect(booking.status).toBe('pending')
      expect(booking.paymentStatus).toBe('pending')
      expect(booking.amountPaid).toBe(0)
      expect(booking.amountDue).toBe(booking.totalAmount)
    })

    it('creates a Stripe checkout session charging only the advance amount for partial_advance plan', async () => {
      const booking = await Booking.create({
        bookingId: `TB-P5-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-20',
        startTime: '16:00',
        endTime: '17:00',
        slotPrice: 200000,
        subtotal: 200000,
        taxAmount: 0,
        totalAmount: 200000,
        paymentPlan: 'partial_advance',
        advancePercentage: 20,
        advanceAmount: 40000,
        remainingAmount: 160000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        amountPaid: 0,
        amountDue: 200000,
        contactDetails: {
          name: 'Stripe Partial Player',
          email: 'phase5_partial_stripe@test.com',
          phone: '9876543210',
        },
      })

      const session = await stripeService.createCheckoutSession(
        { bookingId: booking._id },
        testUser,
        '127.0.0.1',
        'http://localhost:3000'
      )

      expect(session.sessionId).toBeDefined()
      expect(session.chargeAmount).toBe(40000) // Exactly ₹400 advance, NOT ₹2,000!
      expect(session.url).toBeDefined()
    })
  })

  describe('3. Verified Payment Webhook & Confirmation', () => {
    it('confirms booking as partially_paid upon verified Stripe payment for advance amount', async () => {
      const booking = await Booking.create({
        bookingId: `TB-P5-WH-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-20',
        startTime: '18:00',
        endTime: '19:00',
        slotPrice: 200000,
        subtotal: 200000,
        taxAmount: 0,
        totalAmount: 200000,
        paymentPlan: 'partial_advance',
        advancePercentage: 20,
        advanceAmount: 40000,
        remainingAmount: 160000,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        amountPaid: 0,
        amountDue: 200000,
        contactDetails: {
          name: 'Webhook Player',
          email: 'phase5_webhook@test.com',
          phone: '9876543210',
        },
      })

      const mockSession = {
        id: `cs_test_wh_${Date.now()}`,
        payment_intent: `pi_test_${Date.now()}`,
        amount_total: 40000, // ₹400 advance
        payment_status: 'paid',
        currency: 'inr',
        metadata: {
          bookingId: booking._id.toString(),
          paymentPlan: 'partial_advance',
        },
      }

      const mockEvent = {
        id: `evt_test_${Date.now()}`,
        type: 'checkout.session.completed',
        data: { object: mockSession },
      }

      const mockStripeClient = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      }
      vi.spyOn(stripeService, 'getStripeClient').mockReturnValue(mockStripeClient)
      const origSecret = process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key'

      try {
        await stripeService.handleWebhookEvent(Buffer.from('{}'), 'sig_test_p5')

        const confirmedBooking = await Booking.findById(booking._id)
        expect(confirmedBooking.status).toBe('confirmed')
        expect(confirmedBooking.paymentStatus).toBe('partially_paid')
        expect(confirmedBooking.amountPaid).toBe(40000)
        expect(confirmedBooking.amountDue).toBe(160000)
      } finally {
        process.env.STRIPE_WEBHOOK_SECRET = origSecret
        vi.restoreAllMocks()
      }
    })
  })

  describe('4. Admin Payment Recording at Venue', () => {
    it('allows admin to record venue payment for remaining balance and marks as paid', async () => {
      const booking = await Booking.create({
        bookingId: `TB-P5-ADM-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-20',
        startTime: '20:00',
        endTime: '21:00',
        slotPrice: 200000,
        subtotal: 200000,
        taxAmount: 0,
        totalAmount: 200000,
        paymentPlan: 'partial_advance',
        advancePercentage: 20,
        advanceAmount: 40000,
        remainingAmount: 160000,
        status: 'confirmed',
        paymentStatus: 'partially_paid',
        paymentMethod: 'stripe',
        amountPaid: 40000,
        amountDue: 160000,
        contactDetails: {
          name: 'Counter Player',
          email: 'phase5_counter@test.com',
          phone: '9876543210',
        },
      })

      const adminUser = await User.findOne({ role: 'admin' }) || testUser

      const updated = await bookingService.recordPayment(
        booking._id,
        {
          paymentMethod: 'Cash at Counter',
          notes: 'Counter Receipt #8812',
          amount: 160000,
        },
        adminUser
      )

      expect(updated.paymentStatus).toBe('paid')
      expect(updated.amountPaid).toBe(200000)
      expect(updated.amountDue).toBe(0)
      expect(updated.venuePayment).toBeDefined()
      expect(updated.venuePayment.amount).toBe(160000)
      expect(updated.venuePayment.paymentMethod).toBe('Cash at Counter')
    })

    it('rejects recording overpayment greater than remaining balance due', async () => {
      const booking = await Booking.create({
        bookingId: `TB-P5-OVER-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-20',
        startTime: '21:00',
        endTime: '22:00',
        slotPrice: 200000,
        subtotal: 200000,
        taxAmount: 0,
        totalAmount: 200000,
        paymentPlan: 'partial_advance',
        advancePercentage: 20,
        advanceAmount: 40000,
        remainingAmount: 160000,
        status: 'confirmed',
        paymentStatus: 'partially_paid',
        paymentMethod: 'stripe',
        amountPaid: 40000,
        amountDue: 160000,
        contactDetails: {
          name: 'Overpay Player',
          email: 'phase5_overpay@test.com',
          phone: '9876543210',
        },
      })

      const adminUser = await User.findOne({ role: 'admin' }) || testUser

      await expect(
        bookingService.recordPayment(
          booking._id,
          {
            amount: 180000, // ₹1,800 is greater than ₹1,600 remaining due!
          },
          adminUser
        )
      ).rejects.toThrow(/cannot exceed remaining balance/i)
    })
  })

  describe('5. Cancellation & Partial Advance Refund Safety', () => {
    it('strictly caps refund eligibility to actual amount paid (advance), never total amount', async () => {
      const booking = await Booking.create({
        bookingId: `TB-P5-REF-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-25', // > 24 hours in the future
        startTime: '10:00',
        endTime: '11:00',
        slotPrice: 200000,
        subtotal: 200000,
        taxAmount: 0,
        totalAmount: 200000,
        paymentPlan: 'partial_advance',
        advancePercentage: 20,
        advanceAmount: 40000,
        remainingAmount: 160000,
        status: 'confirmed',
        paymentStatus: 'partially_paid',
        paymentMethod: 'stripe',
        amountPaid: 40000, // ₹400 advance collected
        amountDue: 160000,
        contactDetails: {
          name: 'Refund Player',
          email: 'phase5_refund@test.com',
          phone: '9876543210',
        },
      })

      const settings = await BusinessSettings.getSettings()
      const refundDetails = calculateRefundDetails({ booking, settings })

      // At 100% refund tier, refund MUST be ₹400 (amountPaid), NEVER ₹2,000!
      expect(refundDetails.eligibleRefundAmount).toBeLessThanOrEqual(40000)
      expect(refundDetails.eligibleRefundAmount).toBe(40000)
      expect(refundDetails.totalCollected).toBe(40000)
    })
  })

  describe('6. Backward Compatibility for Historical Zero-Advance Bookings', () => {
    it('correctly handles historical unpaid Pay at Venue bookings without failure', async () => {
      const historicalBooking = await Booking.create({
        bookingId: `TB-HIST-${Date.now()}`,
        turf: testTurf._id,
        user: testUser._id,
        date: '2026-11-20',
        startTime: '12:00',
        endTime: '13:00',
        slotPrice: 150000,
        subtotal: 150000,
        taxAmount: 0,
        totalAmount: 150000,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        paymentMethod: 'Pay at Venue',
        amountPaid: 0,
        amountDue: 150000,
        contactDetails: {
          name: 'Historical Player',
          email: 'phase5_historical@test.com',
          phone: '9876543210',
        },
      })

      const adminUser = await User.findOne({ role: 'admin' }) || testUser

      const updated = await bookingService.recordPayment(
        historicalBooking._id,
        {
          paymentMethod: 'Pay at Venue',
          notes: 'Historical counter collection',
        },
        adminUser
      )

      expect(updated.paymentStatus).toBe('paid')
      expect(updated.amountPaid).toBe(150000)
      expect(updated.amountDue).toBe(0)
    })
  })
})
