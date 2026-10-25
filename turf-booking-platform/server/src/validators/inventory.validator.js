import { body, query } from 'express-validator'

export const createSportValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Sport name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Sport name must be between 2 and 50 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be in lowercase alphanumeric hyphenated format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('image').optional().trim(),
  body('icon').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const updateSportValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Sport name must be between 2 and 50 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be in lowercase alphanumeric hyphenated format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const createTurfValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Turf name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Turf name must be between 2 and 100 characters'),
  body('slug')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be in lowercase alphanumeric hyphenated format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('sports')
    .isArray({ min: 1 })
    .withMessage('Turf must support at least one sport reference'),
  body('address.street')
    .if((value, { req }) => !req.body.isDraft)
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .if((value, { req }) => !req.body.isDraft)
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .if((value, { req }) => !req.body.isDraft)
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.zipCode')
    .if((value, { req }) => !req.body.isDraft)
    .trim()
    .notEmpty()
    .withMessage('Postal/Zip code is required'),
  body('capacity.minPlayers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum players must be at least 1'),
  body('capacity.maxPlayers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum players must be at least 1'),
  body('openingHours.open')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Opening time must be in HH:mm 24-hour format'),
  body('openingHours.close')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Closing time must be in HH:mm 24-hour format'),
  body('pricing.baseRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base rate must be a non-negative integer represented in paise'),
  body('pricing.peakRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Peak rate must be a non-negative integer represented in paise'),
  body('pricing.weekendRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Weekend rate must be a non-negative integer represented in paise'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isDraft').optional().isBoolean().withMessage('isDraft must be a boolean'),
]

export const updateTurfValidator = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Turf name must be between 2 and 100 characters'),
  body('slug')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must be in lowercase alphanumeric hyphenated format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('sports')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Turf must support at least one sport reference'),
  body('address.street')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Street address cannot be empty'),
  body('address.city')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),
  body('address.state')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty'),
  body('address.zipCode')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Postal/Zip code cannot be empty'),
  body('capacity.minPlayers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum players must be at least 1'),
  body('capacity.maxPlayers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum players must be at least 1'),
  body('openingHours.open')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Opening time must be in HH:mm 24-hour format'),
  body('openingHours.close')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Closing time must be in HH:mm 24-hour format'),
  body('pricing.baseRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base rate must be a non-negative integer represented in paise'),
  body('pricing.peakRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Peak rate must be a non-negative integer represented in paise'),
  body('pricing.weekendRate')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Weekend rate must be a non-negative integer represented in paise'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isDraft').optional().isBoolean().withMessage('isDraft must be a boolean'),
]

export const createAddOnValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Add-on name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Add-on name must be between 2 and 80 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isInt({ min: 0 })
    .withMessage('Price must be an integer represented in paise'),
  body('pricingUnit')
    .isIn(['per_booking', 'per_hour', 'per_player'])
    .withMessage('Pricing unit must be per_booking, per_hour, or per_player'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const updateAddOnValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Add-on name must be between 2 and 80 characters'),
  body('price')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Price must be an integer represented in paise'),
  body('pricingUnit')
    .optional()
    .isIn(['per_booking', 'per_hour', 'per_player'])
    .withMessage('Pricing unit must be per_booking, per_hour, or per_player'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const createBannerValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Banner title is required')
    .isLength({ max: 120 })
    .withMessage('Banner title cannot exceed 120 characters'),
  body('image')
    .trim()
    .notEmpty()
    .withMessage('Banner image URL is required'),
  body('order')
    .optional()
    .isInt()
    .withMessage('Order must be an integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const updateBannerValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Banner title cannot exceed 120 characters'),
  body('order')
    .optional()
    .isInt()
    .withMessage('Order must be an integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
]

export const updateSettingsValidator = [
  body('supportEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Support email must be a valid email address'),
  body('taxSettings.taxRatePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate percentage must be between 0 and 100'),
  body('bookingRules.slotDurationMinutes')
    .optional()
    .isInt({ min: 15 })
    .withMessage('Slot duration must be at least 15 minutes'),
]
