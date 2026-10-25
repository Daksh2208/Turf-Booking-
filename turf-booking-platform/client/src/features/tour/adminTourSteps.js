/**
 * Admin Panel Guided Tour Steps Configuration
 * 
 * Provides an 11-step high-level walkthrough of key admin features:
 * - Live Operations Tracker (Header & overview)
 * - Daily KPI Metrics (Bookings, revenue, players, slots)
 * - Financial Health & Desk Payments (Paid vs Pay at Venue)
 * - Real-time Arena Schedule Table (Live reservations)
 * - Sidebar Navigation (Portal overview)
 * - Turf Arenas & Pricing
 * - Booking Management
 * - Blocked Slots
 * - Sports & Add-Ons
 * - Coupons & Promotional Discounts
 * - Business Settings & Policies
 */

export const adminTourSteps = [
  {
    element: '[data-tour="admin-dashboard-header"]',
    popover: {
      title: 'Welcome to Your Admin Panel! 👋',
      description:
        'This Live Operations Tracker is your mission control. It gives you a real-time pulse of today\'s bookings, court occupancies, and revenue collections across all sports arenas.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-metrics"]',
    popover: {
      title: 'Daily Core Operations KPIs 📊',
      description:
        'Review high-level metrics at a glance: today\'s active reservations, confirmed revenue, players scheduled to play, and remaining free slots for walk-in bookings.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="financial-health"]',
    popover: {
      title: 'Financial Health & Desk Payments 💳',
      description:
        'Audit your daily cash flow. Track online card collections alongside pending "Pay at Venue" desk collections due upon player arrival at the counter.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="schedule-table"]',
    popover: {
      title: 'Live Arena Schedule Feed ⏱️',
      description:
        'A real-time chronological timeline of customer matches scheduled today. Quickly check player contact details, booking status, and jump into reservation management.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="admin-sidebar"]',
    popover: {
      title: 'Navigation Sidebar 🧭',
      description:
        'Easily switch between all inventory, customer, booking, and system settings modules from this responsive sidebar.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-turfs"]',
    popover: {
      title: 'Turf Arenas & Pricing 🏟️',
      description:
        'Manage your turf venues, pitches, dimensions, and images. Configure base hourly rates, peak-hour surcharges, and weekend pricing rules per arena.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-bookings"]',
    popover: {
      title: 'Booking Management 📅',
      description:
        'Search customer reservations, audit pricing breakdowns, record manual cash/card payments for venue desk check-ins, or process cancellations.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-blocked-slots"]',
    popover: {
      title: 'Blocked Slots & Pitch Maintenance 🚫',
      description:
        'Instantly block individual or recurring slots for maintenance, tournaments, or severe weather so players cannot book unavailable pitches.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-sports"]',
    popover: {
      title: 'Sports & Equipment Add-Ons 🏏',
      description:
        'Configure supported sports (Box Cricket, Football, Pickleball) and manage rentable equipment add-ons (like floodlights, bibs, and cricket kits) with custom pricing units.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-coupons"]',
    popover: {
      title: 'Coupons & Discounts 🏷️',
      description:
        'Create promotional discount codes with percentage or flat deductions, minimum cart thresholds, expiration dates, and per-user redemption limits.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: 'Business Settings & Policies ⚙️',
      description:
        'Configure your facility name, GST tax percentage, advance booking windows, slot durations, and player cancellation refund policies.',
      side: 'right',
      align: 'center',
    },
  },
]
