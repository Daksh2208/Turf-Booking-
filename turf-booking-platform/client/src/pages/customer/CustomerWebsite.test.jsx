import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '../../hooks/useApi'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { CustomerLayout } from '../../layouts/CustomerLayout'
import { HomePage } from './HomePage'
import { TurfListingPage } from './TurfListingPage'
import { TurfDetailPage } from './TurfDetailPage'
import customerInventoryService from '../../services/customer/inventory.service'
import customerBookingService from '../../services/customer/booking.service'

const mockTurfs = [
  {
    _id: 'turf-001',
    name: 'Apex Arena Alpha',
    slug: 'apex-arena-alpha',
    description: 'Premier floodlit astro-turf ground for box cricket and football.',
    sports: [
      { _id: 'sp-1', name: 'Box Cricket', slug: 'box-cricket' },
      { _id: 'sp-2', name: 'Football', slug: 'football' },
    ],
    address: {
      street: '123 Stadium Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      zipCode: '380015',
    },
    images: ['https://example.com/turf1.jpg'],
    facilities: ['Floodlights', 'Parking', 'Changing Room'],
    size: '110x65 ft',
    surface: 'High-Density Astro Turf',
    openingHours: { open: '06:00', close: '23:00' },
    timezone: 'Asia/Kolkata',
    pricing: {
      baseRate: 80000,
      peakRate: 120000,
      weekendRate: 140000,
      peakHours: { start: '18:00', end: '23:00' },
    },
  },
]

const mockSports = [
  { _id: 'sp-1', name: 'Box Cricket', slug: 'box-cricket', description: 'Enclosed arena cricket' },
  { _id: 'sp-2', name: 'Football', slug: 'football', description: '5v5 & 7v7 turf football' },
  { _id: 'sp-3', name: 'Pickleball', slug: 'pickleball', description: 'Fast-paced paddle sport' },
  { _id: 'sp-4', name: 'Badminton', slug: 'badminton', description: 'Indoor wooden/synthetic courts' },
]

const mockBanners = [
  {
    _id: 'b-1',
    title: 'Weekend Night Tournament Registrations Open',
    subtitle: 'Compete under high-beam floodlights this Saturday.',
    linkUrl: '/turfs',
    isActive: true,
  },
]

const mockSettings = {
  businessName: 'TurfSpot Sports Arena',
  supportEmail: 'contact@turfspot.com',
  supportPhone: '+91 98765 43210',
  address: { street: 'Sports Complex Road', city: 'Ahmedabad', state: 'Gujarat' },
  timezone: 'Asia/Kolkata',
}

const mockAvailability = {
  turf: { id: 'turf-001', name: 'Apex Arena Alpha' },
  date: '2026-10-28',
  timezone: 'Asia/Kolkata',
  operatingHours: { open: '06:00', close: '23:00' },
  slots: [
    {
      startTime: '06:00',
      endTime: '07:00',
      status: 'available',
      price: 80000,
      priceFormatted: '₹800.00',
      rateType: 'base',
    },
    {
      startTime: '10:00',
      endTime: '11:00',
      status: 'booked',
      price: 80000,
      priceFormatted: '₹800.00',
      rateType: 'base',
    },
    {
      startTime: '14:00',
      endTime: '15:00',
      status: 'blocked',
      reason: 'maintenance',
      note: 'Turf grass conditioning',
      price: 80000,
      priceFormatted: '₹800.00',
      rateType: 'base',
    },
    {
      startTime: '19:00',
      endTime: '20:00',
      status: 'available',
      price: 120000,
      priceFormatted: '₹1200.00',
      rateType: 'peak',
    },
  ],
}

const mockQuote = {
  turf: { id: 'turf-001', name: 'Apex Arena Alpha' },
  date: '2026-10-28',
  startTime: '19:00',
  endTime: '20:00',
  slotSubtotal: 120000,
  addOns: [],
  addOnsTotal: 0,
  subtotal: 120000,
  gstPercentage: 18,
  gstAmount: 21600,
  totalAmount: 141600,
  isWeekend: false,
  currency: 'INR',
}

vi.mock('../../services/customer/inventory.service', () => ({
  customerInventoryService: {
    getTurfs: vi.fn(),
    getTurfBySlug: vi.fn(),
    getSports: vi.fn(),
    getBanners: vi.fn(),
    getAddOns: vi.fn(),
    getSettings: vi.fn(),
  },
  default: {
    getTurfs: vi.fn(),
    getTurfBySlug: vi.fn(),
    getSports: vi.fn(),
    getBanners: vi.fn(),
    getAddOns: vi.fn(),
    getSettings: vi.fn(),
  },
}))

vi.mock('../../services/customer/booking.service', () => ({
  customerBookingService: {
    getAvailability: vi.fn(),
    getPricingQuote: vi.fn(),
  },
  default: {
    getAvailability: vi.fn(),
    getPricingQuote: vi.fn(),
  },
}))

describe('Part 9: Customer-Facing Website & Discovery Suite', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    customerInventoryService.getTurfs.mockResolvedValue({
      turfs: mockTurfs,
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    })
    customerInventoryService.getTurfBySlug.mockResolvedValue(mockTurfs[0])
    customerInventoryService.getSports.mockResolvedValue(mockSports)
    customerInventoryService.getBanners.mockResolvedValue(mockBanners)
    customerInventoryService.getAddOns.mockResolvedValue([])
    customerInventoryService.getSettings.mockResolvedValue(mockSettings)
    customerBookingService.getAvailability.mockResolvedValue(mockAvailability)
    customerBookingService.getPricingQuote.mockResolvedValue(mockQuote)
  })

  // 1. Home Page renders ongoing things, banners, sports, and guest protection
  it('1. renders Home Page with real hero banner, sports categories, and featured turfs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, logout: vi.fn() }}>
            <CustomerLayout>
              <HomePage />
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Heading verification
    expect(
      screen.getByRole('heading', { level: 1, name: /Sports Turf Booking/i })
    ).toBeInTheDocument()

    // Real announcement banner from API (ongoing event)
    await waitFor(() => {
      expect(screen.getByText('Weekend Night Tournament Registrations Open')).toBeInTheDocument()
    })

    // Ongoing happenings section header
    expect(screen.getByText('Ongoing Tournaments & Happenings')).toBeInTheDocument()

    // Without login, interactive search form is hidden and guest project detail card with Explore CTA is shown
    expect(screen.queryByPlaceholderText(/Search turf name, area/i)).not.toBeInTheDocument()
    expect(screen.getByText('Seamless Booking for Every Game')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Explore$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Create Account/i }).length).toBeGreaterThanOrEqual(1)

    // Sports categories from API
    expect(screen.getAllByText('Box Cricket').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Football').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Pickleball')).toBeInTheDocument()
    expect(screen.getByText('Badminton')).toBeInTheDocument()

    // Featured arena card with protected guest lock
    expect(screen.getByText('Apex Arena Alpha')).toBeInTheDocument()
    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('₹800')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign Up to Book Slots/i })).toBeInTheDocument()

    // Business contact info in footer
    expect(screen.getByText('contact@turfspot.com')).toBeInTheDocument()
  }, 15000)

  // 1b. When authenticated, interactive search form is in navbar and view details CTA on Home Page
  it('1b. unlocks interactive turf search form and view details CTA when logged in', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider
            value={{
              user: { _id: 'u-1', name: 'Cristiano Ronaldo', role: 'customer' },
              isAuthenticated: true,
              logout: vi.fn(),
            }}
          >
            <CustomerLayout>
              <HomePage />
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Interactive search form is rendered in navbar
    expect(screen.getByPlaceholderText(/Search turfs, areas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find Turfs/i })).toBeInTheDocument()

    // Hero quick actions are rendered instead of guest card
    expect(screen.getByRole('link', { name: /Browse All Arenas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View My Bookings/i })).toBeInTheDocument()
    expect(screen.queryByText('Seamless Booking for Every Game')).not.toBeInTheDocument()

    // Turf card has View Details & Slots CTA
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /View Details & Slots/i })).toBeInTheDocument()
    })
  })

  // 2. Turf Listing Page renders search and filter controls
  it('2. renders Turf Discovery Listing with filter controls and actual API turfs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/turfs']}>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, logout: vi.fn() }}>
            <CustomerLayout>
              <TurfListingPage />
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Explore Sports Turfs')).toBeInTheDocument()
      expect(screen.getByText('Apex Arena Alpha')).toBeInTheDocument()
    })

    // Filter labels
    expect(screen.getByLabelText(/Floodlights/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Parking/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Min ₹/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Max ₹/i)).toBeInTheDocument()
  })

  // 3. Turf Detail Page displays arena gallery, specs, and Part 7 rate cards
  it('3. renders Turf Detail Page with specs, facilities, and hourly rate breakdown', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/turfs/apex-arena-alpha']}>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, logout: vi.fn() }}>
            <CustomerLayout>
              <Routes>
                <Route path="/turfs/:slug" element={<TurfDetailPage />} />
              </Routes>
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Apex Arena Alpha' })).toBeInTheDocument()
    })

    // Specs
    expect(screen.getByText('110x65 ft')).toBeInTheDocument()
    expect(screen.getByText('High-Density Astro Turf')).toBeInTheDocument()

    // Hourly Rate Cards
    expect(screen.getByText('Standard Weekday Rate')).toBeInTheDocument()
    expect(screen.getByText('Peak-Hour Rate')).toBeInTheDocument()
    expect(screen.getByText('Weekend Rate')).toBeInTheDocument()
  })

  // 4. Availability integration: distinguishes available, booked, and blocked slots
  it('4. distinguishes slot statuses and prevents selection of booked and blocked slots', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/turfs/apex-arena-alpha']}>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, logout: vi.fn() }}>
            <CustomerLayout>
              <Routes>
                <Route path="/turfs/:slug" element={<TurfDetailPage />} />
              </Routes>
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('06:00')).toBeInTheDocument()
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('14:00')).toBeInTheDocument()
    })

    // Status badges
    expect(screen.getByText('Reserved')).toBeInTheDocument()
    expect(screen.getByText('maintenance')).toBeInTheDocument()

    // Non-selectable slots
    expect(screen.getByText('Occupied')).toBeInTheDocument()
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  // 5. Selecting an available slot displays real-time quote estimate from pricing engine
  it('5. fetches dynamic pricing quote estimate upon selecting an available slot', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/turfs/apex-arena-alpha']}>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, logout: vi.fn() }}>
            <CustomerLayout>
              <Routes>
                <Route path="/turfs/:slug" element={<TurfDetailPage />} />
              </Routes>
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('19:00')).toBeInTheDocument()
    })

    // Click on available slot 19:00 - 20:00
    const selectButtons = screen.getAllByRole('button', { name: /Select/i })
    fireEvent.click(selectButtons[0])

    // Verify quote estimate breakdown
    await waitFor(() => {
      expect(screen.getByText('Slot Subtotal:')).toBeInTheDocument()
      expect(screen.getByText('GST (18%):')).toBeInTheDocument()
      expect(screen.getByText('Estimated Total:')).toBeInTheDocument()
      expect(screen.getByText('₹1416.00')).toBeInTheDocument()
    })
  })

  // 6. Navbar Authentication state: guest vs logged-in customer
  it('6. updates navigation header reflecting authenticated player vs guest', async () => {
    const mockUser = {
      _id: 'u1',
      name: 'Lionel Messi',
      email: 'messi@turfspot.com',
      role: 'customer',
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider
            value={{
              user: mockUser,
              isAuthenticated: true,
              logout: vi.fn(),
            }}
          >
            <CustomerLayout>
              <HomePage />
            </CustomerLayout>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Authenticated user's name and Account Settings are displayed, Sign Out moved to Settings page
    expect(screen.getByText('Lionel Messi')).toBeInTheDocument()
    expect(screen.getByTitle('Account Settings')).toBeInTheDocument()
    expect(screen.queryByTitle('Sign Out')).not.toBeInTheDocument()

    // Guest login links are hidden
    expect(screen.queryByRole('link', { name: /^Sign In$/i })).not.toBeInTheDocument()
  })
})
