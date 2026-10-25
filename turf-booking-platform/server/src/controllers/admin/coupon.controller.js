import couponService from '../../services/coupon.service.js'
import { logAudit } from '../../utils/auditLogger.js'

export const listCoupons = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query
    const result = await couponService.listCoupons({ page, limit, search, status })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params
    const coupon = await couponService.getCouponById(id)

    res.status(200).json({
      success: true,
      data: { coupon },
    })
  } catch (error) {
    next(error)
  }
}

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user)

    await logAudit({
      actorId: req.user._id,
      action: 'COUPON_CREATED',
      entityType: 'Coupon',
      entityId: coupon._id,
      details: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
      ip: req.ip,
    })

    res.status(201).json({
      success: true,
      data: { coupon },
      message: `Coupon "${coupon.code}" created successfully.`,
    })
  } catch (error) {
    next(error)
  }
}

export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params
    const coupon = await couponService.updateCoupon(id, req.body)

    await logAudit({
      actorId: req.user._id,
      action: 'COUPON_UPDATED',
      entityType: 'Coupon',
      entityId: coupon._id,
      details: { code: coupon.code, updates: req.body },
      ip: req.ip,
    })

    res.status(200).json({
      success: true,
      data: { coupon },
      message: `Coupon "${coupon.code}" updated successfully.`,
    })
  } catch (error) {
    next(error)
  }
}

export const toggleCouponStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { isActive } = req.body
    const coupon = await couponService.toggleCouponStatus(id, isActive)

    await logAudit({
      actorId: req.user._id,
      action: 'COUPON_STATUS_TOGGLED',
      entityType: 'Coupon',
      entityId: coupon._id,
      details: { code: coupon.code, isActive: coupon.isActive },
      ip: req.ip,
    })

    res.status(200).json({
      success: true,
      data: { coupon },
      message: `Coupon "${coupon.code}" ${coupon.isActive ? 'activated' : 'deactivated'} successfully.`,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await couponService.deleteCoupon(id)

    await logAudit({
      actorId: req.user._id,
      action: 'COUPON_DELETED',
      entityType: 'Coupon',
      entityId: id,
      details: result,
      ip: req.ip,
    })

    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}
