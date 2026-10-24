import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Booking } from '../models/Booking.js'
import { logAudit } from '../utils/auditLogger.js'

export const customerService = {
  /**
   * Aggregate customer platform analytics for the admin dashboard
   */
  async getCustomerAnalytics() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // 1. Core user counts
    const [
      totalRegistered,
      newThisMonth,
      newThisWeek,
      activeStatusCount,
      bookingAggregations,
      revenueAggregation,
      monthlySignups,
      topSpenders,
    ] = await Promise.all([
      // Total customers with customer role
      User.countDocuments({ role: 'customer' }),
      // Joined this calendar month
      User.countDocuments({ role: 'customer', createdAt: { $gte: startOfMonth } }),
      // Joined last 7 days
      User.countDocuments({ role: 'customer', createdAt: { $gte: sevenDaysAgo } }),
      // Active status count (account enabled)
      User.countDocuments({ role: 'customer', isActive: true }),

      // Aggregation of bookings per customer
      Booking.aggregate([
        {
          $group: {
            _id: '$user',
            bookingCount: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0],
              },
            },
            totalSpend: {
              $sum: {
                $cond: [{ $ne: ['$status', 'cancelled'] }, { $ifNull: ['$totalAmount', 0] }, 0],
              },
            },
            lastBookingDate: { $max: '$date' },
          },
        },
      ]),

      // Total revenue generated from all customer bookings
      Booking.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalBookings: { $sum: 1 },
            paidRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
              },
            },
          },
        },
      ]),

      // Monthly signups for last 6 months
      User.aggregate([
        {
          $match: {
            role: 'customer',
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Top customers by total spend
      Booking.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$user',
            totalSpent: { $sum: '$totalAmount' },
            bookingCount: { $sum: 1 },
            lastBookingDate: { $max: '$date' },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            email: '$user.email',
            phone: '$user.phone',
            isActive: '$user.isActive',
            totalSpent: 1,
            bookingCount: 1,
            lastBookingDate: 1,
          },
        },
      ]),
    ])

    // Derived customer engagement metrics
    const customersWithBookings = bookingAggregations.length
    const repeatCustomers = bookingAggregations.filter((b) => b.bookingCount >= 2).length
    const oneTimeCustomers = bookingAggregations.filter((b) => b.bookingCount === 1).length
    const inactiveCustomers = Math.max(0, totalRegistered - customersWithBookings)

    const revenueData = revenueAggregation[0] || {
      totalRevenue: 0,
      totalBookings: 0,
      paidRevenue: 0,
    }

    const avgSpendPerActiveCustomer =
      customersWithBookings > 0 ? Math.round(revenueData.totalRevenue / customersWithBookings) : 0

    const retentionRate =
      customersWithBookings > 0
        ? Math.round((repeatCustomers / customersWithBookings) * 100)
        : 0

    // Booking frequency distribution buckets
    const distribution = {
      zeroBookings: inactiveCustomers,
      oneBooking: oneTimeCustomers,
      twoToFive: bookingAggregations.filter((b) => b.bookingCount >= 2 && b.bookingCount <= 5).length,
      sixPlus: bookingAggregations.filter((b) => b.bookingCount >= 6).length,
    }

    // Format monthly signups into 6 consecutive month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const signupTrend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const label = `${monthNames[month - 1]} ${String(year).slice(-2)}`
      const match = monthlySignups.find((m) => m._id.year === year && m._id.month === month)
      signupTrend.push({
        label,
        count: match ? match.count : 0,
      })
    }

    return {
      overview: {
        totalRegistered,
        activeCustomers: customersWithBookings,
        inactiveCustomers,
        repeatCustomers,
        newThisMonth,
        newThisWeek,
        accountEnabledCount: activeStatusCount,
        retentionRate,
      },
      financials: {
        totalRevenue: revenueData.totalRevenue,
        paidRevenue: revenueData.paidRevenue,
        avgSpendPerActiveCustomer,
        totalBookings: revenueData.totalBookings,
      },
      distribution,
      signupTrend,
      topSpenders,
    }
  },

  /**
   * Retrieve paginated list of customers with aggregated metrics & filter capabilities
   */
  async getCustomers({ page = 1, limit = 10, search = '', status = '', sort = 'recent' }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10))
    const skip = (pageNum - 1) * limitNum

    const matchStage = { role: 'customer' }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      matchStage.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
    }

    if (status === 'enabled') {
      matchStage.isActive = true
    } else if (status === 'disabled') {
      matchStage.isActive = false
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'bookings',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
            {
              $project: {
                totalAmount: 1,
                status: 1,
                paymentStatus: 1,
                date: 1,
                createdAt: 1,
              },
            },
          ],
          as: 'bookings',
        },
      },
      {
        $addFields: {
          totalBookings: { $size: '$bookings' },
          confirmedBookings: {
            $size: {
              $filter: {
                input: '$bookings',
                as: 'b',
                cond: { $in: ['$$b.status', ['confirmed', 'completed']] },
              },
            },
          },
          cancelledBookings: {
            $size: {
              $filter: {
                input: '$bookings',
                as: 'b',
                cond: { $eq: ['$$b.status', 'cancelled'] },
              },
            },
          },
          totalSpent: {
            $reduce: {
              input: '$bookings',
              initialValue: 0,
              in: {
                $cond: [
                  { $ne: ['$$this.status', 'cancelled'] },
                  { $add: ['$$value', { $ifNull: ['$$this.totalAmount', 0] }] },
                  '$$value',
                ],
              },
            },
          },
          lastBookingDate: {
            $max: '$bookings.date',
          },
        },
      },
      {
        $project: {
          passwordHash: 0,
          bookings: 0,
          __v: 0,
        },
      },
    ]

    // Activity filter
    if (status === 'active') {
      pipeline.push({ $match: { totalBookings: { $gt: 0 } } })
    } else if (status === 'inactive') {
      pipeline.push({ $match: { totalBookings: 0 } })
    }

    // Sort order
    let sortStage = { createdAt: -1 }
    switch (sort) {
      case 'oldest':
        sortStage = { createdAt: 1 }
        break
      case 'spend_desc':
        sortStage = { totalSpent: -1, createdAt: -1 }
        break
      case 'spend_asc':
        sortStage = { totalSpent: 1, createdAt: -1 }
        break
      case 'bookings_desc':
        sortStage = { totalBookings: -1, createdAt: -1 }
        break
      case 'name_asc':
        sortStage = { name: 1 }
        break
      default:
        sortStage = { createdAt: -1 }
    }

    pipeline.push({ $sort: sortStage })

    // Facet for pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limitNum }],
      },
    })

    const [result] = await User.aggregate(pipeline)
    const total = result.metadata[0]?.total || 0
    const customers = result.data || []
    const totalPages = Math.ceil(total / limitNum) || 1

    return {
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    }
  },

  /**
   * Retrieve a single customer's detailed profile, booking activity & spending analytics
   */
  async getCustomerById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid customer ID format')
      err.statusCode = 400
      throw err
    }

    const customer = await User.findOne({ _id: id, role: 'customer' }).select('-passwordHash -__v')
    if (!customer) {
      const err = new Error('Customer account not found')
      err.statusCode = 404
      throw err
    }

    const bookings = await Booking.find({ user: id })
      .populate('turf', 'name slug address city')
      .populate('sport', 'name slug')
      .sort({ createdAt: -1 })
      .limit(20)

    const totalBookings = bookings.length
    const confirmedCount = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status)).length
    const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
    const totalSpent = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0)

    // Compute most booked turf
    const turfFrequency = {}
    bookings.forEach((b) => {
      const name = b.turf?.name
      if (name) {
        turfFrequency[name] = (turfFrequency[name] || 0) + 1
      }
    })
    const favoriteTurf = Object.entries(turfFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    return {
      customer,
      stats: {
        totalBookings,
        confirmedCount,
        cancelledCount,
        totalSpent,
        favoriteTurf,
        lastBookingDate: bookings[0]?.date || null,
      },
      recentBookings: bookings,
    }
  },

  /**
   * Toggle a customer account active / disabled status
   */
  async toggleCustomerStatus(id, isActive, actorUser = {}, ip = '') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid customer ID format')
      err.statusCode = 400
      throw err
    }

    const customer = await User.findOne({ _id: id, role: 'customer' })
    if (!customer) {
      const err = new Error('Customer account not found')
      err.statusCode = 404
      throw err
    }

    const previousStatus = customer.isActive
    customer.isActive = Boolean(isActive)
    await customer.save()

    // Audit log
    await logAudit({
      actorId: actorUser._id || actorUser.id,
      action: customer.isActive ? 'CUSTOMER_ACCOUNT_ACTIVATED' : 'CUSTOMER_ACCOUNT_SUSPENDED',
      entityType: 'User',
      entityId: customer._id,
      details: {
        customerEmail: customer.email,
        customerName: customer.name,
        previousStatus,
        newStatus: customer.isActive,
      },
      ip,
    })

    return customer
  },
}

export default customerService
