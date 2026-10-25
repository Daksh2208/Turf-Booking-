import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Sport } from '../models/Sport.js'
import { Turf } from '../models/Turf.js'
import { AddOn } from '../models/AddOn.js'
import { Banner } from '../models/Banner.js'
import { Coupon } from '../models/Coupon.js'
import { BusinessSettings } from '../models/BusinessSettings.js'

async function seedInitialData() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(env.MONGODB_URI)
    console.log('Connected.')

    // 1. Seed Sports if none exist
    const sportsCount = await Sport.countDocuments()
    let cricketSport, footballSport, pickleballSport, badmintonSport

    if (sportsCount === 0) {
      console.log('Seeding Sports...')
      const sports = await Sport.insertMany([
        {
          name: 'Box Cricket',
          slug: 'box-cricket',
          description: 'High-intensity enclosed box cricket with all-round netting.',
          minPlayers: 6,
          maxPlayers: 14,
          icon: 'Trophy',
          isActive: true,
        },
        {
          name: 'Football',
          slug: 'football',
          description: '5-a-side and 7-a-side AstroTurf football arenas.',
          minPlayers: 10,
          maxPlayers: 14,
          icon: 'Flame',
          isActive: true,
        },
        {
          name: 'Pickleball',
          slug: 'pickleball',
          description: 'Fastest growing paddle sport on professional cushion courts.',
          minPlayers: 2,
          maxPlayers: 4,
          icon: 'Zap',
          isActive: true,
        },
        {
          name: 'Badminton',
          slug: 'badminton',
          description: 'Indoor wooden and synthetic BWF standard badminton courts.',
          minPlayers: 2,
          maxPlayers: 4,
          icon: 'Layers',
          isActive: true,
        },
      ])
      cricketSport = sports[0]
      footballSport = sports[1]
      pickleballSport = sports[2]
      badmintonSport = sports[3]
      console.log(`Created ${sports.length} sports.`)
    } else {
      cricketSport = await Sport.findOne({ slug: 'box-cricket' })
      footballSport = await Sport.findOne({ slug: 'football' })
      pickleballSport = await Sport.findOne({ slug: 'pickleball' })
      badmintonSport = await Sport.findOne({ slug: 'badminton' })
    }

    // 2. Seed Turfs if none exist
    const turfsCount = await Turf.countDocuments()
    if (turfsCount === 0) {
      console.log('Seeding Turfs...')
      const turfs = await Turf.insertMany([
        {
          name: 'Apex Thunder Arena',
          slug: 'apex-thunder-arena',
          description: 'Premier floodlit astro-turf ground for box cricket and 5v5 football with pro-grade shock pads.',
          sports: [cricketSport?._id].filter(Boolean),
          address: {
            street: '12 Sports Complex Road, Andheri West',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400053',
          },
          images: [
            'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
          ],
          facilities: ['High-Power Floodlights', 'Covered Dugouts', 'Ample Parking', 'Changing Rooms', 'Drinking Water'],
          size: '110x65 ft',
          surface: 'High-Density Monofilament Astro Turf',
          openingHours: {
            open: '06:00',
            close: '23:00',
          },
          pricing: {
            baseRate: 90000, // ₹900/hr
            peakRate: 140000, // ₹1400/hr
            weekendRate: 120000, // ₹1200/hr
            peakHours: { start: '18:00', end: '23:00' },
            weekendDays: [0, 6],
          },
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
        {
          name: 'Champions Turf Ground',
          slug: 'champions-turf-ground',
          description: 'Spacious multi-sport turf arena with FIFA-certified artificial grass and international standard netting.',
          sports: [footballSport?._id].filter(Boolean),
          address: {
            street: 'Plot 45 Link Road, Malad West',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400064',
          },
          images: [
            'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
          ],
          facilities: ['LED Floodlights', 'Scoreboard', 'Cafeteria', 'Restrooms', 'First Aid'],
          size: '120x70 ft',
          surface: '50mm FIFA Standard Synthetic Turf',
          openingHours: {
            open: '06:00',
            close: '23:00',
          },
          pricing: {
            baseRate: 100000, // ₹1000/hr
            peakRate: 160000, // ₹1600/hr
            weekendRate: 130000, // ₹1300/hr
            peakHours: { start: '18:00', end: '23:00' },
            weekendDays: [0, 6],
          },
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
        {
          name: 'Smash Point Sports Hub',
          slug: 'smash-point-sports-hub',
          description: 'State-of-the-art indoor sports complex dedicated to Pickleball, Badminton, and Box Cricket.',
          sports: [pickleballSport?._id, badmintonSport?._id].filter(Boolean),
          address: {
            street: '88 Eastern Express Highway, Powai',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400076',
          },
          images: [
            'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
          ],
          facilities: ['Air Conditioned Waiting Lounge', 'Shower Facilities', 'Locker Rental', 'Equipment Shop'],
          size: '95x55 ft',
          surface: 'Multi-layer Cushion Acrylic & Wooden Court',
          openingHours: {
            open: '06:00',
            close: '23:00',
          },
          pricing: {
            baseRate: 80000, // ₹800/hr
            peakRate: 120000, // ₹1200/hr
            weekendRate: 110000, // ₹1100/hr
            peakHours: { start: '18:00', end: '23:00' },
            weekendDays: [0, 6],
          },
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      ])
      console.log(`Created ${turfs.length} initial turfs.`)
    }

    // 3. Seed Add-Ons if none exist or ensure required equipment exists
    const requiredEquipment = [
      {
        name: 'Cricket Bat & Leather Ball Set',
        category: 'Equipment',
        price: 30000, // ₹300
        pricingUnit: 'per_booking',
        isActive: true,
      },
      {
        name: 'FIFA Standard Pro Football',
        category: 'Equipment',
        price: 20000, // ₹200
        pricingUnit: 'per_booking',
        isActive: true,
      },
      {
        name: 'Badminton Rackets & Shuttles Pair',
        category: 'Equipment',
        price: 25000, // ₹250
        pricingUnit: 'per_booking',
        isActive: true,
      },
      {
        name: 'Pickleball Paddles & Balls Set',
        category: 'Equipment',
        price: 20000, // ₹200
        pricingUnit: 'per_booking',
        isActive: true,
      },
      {
        name: 'Pro Team Bibs (Set of 10)',
        category: 'Equipment',
        price: 20000, // ₹200
        pricingUnit: 'per_booking',
        isActive: true,
      },
    ]

    for (const eq of requiredEquipment) {
      const exists = await AddOn.findOne({ name: eq.name })
      if (!exists) {
        await AddOn.create(eq)
        console.log(`Created equipment add-on: ${eq.name}`)
      }
    }

    // 4. Seed Banners if none exist
    const bannersCount = await Banner.countDocuments()
    if (bannersCount === 0) {
      console.log('Seeding Banners...')
      const banners = await Banner.insertMany([
        {
          title: 'Weekend Night Tournament Registrations Open',
          subtitle: 'Compete under high-beam floodlights this Saturday. Cash prizes & trophies.',
          linkUrl: '/turfs',
          image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
          order: 1,
          isActive: true,
        },
        {
          title: 'Book Pro-Grade AstroTurf in 60 Seconds',
          subtitle: 'Real-time live slot calendar. Instant booking confirmation with Pay at Venue.',
          linkUrl: '/turfs',
          image: 'https://images.unsplash.com/photo-1529900245534-47fbf82215dd?auto=format&fit=crop&w=1200&q=80',
          order: 2,
          isActive: true,
        },
      ])
      console.log(`Created ${banners.length} banners.`)
    }

    // 5. Seed Promotional Coupons
    const initialCoupons = [
        {
          code: 'SUPER3000',
          description: '20% OFF on bookings above ₹3,000! Save up to ₹1,000 on big game nights.',
          discountType: 'percentage',
          discountValue: 20,
          minimumBookingAmount: 300000, // ₹3,000 in paise
          maximumDiscountAmount: 100000, // ₹1,000 in paise
          usageLimit: 200,
          perUserLimit: 3,
          isActive: true,
        },
        {
          code: 'MATCHDAY15',
          description: '15% OFF on booking subtotal above ₹1,500.',
          discountType: 'percentage',
          discountValue: 15,
          minimumBookingAmount: 150000, // ₹1,500 in paise
          maximumDiscountAmount: 50000, // ₹500 in paise
          usageLimit: 500,
          perUserLimit: 2,
          isActive: true,
        },
        {
          code: 'FLAT100',
          description: 'Flat ₹100 OFF on any turf booking above ₹800.',
          discountType: 'fixed',
          discountValue: 10000, // ₹100 in paise
          minimumBookingAmount: 80000, // ₹800 in paise
          usageLimit: 1000,
          perUserLimit: 1,
          isActive: true,
        },
        {
          code: 'WEEKEND500',
          description: 'Flat ₹500 Mega Discount on group bookings above ₹4,000.',
          discountType: 'fixed',
          discountValue: 50000, // ₹500 in paise
          minimumBookingAmount: 400000, // ₹4,000 in paise
          usageLimit: 100,
          perUserLimit: 2,
          isActive: true,
        },
      ]

      for (const couponData of initialCoupons) {
        const exists = await Coupon.findOne({ code: couponData.code, isDeleted: false })
        if (!exists) {
          await Coupon.create(couponData)
          console.log(`Seeded coupon: ${couponData.code}`)
        }
      }

    // 6. Ensure Business Settings
    await BusinessSettings.findOneAndUpdate(
      {},
      {
        $setOnInsert: {
          businessName: 'TurfSpot Sports Arena',
          contactEmail: 'support@turfspot.com',
          contactPhone: '+91 98765 43210',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          taxSettings: {
            taxEnabled: true,
            taxName: 'GST',
            taxRatePercentage: 18,
          },
          bookingRules: {
            slotDurationMinutes: 60,
            maxAdvanceBookingDays: 30,
            cancellationCutoffHours: 6,
          },
        },
      },
      { upsert: true }
    )

    console.log('Database successfully seeded with sports, turfs, add-ons, banners, coupons, and settings!')
    process.exit(0)
  } catch (err) {
    console.error('Seed error:', err)
    process.exit(1)
  }
}

seedInitialData()
