import { body, query, param } from 'express-validator'

/**
 * Validator for creating a new booking
 */
export const createBookingValidator = [
  body('turfId')
    .notEmpty()
    .withMessage('Turf arena ID is required')
    .isMongoId()
    .withMessage('Turf ID must be a valid MongoDB ObjectId'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:mm 24-hour format'),
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:mm 24-hour format'),
  body('sportId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Sport ID must be a valid MongoDB ObjectId'),
  body('addOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),
  body('addOns.*.addOn')
    .optional()
    .isMongoId()
    .withMessage('AddOn ID must be a valid MongoDB ObjectId'),
  body('addOns.*.quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('AddOn quantity must be an integer between 1 and 100'),
  body('playerCount')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Player count must be an integer between 1 and 100'),
  body('paymentMethod')
    .optional()
    .isString()
    .isIn(['Pay at Venue', 'stripe'])
    .withMessage('Payment method must be either "Pay at Venue" or "stripe"'),
  body('paymentPlan')
    .optional()
    .isString()
    .isIn(['full_online', 'partial_advance'])
    .withMessage('Payment plan must be "full_online" or "partial_advance"'),
  body('idempotencyKey')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Idempotency key cannot exceed 100 characters'),
  body('contactDetails.name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact name cannot exceed 100 characters'),
  body('contactDetails.email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid contact email')
    .normalizeEmail(),
  body('contactDetails.phone')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Contact phone cannot exceed 20 characters'),
]

/**
 * Validator for slot availability queries
 */
export const getSlotsValidator = [
  query('turfId')
    .notEmpty()
    .withMessage('turfId query parameter is required')
    .isMongoId()
    .withMessage('turfId must be a valid MongoDB ObjectId'),
  query('date')
    .notEmpty()
    .withMessage('date query parameter is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),
]

/**
 * Validator for holding discrete slots
 */
export const holdSlotsValidator = [
  body('turfId')
    .notEmpty()
    .withMessage('turfId is required')
    .isMongoId()
    .withMessage('turfId must be a valid MongoDB ObjectId'),
  body('date')
    .notEmpty()
    .withMessage('date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),
  body('slots')
    .isArray({ min: 1 })
    .withMessage('slots must be a non-empty array of slot times'),
  body('slots.*')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Each slot must be in HH:mm 24-hour format'),
]

/**
 * Validator for cancelling a booking
 */
export const cancelBookingValidator = [
  body('cancellationReason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters'),
]

/**
 * Validator for admin recording payment
 */
export const recordPaymentValidator = [
  body('paymentMethod')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Payment method cannot exceed 50 characters'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('amount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Amount must be a non-negative integer in paise'),
]

