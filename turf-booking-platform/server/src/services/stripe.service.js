import Stripe from 'stripe'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Booking } from '../models/Booking.js'
import { SlotReservation } from '../models/SlotReservation.js'
import { StripeEvent } from '../models/StripeEvent.js'
import { Payment } from '../models/Payment.js'
import { bookingService } from './booking.service.js'
import couponService from './coupon.service.js'
import { logAudit } from '../utils/auditLogger.js'
import { broadcastAvailabilityUpdate } from '../socket.js'

let stripeClientInstance = null

export const stripeService = {
  /**
   * Check if Stripe secret key is present in environment
   */
  isConfigured() {
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.trim() !== '')
  },

  /**
   * Check if Stripe payments are both configured and explicitly enabled
   */
  isEnabled() {
    return Boolean(env.STRIPE_PAYMENT_ENABLED && this.isConfigured())
  },

  /**
   * Return safe public configuration for frontend (never exposes secret keys)
   */
  getPublicConfig() {
    const enabled = this.isEnabled()
    return {
      enabled,
      publishableKey: enabled ? (env.STRIPE_PUBLISHABLE_KEY || '') : '',
      currency: env.STRIPE_CURRENCY || 'inr',
    }
  },

  /**
   * Get or initialize the official Stripe SDK client instance
   */
  getStripeClient() {
    if (!this.isEnabled()) {
      const error = new Error('Online payment is not configured yet. Please choose Pay at Venue.')
      error.statusCode = 400
      error.code = 'STRIPE_NOT_CONFIGURED'
      throw error
    }

    if (!stripeClientInstance) {
      stripeClientInstance = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
        appInfo: {
          name: 'TurfBookingPlatform',
          version: '1.0.0',
        },
      })
    }

    return stripeClientInstance
  },

  /**
   * Create a Stripe Checkout Session for a turf booking
   * Enforces server authoritative pricing, slot reservation and user authentication
   */
  async createCheckoutSession({ bookingId, bookingData } = {}, user, ip = '', clientOrigin = null) {
    if (!user || !user._id) {
      const error = new Error('Authentication required to initialize online payment.')
      error.statusCode = 401
      error.code = 'UNAUTHENTICATED'
      throw error
    }

    if (user.role === 'admin') {
      const error = new Error('Admins are not permitted to create customer booking payments.')
      error.statusCode = 403
      error.code = 'ADMIN_BOOKING_FORBIDDEN'
      throw error
    }

    if (!this.isEnabled()) {
      const error = new Error('Online payment is not configured yet. Please choose Pay at Venue.')
      error.statusCode = 400
      error.code = 'STRIPE_NOT_CONFIGURED'
      throw error
    }

    let booking = null

    if (bookingData) {
      // Create new booking with paymentMethod: 'stripe' (reserves slots with status: 'pending')
      booking = await bookingService.createBooking(
        {
          ...bookingData,
          paymentMethod: 'stripe',
          paymentPlan: bookingData.paymentPlan || 'full_online',
        },
        user,
        ip
      )
    } else if (bookingId) {
      booking = await Booking.findById(bookingId)
      if (!booking) {
        const error = new Error('Booking not found.')
        error.statusCode = 404
        error.code = 'BOOKING_NOT_FOUND'
        throw error
      }

      if (booking.user.toString() !== user._id.toString()) {
        const error = new Error('You are not authorized to pay for another customer\'s booking.')
        error.statusCode = 403
        error.code = 'FORBIDDEN'
        throw error
      }

      if (booking.paymentStatus === 'paid') {
        const error = new Error('This booking is already paid.')
        error.statusCode = 400
        error.code = 'BOOKING_ALREADY_PAID'
        throw error
      }

      if (booking.status === 'cancelled') {
        const error = new Error('Cannot create payment session for a cancelled booking.')
        error.statusCode = 400
        error.code = 'BOOKING_CANCELLED'
        throw error
      }

      // Re-validate slot availability for payment retry
      const turfId = booking.turf?._id || booking.turf
      const slotConflicts = await SlotReservation.find({
        turf: turfId,
        date: booking.date,
        slotTime: { $in: booking.selectedSlots },
        status: 'active',
        booking: { $ne: booking._id },
      })

      if (slotConflicts.length > 0) {
        const error = new Error('One or more slots have been booked by another customer. Please select another slot.')
        error.statusCode = 409
        error.code = 'SLOT_UNAVAILABLE'
        throw error
      }

      // Re-secure slot reservations for this booking with refreshed 15-minute hold
      for (const slotTime of booking.selectedSlots) {
        await SlotReservation.findOneAndUpdate(
          { turf: turfId, date: booking.date, slotTime, booking: booking._id },
          { $set: { status: 'active' } },
          { upsert: true }
        )
      }
      booking.status = 'pending'
      booking.paymentStatus = 'pending'
      booking.paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
    } else {
      const error = new Error('Either bookingData or bookingId is required.')
      error.statusCode = 400
      error.code = 'INVALID_PAYMENT_REQUEST'
      throw error
    }

    const stripe = this.getStripeClient()
    const currency = (env.STRIPE_CURRENCY || 'inr').toLowerCase()

    const isPartialAdvance = booking.paymentPlan === 'partial_advance'
    const chargeAmount = isPartialAdvance
      ? (booking.advanceAmount || Math.round((booking.totalAmount * (booking.advancePercentage || 20)) / 100))
      : booking.totalAmount

    // Validate that amount is an integer > 0
    if (!Number.isInteger(chargeAmount) || chargeAmount <= 0) {
      const error = new Error('Invalid booking payment amount for Stripe checkout.')
      error.statusCode = 400
      error.code = 'INVALID_AMOUNT'
      throw error
    }

    // Determine authoritative client base URL for redirects (detect actual client origin)
    const candidateOrigin = (bookingData?.clientUrl || clientOrigin || '').trim().replace(/\/$/, '')
    let baseUrl = null

    if (candidateOrigin) {
      try {
        const parsed = new URL(candidateOrigin)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          const originOnly = parsed.origin
          const isLocal = originOnly.includes('localhost') || originOnly.includes('127.0.0.1')
          const isAllowedDomain =
            originOnly === env.CLIENT_URL?.replace(/\/$/, '') ||
            originOnly.endsWith('.onrender.com') ||
            originOnly.endsWith('.vercel.app') ||
            originOnly.endsWith('.netlify.app') ||
            originOnly.endsWith('.pages.dev') ||
            originOnly.endsWith('.web.app') ||
            (parsed.protocol === 'https:' && !isLocal)

          if (isAllowedDomain || isLocal) {
            baseUrl = originOnly
          }
        }
      } catch {
        // Fallback to configured CLIENT_URL
      }
    }

    if (!baseUrl) {
      baseUrl = (env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/$/, '')
    }

    const customerEmail = booking.contactDetails?.email || user.email || 'customer@example.com'
    const successUrl = `${baseUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`
    const cancelUrl = `${baseUrl}/?payment_cancelled=true&booking_id=${booking._id}`

    // Minimum checkout session expiry supported by Stripe is 30 minutes (1800 seconds)
    const expiresAt = Math.floor(Date.now() / 1000) + 1800

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        client_reference_id: booking._id.toString(),
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: isPartialAdvance
                  ? `Turf Booking Advance (${booking.advancePercentage || 20}%): ${booking.bookingId}`
                  : `Turf Arena Booking: ${booking.bookingId}`,
                description: isPartialAdvance
                  ? `Partial advance payment of ₹${(chargeAmount / 100).toFixed(2)} on ${booking.date} (${booking.startTime} - ${booking.endTime}). Remaining ₹${((booking.remainingAmount || booking.totalAmount - chargeAmount) / 100).toFixed(2)} payable at venue counter.`
                  : `Slot reservation on ${booking.date} (${booking.startTime} - ${booking.endTime})`,
              },
              unit_amount: chargeAmount, // Integer paise
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          userId: user._id.toString(),
          paymentPlan: booking.paymentPlan || 'full_online',
          chargeAmount: String(chargeAmount),
          advanceAmount: String(booking.advanceAmount || chargeAmount),
          remainingAmount: String(booking.remainingAmount || (booking.totalAmount - chargeAmount)),
          totalAmount: String(booking.totalAmount),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: expiresAt,
      },
      {
        idempotencyKey: `cs_${booking._id}_${chargeAmount}`,
      }
    )

    booking.stripeCheckoutSessionId = session.id
    booking.amountDue = booking.totalAmount
    booking.paymentMethod = 'stripe'
    booking.paymentStatus = 'pending'
    booking.paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15-minute slot lock
    await booking.save()

    // Record or update payment transaction ledger
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        $set: {
          paymentId: `PAY-${booking.bookingId}`,
          booking: booking._id,
          bookingReference: booking.bookingId,
          user: booking.user,
          turf: booking.turf,
          amount: chargeAmount,
          currency: currency.toUpperCase(),
          paymentMethod: 'stripe',
          status: 'pending',
          stripeCheckoutSessionId: session.id,
        },
      },
      { upsert: true, new: true }
    ).catch(() => {})

    return {
      sessionId: session.id,
      url: session.url,
      bookingId: booking._id,
      bookingReference: booking.bookingId,
      paymentPlan: booking.paymentPlan || 'full_online',
      chargeAmount,
      advanceAmount: booking.advanceAmount || chargeAmount,
      remainingAmount: booking.remainingAmount || (booking.totalAmount - chargeAmount),
      totalAmount: booking.totalAmount,
    }
  },

  /**
   * Retrieve and verify the real-time Stripe payment status of a booking.
   * Client-supplied redirects are NEVER trusted; actual status is verified with Stripe.
   * Supports authentication via user session OR cryptographic Stripe session_id proof.
   */
  async verifyAndGetPaymentStatus(bookingId, user, sessionId = null) {
    let booking = null
    const populateFields = [
      { path: 'turf', select: 'name slug address images contactPhone contactEmail' },
      { path: 'sport', select: 'name slug icon' },
      { path: 'user', select: 'name email phone' },
    ]

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findById(bookingId).populate(populateFields)
    }

    if (!booking && bookingId && bookingId !== 'session') {
      booking = await Booking.findOne({
        $or: [{ bookingId: bookingId }, { stripeCheckoutSessionId: bookingId }],
      }).populate(populateFields)
    }

    if (!booking && sessionId) {
      booking = await Booking.findOne({ stripeCheckoutSessionId: sessionId }).populate(populateFields)
    }

    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const bookingUserId = booking.user?._id ? booking.user._id.toString() : booking.user?.toString()
    const isOwner = user && user._id && bookingUserId === user._id.toString()
    const isAdmin = user && user.role === 'admin'
    const hasValidSessionProof =
      sessionId && booking.stripeCheckoutSessionId && sessionId === booking.stripeCheckoutSessionId

    if (!isOwner && !isAdmin && !hasValidSessionProof) {
      if (!user) {
        const error = new Error('Authentication required.')
        error.statusCode = 401
        error.code = 'UNAUTHENTICATED'
        throw error
      } else {
        const error = new Error('You are not authorized to view this booking.')
        error.statusCode = 403
        error.code = 'FORBIDDEN'
        throw error
      }
    }

    // If already marked paid or partially_paid, return authoritative record
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partially_paid') {
      return {
        paymentStatus: booking.paymentStatus,
        booking,
      }
    }

    // If Stripe session exists and Stripe is enabled, verify directly with Stripe
    if (booking.stripeCheckoutSessionId && this.isEnabled()) {
      try {
        const stripe = this.getStripeClient()
        const session = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId)

        if (session.payment_status === 'paid') {
          // If booking was already cancelled, do not revive it as confirmed!
          if (booking.status === 'cancelled') {
            booking.paymentStatus = 'paid'
            booking.amountPaid = session.amount_total
            booking.amountDue = 0
            booking.paidAt = new Date()
            booking.stripePaymentIntentId = session.payment_intent
            booking.paymentNotes =
              booking.paymentNotes ||
              'Payment received after booking was cancelled. Requires refund.'
            await booking.save()

            await Payment.findOneAndUpdate(
              { booking: booking._id },
              {
                $set: {
                  status: 'paid',
                  amount: session.amount_total,
                  stripePaymentIntentId: session.payment_intent,
                  paidAt: booking.paidAt,
                  notes: booking.paymentNotes,
                },
              }
            ).catch(() => {})

            return {
              paymentStatus: 'paid',
              booking,
              slotConflict: true,
              message: 'Payment received, but booking was cancelled. Our team will issue a refund.',
            }
          }

          // Late-Payment & Slot Safety: Check if slot was reassigned to another customer
          const slotConflict = await SlotReservation.findOne({
            turf: booking.turf._id || booking.turf,
            date: booking.date,
            slotTime: { $in: booking.selectedSlots },
            status: 'active',
            booking: { $ne: booking._id },
          })

          if (slotConflict) {
            // Slot was occupied by another customer while pending/expired!
            // Never silently double-book; flag for manual review / refund.
            booking.status = 'cancelled'
            booking.paymentStatus = 'paid'
            booking.amountPaid = session.amount_total
            booking.amountDue = 0
            booking.paidAt = new Date()
            booking.stripePaymentIntentId = session.payment_intent
            booking.paymentNotes = 'Payment received after slot release; slot reallocated to another customer. Requires refund.'
            await booking.save()

            await Payment.findOneAndUpdate(
              { booking: booking._id },
              {
                $set: {
                  status: 'paid',
                  amount: session.amount_total,
                  stripePaymentIntentId: session.payment_intent,
                  paidAt: booking.paidAt,
                  notes: booking.paymentNotes,
                },
              }
            ).catch(() => {})

            return {
              paymentStatus: 'paid',
              booking,
              slotConflict: true,
              message: 'Payment received, but slot was reallocated. Our team will issue a full refund.',
            }
          }

          // Slot is available: Confirm booking and update payment status
          const isPartialAdvance = booking.paymentPlan === 'partial_advance'
          booking.status = 'confirmed'
          booking.paymentStatus = isPartialAdvance ? 'partially_paid' : 'paid'
          booking.amountPaid = session.amount_total
          booking.amountDue = Math.max(0, booking.totalAmount - session.amount_total)
          booking.paidAt = new Date()
          booking.stripePaymentIntentId = session.payment_intent
          await booking.save()

          // Ensure slot reservations are active and broadcast update
          await SlotReservation.updateMany({ booking: booking._id }, { status: 'active' })
          broadcastAvailabilityUpdate({ turfId: booking.turf._id || booking.turf, date: booking.date, reason: 'booking_confirmed' })

          await Payment.findOneAndUpdate(
            { booking: booking._id },
            {
              $set: {
                paymentId: `PAY-${booking.bookingId}`,
                booking: booking._id,
                bookingReference: booking.bookingId,
                user: booking.user,
                turf: booking.turf,
                amount: session.amount_total,
                currency: (session.currency || 'INR').toUpperCase(),
                paymentMethod: 'stripe',
                status: isPartialAdvance ? 'partially_paid' : 'paid',
                stripePaymentIntentId: session.payment_intent,
                paidAt: booking.paidAt,
              },
            },
            { upsert: true, new: true }
          ).catch(() => {})

          return {
            paymentStatus: booking.paymentStatus,
            booking,
          }
        }

        if (session.status === 'expired') {
          // Session expired: release reservations safely
          booking.paymentStatus = 'failed'
          booking.status = 'cancelled'
          booking.paymentFailureReason = 'Stripe checkout session expired'
          await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
          if (booking.coupon?.couponId) {
            await couponService.releaseRedemption(booking._id)
          }
          await booking.save()
          await Payment.findOneAndUpdate(
            { booking: booking._id },
            { $set: { status: 'failed', failureReason: 'Stripe checkout session expired' } }
          ).catch(() => {})
          broadcastAvailabilityUpdate({ turfId: booking.turf._id || booking.turf, date: booking.date, reason: 'booking_cancelled' })

          return {
            paymentStatus: 'failed',
            booking,
          }
        }
      } catch (err) {
        // Log error and fall back to current database status
      }
    }

    return {
      paymentStatus: booking.paymentStatus,
      booking,
    }
  },

  /**
   * Process verified Stripe webhook events with strict signature verification
   * and event ID idempotency
   */
  async handleWebhookEvent(rawBody, signature) {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      const error = new Error('Stripe webhook secret is not configured.')
      error.statusCode = 400
      error.code = 'STRIPE_WEBHOOK_NOT_CONFIGURED'
      throw error
    }

    if (!signature) {
      const error = new Error('Stripe signature header is missing.')
      error.statusCode = 400
      error.code = 'STRIPE_SIGNATURE_MISSING'
      throw error
    }

    const stripe = this.getStripeClient()
    let event = null

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      const error = new Error(`Webhook signature verification failed: ${err.message}`)
      error.statusCode = 400
      error.code = 'STRIPE_WEBHOOK_SIGNATURE_INVALID'
      throw error
    }

    // Idempotency check: Ignore duplicate delivery
    const existingEvent = await StripeEvent.findOne({ eventId: event.id })
    if (existingEvent) {
      return { received: true, duplicate: true }
    }

    // Record processed event ID
    await StripeEvent.create({
      eventId: event.id,
      type: event.type,
      data: event.data?.object || {},
    })

    // Process event types
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        if (session.payment_status === 'paid') {
          const bookingId = session.client_reference_id || session.metadata?.bookingId
          if (bookingId) {
            const booking = await Booking.findById(bookingId)
            if (booking && booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'partially_paid') {
              // Verify amount & currency
              const expectedCurrency = (env.STRIPE_CURRENCY || 'inr').toLowerCase()
              if (session.currency && session.currency.toLowerCase() !== expectedCurrency) {
                booking.paymentStatus = 'failed'
                booking.paymentFailureReason = `Currency mismatch: expected ${expectedCurrency}, got ${session.currency}`
                await booking.save()
                await Payment.findOneAndUpdate(
                  { booking: booking._id },
                  { $set: { status: 'failed', failureReason: booking.paymentFailureReason } }
                ).catch(() => {})
                break
              }
              const isPartialAdvance = booking.paymentPlan === 'partial_advance'
              const expectedAmount = isPartialAdvance
                ? (booking.advanceAmount || Math.round((booking.totalAmount * (booking.advancePercentage || 20)) / 100))
                : booking.totalAmount

              if (typeof session.amount_total === 'number' && session.amount_total < expectedAmount) {
                booking.paymentStatus = 'failed'
                booking.paymentFailureReason = `Amount mismatch: expected ${expectedAmount}, paid ${session.amount_total}`
                await booking.save()
                await Payment.findOneAndUpdate(
                  { booking: booking._id },
                  { $set: { status: 'failed', failureReason: booking.paymentFailureReason } }
                ).catch(() => {})
                break
              }

              // If booking was already cancelled, do not revive it as confirmed!
              if (booking.status === 'cancelled') {
                booking.paymentStatus = 'paid'
                booking.amountPaid = session.amount_total
                booking.amountDue = 0
                booking.paidAt = new Date()
                booking.stripePaymentIntentId = session.payment_intent
                booking.paymentNotes =
                  booking.paymentNotes ||
                  'Payment received after slot release; slot reallocated to another customer. Requires refund.'
                await booking.save()

                await Payment.findOneAndUpdate(
                  { booking: booking._id },
                  {
                    $set: {
                      status: 'paid',
                      amount: session.amount_total,
                      stripePaymentIntentId: session.payment_intent,
                      paidAt: booking.paidAt,
                      notes: booking.paymentNotes,
                    },
                  }
                ).catch(() => {})
                break
              }

              // Check slot conflict before confirming
              const slotConflict = await SlotReservation.findOne({
                turf: booking.turf?._id || booking.turf,
                date: booking.date,
                slotTime: { $in: booking.selectedSlots },
                status: 'active',
                booking: { $ne: booking._id },
              })

              if (slotConflict) {
                booking.status = 'cancelled'
                booking.paymentStatus = 'paid'
                booking.amountPaid = session.amount_total
                booking.amountDue = 0
                booking.paidAt = new Date()
                booking.stripePaymentIntentId = session.payment_intent
                booking.paymentNotes = 'Payment received after slot release; slot reallocated to another customer. Requires refund.'
                await booking.save()

                await Payment.findOneAndUpdate(
                  { booking: booking._id },
                  {
                    $set: {
                      status: 'paid',
                      amount: session.amount_total,
                      stripePaymentIntentId: session.payment_intent,
                      paidAt: booking.paidAt,
                      notes: booking.paymentNotes,
                    },
                  }
                ).catch(() => {})
              } else {
                booking.status = 'confirmed'
                booking.paymentStatus = isPartialAdvance ? 'partially_paid' : 'paid'
                booking.amountPaid = session.amount_total
                booking.amountDue = Math.max(0, booking.totalAmount - session.amount_total)
                booking.paidAt = new Date()
                booking.stripePaymentIntentId = session.payment_intent
                await booking.save()
                await SlotReservation.updateMany({ booking: booking._id }, { status: 'active' })
                broadcastAvailabilityUpdate({ turfId: booking.turf?._id || booking.turf, date: booking.date, reason: 'booking_confirmed' })

                await Payment.findOneAndUpdate(
                  { booking: booking._id },
                  {
                    $set: {
                      paymentId: `PAY-${booking.bookingId}`,
                      booking: booking._id,
                      bookingReference: booking.bookingId,
                      user: booking.user,
                      turf: booking.turf,
                      amount: session.amount_total,
                      currency: (session.currency || 'INR').toUpperCase(),
                      paymentMethod: 'stripe',
                      status: isPartialAdvance ? 'partially_paid' : 'paid',
                      stripePaymentIntentId: session.payment_intent,
                      paidAt: booking.paidAt,
                    },
                  },
                  { upsert: true, new: true }
                ).catch(() => {})
              }
            }
          }
        }
        break
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object
        const bookingId = session.client_reference_id || session.metadata?.bookingId
        if (bookingId) {
          const booking = await Booking.findById(bookingId)
          if (booking && booking.paymentStatus !== 'paid') {
            booking.paymentStatus = 'failed'
            booking.status = 'cancelled'
            booking.paymentFailureReason =
              event.type === 'checkout.session.expired'
                ? 'Stripe checkout session expired'
                : 'Stripe asynchronous payment failed'
            await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
            if (booking.coupon?.couponId) {
              await couponService.releaseRedemption(booking._id)
            }
            await booking.save()
            await Payment.findOneAndUpdate(
              { booking: booking._id },
              { $set: { status: 'failed', failureReason: booking.paymentFailureReason } }
            ).catch(() => {})
            broadcastAvailabilityUpdate({ turfId: booking.turf?._id || booking.turf, date: booking.date, reason: 'booking_cancelled' })
          }
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object
        const paymentIntentId = charge.payment_intent
        if (paymentIntentId) {
          const booking = await Booking.findOne({
            $or: [
              { stripePaymentIntentId: paymentIntentId },
              { stripeRefundId: charge.id },
            ],
          })
          if (booking) {
            const isFull = charge.refunded === true || charge.amount_refunded >= (booking.amountPaid || booking.totalAmount)
            booking.refundAmount = charge.amount_refunded
            booking.refundStatus = isFull ? 'succeeded' : 'partially_refunded'
            booking.paymentStatus = isFull ? 'refunded' : 'paid'
            booking.refundedAt = new Date()
            booking.refundFailureReason = ''
            await booking.save()

            await Payment.findOneAndUpdate(
              { booking: booking._id },
              {
                $set: {
                  status: booking.paymentStatus,
                  stripeRefundId: charge.id,
                  refundedAt: booking.refundedAt,
                },
              }
            ).catch(() => {})
          }
        }
        break
      }

      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data.object
        const bookingId = refund.metadata?.bookingId
        let booking = null
        if (bookingId) {
          booking = await Booking.findById(bookingId)
        }
        if (!booking && refund.payment_intent) {
          booking = await Booking.findOne({ stripePaymentIntentId: refund.payment_intent })
        }
        if (!booking && refund.id) {
          booking = await Booking.findOne({ stripeRefundId: refund.id })
        }

        if (booking) {
          booking.stripeRefundId = refund.id
          if (refund.status === 'succeeded') {
            const isFull = refund.amount >= (booking.amountPaid || booking.totalAmount)
            booking.refundAmount = refund.amount
            booking.refundStatus = isFull ? 'succeeded' : 'partially_refunded'
            booking.paymentStatus = isFull ? 'refunded' : 'paid'
            booking.refundedAt = new Date()
            booking.refundFailureReason = ''
          } else if (refund.status === 'failed') {
            booking.refundStatus = 'failed'
            booking.refundFailureReason = refund.failure_reason || 'Refund failed by Stripe'
          } else if (refund.status === 'pending') {
            booking.refundStatus = 'pending'
          }
          await booking.save()

          await Payment.findOneAndUpdate(
            { booking: booking._id },
            {
              $set: {
                status: booking.paymentStatus,
                stripeRefundId: refund.id,
                refundedAt: booking.refundedAt || null,
                failureReason: booking.refundFailureReason || '',
              },
            }
          ).catch(() => {})
        }
        break
      }

      case 'refund.failed': {
        const refund = event.data.object
        const bookingId = refund.metadata?.bookingId
        let booking = null
        if (bookingId) {
          booking = await Booking.findById(bookingId)
        }
        if (!booking && refund.payment_intent) {
          booking = await Booking.findOne({ stripePaymentIntentId: refund.payment_intent })
        }
        if (!booking && refund.id) {
          booking = await Booking.findOne({ stripeRefundId: refund.id })
        }

        if (booking) {
          booking.refundStatus = 'failed'
          booking.refundFailureReason = refund.failure_reason || 'Refund failed by Stripe'
          await booking.save()

          await Payment.findOneAndUpdate(
            { booking: booking._id },
            {
              $set: {
                failureReason: booking.refundFailureReason || '',
              },
            }
          ).catch(() => {})
        }
        break
      }

      default:
        // Ignore unhandled event types safely
        break
    }

    return { received: true }
  },

  /**
   * Safe cancellation of a pending Stripe booking when the user cancels from checkout
   */
  async cancelPendingBooking(bookingId, user, sessionId = null) {
    let booking = null
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findById(bookingId)
    }
    if (!booking && bookingId && bookingId !== 'session') {
      booking = await Booking.findOne({
        $or: [{ bookingId }, { stripeCheckoutSessionId: bookingId }],
      })
    }
    if (!booking && sessionId) {
      booking = await Booking.findOne({ stripeCheckoutSessionId: sessionId })
    }

    if (!booking) {
      const error = new Error('Booking not found.')
      error.statusCode = 404
      error.code = 'BOOKING_NOT_FOUND'
      throw error
    }

    const bookingUserId = booking.user?._id ? booking.user._id.toString() : booking.user?.toString()
    const isOwner = user && user._id && bookingUserId === user._id.toString()
    const hasValidSessionProof =
      sessionId && booking.stripeCheckoutSessionId && sessionId === booking.stripeCheckoutSessionId

    if (!isOwner && !hasValidSessionProof) {
      if (!user) {
        const error = new Error('Authentication required.')
        error.statusCode = 401
        error.code = 'UNAUTHENTICATED'
        throw error
      } else {
        const error = new Error('You are not authorized to cancel this booking.')
        error.statusCode = 403
        error.code = 'FORBIDDEN'
        throw error
      }
    }

    // Only cancel if not already paid
    if (booking.paymentStatus === 'pending' || booking.status === 'pending') {
      booking.status = 'cancelled'
      booking.paymentStatus = 'failed'
      booking.cancellationReason = 'Cancelled by customer on Stripe checkout page'
      booking.cancelledAt = new Date()
      booking.cancelledBy = { user: user._id, role: 'customer' }
      await SlotReservation.updateMany({ booking: booking._id }, { status: 'released' })
      if (booking.coupon?.couponId) {
        await couponService.releaseRedemption(booking._id)
      }
      await booking.save()
      await Payment.findOneAndUpdate(
        { booking: booking._id },
        { $set: { status: 'failed', failureReason: 'Cancelled by customer on Stripe checkout page' } }
      ).catch(() => {})
      broadcastAvailabilityUpdate({ turfId: booking.turf, date: booking.date, reason: 'booking_cancelled' })
    }

    return { success: true, booking }
  },

  /**
   * Process a Stripe refund for an eligible paid booking.
   * Ensures idempotency, authoritative calculation, non-exceedance of collected amount,
   * and tracks complete refund lifecycle.
   */
  async processStripeRefund({
    booking,
    refundAmountPaise,
    requestingUser,
    reason = '',
    idempotencyKey = null,
  }) {
    if (!this.isEnabled()) {
      const error = new Error('Stripe payment processing is not enabled.')
      error.statusCode = 400
      error.code = 'STRIPE_NOT_ENABLED'
      throw error
    }

    if (!booking) {
      const error = new Error('Booking is required for refund processing.')
      error.statusCode = 400
      error.code = 'INVALID_BOOKING'
      throw error
    }

    if (booking.paymentMethod !== 'stripe' && !booking.stripePaymentIntentId) {
      const error = new Error('Only Stripe online payments can be refunded via Stripe.')
      error.statusCode = 400
      error.code = 'INVALID_PAYMENT_METHOD_FOR_STRIPE_REFUND'
      throw error
    }

    if (
      booking.paymentStatus !== 'paid' &&
      booking.paymentStatus !== 'partially_paid' &&
      booking.paymentStatus !== 'refunded' &&
      booking.paymentStatus !== 'partially_refunded'
    ) {
      const error = new Error('Cannot process refund for an unpaid booking.')
      error.statusCode = 400
      error.code = 'BOOKING_NOT_PAID'
      throw error
    }

    // Never refund more than collected
    const collectedAmount = booking.amountPaid || 0
    if (!Number.isInteger(refundAmountPaise) || refundAmountPaise <= 0) {
      const error = new Error('Refund amount must be a positive integer in paise.')
      error.statusCode = 400
      error.code = 'INVALID_REFUND_AMOUNT'
      throw error
    }

    const currentRefunded = booking.refundAmount || 0
    if (currentRefunded + refundAmountPaise > collectedAmount) {
      const error = new Error('Total refunded amount cannot exceed original collected payment.')
      error.statusCode = 400
      error.code = 'REFUND_EXCEEDS_PAYMENT'
      throw error
    }

    // Resolve Stripe payment intent ID
    let paymentIntentId = booking.stripePaymentIntentId
    const stripe = this.getStripeClient()

    if (!paymentIntentId && booking.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId)
        if (session.payment_intent) {
          paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent.id
          booking.stripePaymentIntentId = paymentIntentId
        }
      } catch (err) {
        // Will throw below if still unresolved
      }
    }

    if (!paymentIntentId) {
      const error = new Error(
        'No Stripe payment intent found for this booking. Refund cannot be initiated automatically.'
      )
      error.statusCode = 400
      error.code = 'PAYMENT_INTENT_NOT_FOUND'
      throw error
    }

    const stableKey =
      idempotencyKey ||
      `refund_${booking._id}_${refundAmountPaise}_${booking.cancellationHistory?.length || 0}`

    const previousRefundStatus = booking.refundStatus
    booking.refundStatus = 'processing'

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: refundAmountPaise,
          reason: 'requested_by_customer',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            initiatedBy: requestingUser?.role || 'system',
            initiatedByUserId: requestingUser?._id?.toString() || '',
            reason: reason || 'Booking cancellation refund',
          },
        },
        { idempotencyKey: stableKey }
      )

      booking.stripeRefundId = refund.id
      booking.refundRetriedAt = new Date()

      if (refund.status === 'succeeded') {
        const totalRefundedNow = (booking.refundAmount || 0) + refundAmountPaise
        booking.refundAmount = totalRefundedNow
        booking.refundStatus = totalRefundedNow >= collectedAmount ? 'succeeded' : 'partially_refunded'
        booking.paymentStatus = totalRefundedNow >= collectedAmount ? 'refunded' : 'paid'
        booking.refundedAt = new Date()
        booking.refundFailureReason = ''
      } else if (refund.status === 'pending') {
        booking.refundStatus = 'pending'
        booking.refundAmount = refundAmountPaise
        booking.refundFailureReason = ''
      } else if (refund.status === 'failed') {
        booking.refundStatus = 'failed'
        booking.refundFailureReason = refund.failure_reason || 'Refund failed by Stripe'
      }

      if (!Array.isArray(booking.cancellationHistory)) {
        booking.cancellationHistory = []
      }

      booking.cancellationHistory.push({
        action:
          refund.status === 'succeeded'
            ? 'refund_succeeded'
            : refund.status === 'failed'
            ? 'refund_failed'
            : 'refund_initiated',
        performedBy: {
          user: requestingUser?._id,
          role: requestingUser?.role || 'system',
        },
        timestamp: new Date(),
        previousRefundStatus,
        newRefundStatus: booking.refundStatus,
        amount: refundAmountPaise,
        stripeRefundId: refund.id,
        reason: reason || 'Booking cancellation refund',
        failureReason: booking.refundFailureReason || undefined,
      })

      await booking.save()

      await Payment.findOneAndUpdate(
        { booking: booking._id },
        {
          $set: {
            paymentId: `PAY-${booking.bookingId}`,
            booking: booking._id,
            bookingReference: booking.bookingId,
            user: booking.user,
            turf: booking.turf,
            amount: booking.totalAmount,
            currency: 'INR',
            paymentMethod: booking.paymentMethod || 'stripe',
            status: booking.paymentStatus,
            stripeRefundId: refund?.id,
            refundedAt: booking.refundedAt || null,
            failureReason: booking.refundFailureReason || '',
          },
        },
        { upsert: true, new: true }
      ).catch(() => {})

      return {
        success: refund.status !== 'failed',
        refund,
        booking,
      }
    } catch (stripeErr) {
      booking.refundStatus = 'failed'
      booking.refundFailureReason = stripeErr.message || 'Stripe API call failed'
      if (!Array.isArray(booking.cancellationHistory)) {
        booking.cancellationHistory = []
      }
      booking.cancellationHistory.push({
        action: 'refund_failed',
        performedBy: {
          user: requestingUser?._id,
          role: requestingUser?.role || 'system',
        },
        timestamp: new Date(),
        previousRefundStatus,
        newRefundStatus: 'failed',
        amount: refundAmountPaise,
        reason: reason || 'Booking cancellation refund',
        failureReason: stripeErr.message || 'Stripe error',
      })
      await booking.save()

      await Payment.findOneAndUpdate(
        { booking: booking._id },
        {
          $set: {
            failureReason: booking.refundFailureReason || 'Stripe API call failed',
          },
        }
      ).catch(() => {})

      return {
        success: false,
        error: stripeErr.message,
        booking,
      }
    }
  },
}

export default stripeService
