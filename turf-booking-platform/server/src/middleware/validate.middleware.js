import { validationResult } from 'express-validator'

/**
 * Middleware to check express-validator validation results
 * Returns standardized 400 response if any validation rules fail.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const errorList = errors.array()

    return res.status(400).json({
      success: false,
      error: {
        message: errorList[0].msg,
        code: 'VALIDATION_ERROR',
        details: errorList.map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      },
    })
  }

  next()
}
