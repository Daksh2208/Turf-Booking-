import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '../../hooks/useApi'
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Trophy,
  Check,
  RefreshCw,
} from 'lucide-react'
import customerInventoryService from '../../services/customer/inventory.service'
import { TurfCard } from '../../components/customer/TurfCard'

const COMMON_FACILITIES = [
  'Floodlights',
  'Parking',
  'Changing Room',
  'Locker Room',
  'Drinking Water',
  'Seating Area',
  'Cafeteria',
]

export const TurfListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read current filter state from URL params
  const search = searchParams.get('search') || ''
  const sportSlug = searchParams.get('sport') || ''
  const city = searchParams.get('city') || ''
  const facilitiesParam = searchParams.get('facilities') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const sort = searchParams.get('sort') || 'name_asc'
  const page = Number(searchParams.get('page')) || 1

  const selectedFacilities = facilitiesParam ? facilitiesParam.split(',').filter(Boolean) : []

  // Local state for instant input feedback
  const [localSearch, setLocalSearch] = useState(search)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Keep local search in sync with URL
  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  // 1. Fetch Sports for filter dropdown (auto-synced with DB)
  const { data: sports = [] } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
    refetchInterval: 5000,
  })

  // 2. Fetch Turfs with current query params (auto-synced with DB)
  const { data: turfsData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'publicTurfsList',
      { search, sportSlug, city, facilities: facilitiesParam, minPrice, maxPrice, sort, page },
    ],
    queryFn: () =>
      customerInventoryService.getTurfs({
        page,
        limit: 9,
        search,
        sportSlug: sportSlug || undefined,
        city: city || undefined,
        facilities: facilitiesParam || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sort,
      }),
    refetchInterval: 5000,
  })

  const turfs = turfsData?.turfs || []
  const pagination = turfsData?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Update a single filter in URL search params
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value !== undefined && value !== null && value !== '') {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  const handleFacilityToggle = (facilityName) => {
    let nextList = [...selectedFacilities]
    if (nextList.includes(facilityName)) {
      nextList = nextList.filter((f) => f !== facilityName)
    } else {
      nextList.push(facilityName)
    }
    updateParam('facilities', nextList.join(','))
  }

  const handleClearFilters = () => {
    setLocalSearch('')
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = Boolean(
    search || sportSlug || city || facilitiesParam || minPrice || maxPrice || (sort && sort !== 'name_asc')
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Explore Sports Turfs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse verified turf arenas, inspect dynamic hourly pricing, and view real-time availability.
          </p>
        </div>

        {/* Quick Search bar & Mobile filter button */}
        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateParam('search', localSearch)
            }}
            className="relative flex-1 sm:w-72"
          >
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by arena or area..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </form>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters & Results */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar / Mobile Drawer */}
        <aside
          className={`md:block md:col-span-1 space-y-6 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 backdrop-blur-md ${
            mobileFilterOpen ? 'block fixed inset-x-4 top-20 z-40 max-h-[80vh] overflow-y-auto shadow-2xl bg-slate-950 border-emerald-500/40' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filters</span>
            </h2>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}

            {mobileFilterOpen && (
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="md:hidden p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 1. Sport Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Sport</label>
            <select
              value={sportSlug}
              onChange={(e) => updateParam('sport', e.target.value)}
              className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">All Sports</option>
              {sports.map((s) => (
                <option key={s._id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. City / Area Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">City / Area</label>
            <input
              type="text"
              placeholder="e.g. Ahmedabad, Mumbai"
              value={city}
              onChange={(e) => updateParam('city', e.target.value)}
              className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 3. Hourly Price Filter (in ₹) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Hourly Rate (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value)}
                min="0"
                step="50"
                className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                min="0"
                step="50"
                className="w-full bg-slate-950 text-xs text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 4. Facilities Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 block">Facilities</label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {COMMON_FACILITIES.map((facility) => {
                const isSelected = selectedFacilities.includes(facility)
                return (
                  <label
                    key={facility}
                    className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFacilityToggle(facility)}
                      className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>{facility}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Mobile Apply Button */}
          {mobileFilterOpen && (
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Apply Filters
            </button>
          )}
        </aside>

        {/* Results Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Active Filter Chips & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-xs text-slate-400">
              Showing <strong className="text-white">{turfs.length}</strong> of{' '}
              <strong className="text-white">{pagination.total}</strong> turf arenas
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-400 shrink-0 font-medium">Sort by:</label>
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-slate-950 text-xs text-white px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Recently Added</option>
              </select>
            </div>
          </div>

          {/* Results Grid States */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span>Finding matching sports arenas and hourly pricing...</span>
            </div>
          ) : isError ? (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Failed to retrieve turfs: {error?.message}</span>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : turfs.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No turf arenas match your search</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Try clearing some filters or searching for a different area or sport.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {turfs.map((turf) => (
                <TurfCard key={turf._id} turf={turf} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-300 px-3">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => updateParam('page', String(page + 1))}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TurfListingPage
