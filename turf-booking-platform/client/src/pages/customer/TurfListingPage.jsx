import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
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
  Trophy,
  ArrowLeft,
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
  'Showers',
  'First Aid',
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

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // 1. Fetch Sports for filter dropdown
  const { data: sports = [] } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
    refetchInterval: 5000,
  })

  // Deduplicate sports by base category name
  const uniqueSports = useMemo(() => {
    const seen = new Set()
    return sports.filter((sport) => {
      const normalized = (sport?.name || '')
        .toLowerCase()
        .replace(/\s*\d+$/, '')
        .trim()
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
  }, [sports])

  // 2. Fetch Turfs with current query params
  const { data: turfsData, isLoading, isError, error, refetch } = useQuery({
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
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = Boolean(
    search || sportSlug || city || facilitiesParam || minPrice || maxPrice || (sort && sort !== 'name_asc')
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8E3]">
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-xs font-semibold text-[#526258] hover:text-[#267A45] border border-[#D7E0D9] shadow-2xs transition-all w-fit group cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#267A45] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
            Explore Sports Turfs
          </h1>
          <p className="text-xs sm:text-sm text-[#526258]">
            Browse verified turf arenas, inspect dynamic hourly pricing, and view real-time availability.
          </p>
        </div>

        {/* Mobile filter toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="p-2.5 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#267A45]" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters & Results */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar / Mobile Drawer */}
        <aside
          className={`md:block md:col-span-1 space-y-6 bg-white p-5 rounded-3xl border border-[#D7E0D9] shadow-xs ${
            mobileFilterOpen ? 'block fixed inset-x-4 top-20 z-40 max-h-[80vh] overflow-y-auto shadow-xl bg-white border-[#267A45]' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E3]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17231B] flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#267A45]" />
              <span>Filters</span>
            </h2>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] font-semibold text-[#267A45] hover:text-[#1E6338] transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}

            {mobileFilterOpen && (
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="md:hidden p-1 text-[#526258] hover:text-[#17231B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 1. Sport Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#17231B] block">Sport</label>
            <select
              value={sportSlug}
              onChange={(e) => updateParam('sport', e.target.value)}
              className="w-full bg-white text-xs text-[#17231B] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45] cursor-pointer"
            >
              <option value="">All Sports</option>
              {uniqueSports.map((s) => (
                <option key={s._id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. City / Area Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#17231B] block">City / Area</label>
            <input
              type="text"
              placeholder="e.g. Ahmedabad, Mumbai"
              value={city}
              onChange={(e) => updateParam('city', e.target.value)}
              className="w-full bg-white text-xs text-[#17231B] placeholder-[#647168] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
            />
          </div>

          {/* 3. Hourly Price Filter (in ₹) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#17231B] block">Hourly Rate (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value)}
                min="0"
                step="50"
                className="w-full bg-white text-xs text-[#17231B] placeholder-[#647168] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                min="0"
                step="50"
                className="w-full bg-white text-xs text-[#17231B] placeholder-[#647168] px-3 py-2 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45]"
              />
            </div>
          </div>

          {/* 4. Facilities Checklist */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8E3]">
            <label className="text-xs font-bold text-[#17231B] block">Facilities</label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {COMMON_FACILITIES.map((facility) => {
                const isSelected = selectedFacilities.includes(facility)
                return (
                  <label
                    key={facility}
                    className="flex items-center gap-2 text-xs text-[#46564A] hover:text-[#17231B] cursor-pointer select-none py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFacilityToggle(facility)}
                      className="w-3.5 h-3.5 rounded bg-white border-[#D7E0D9] text-[#267A45] focus:ring-[#267A45]/20 cursor-pointer"
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
              className="w-full py-2.5 rounded-xl bg-[#267A45] text-white font-bold text-xs shadow-xs"
            >
              Apply Filters
            </button>
          )}
        </aside>

        {/* Results Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Quick Sport Category Pills */}
          {sports.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => updateParam('sport', '')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  !sportSlug
                    ? 'bg-[#267A45] text-white shadow-xs'
                    : 'bg-white border border-[#D7E0D9] text-[#46564A] hover:border-[#267A45] hover:text-[#17231B]'
                }`}
              >
                All Sports
              </button>
              {sports.map((s) => {
                const isSelected = sportSlug === s.slug
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => updateParam('sport', isSelected ? '' : s.slug)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#267A45] text-white shadow-xs'
                        : 'bg-white border border-[#D7E0D9] text-[#46564A] hover:border-[#267A45] hover:text-[#17231B]'
                    }`}
                  >
                    <Trophy className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#267A45]'}`} />
                    <span>{s.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Active Filter Chips & Sort Dropdown */}
          <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-[#D7E0D9] shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-[#526258] flex items-center gap-1.5 flex-wrap">
                {sportSlug ? (
                  <>
                    <span>Showing</span>
                    <strong className="text-[#17231B] font-bold text-sm">{turfs.length}</strong>
                    <span>matching</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E7F3E9] text-[#1D6537] font-bold">
                      {sports.find((s) => s.slug === sportSlug)?.name || sportSlug}
                    </span>
                    <span>{turfs.length === 1 ? 'arena' : 'arenas'}</span>
                    <button
                      type="button"
                      onClick={() => updateParam('sport', '')}
                      className="text-[#267A45] hover:underline text-[11px] font-semibold cursor-pointer ml-1"
                    >
                      (Show all sports)
                    </button>
                  </>
                ) : (
                  <>
                    Showing <strong className="text-[#17231B] font-semibold">{turfs.length}</strong> of{' '}
                    <strong className="text-[#17231B] font-semibold">{pagination.total}</strong> turf arenas
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-[#526258] shrink-0 font-medium">Sort by:</label>
                <select
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="bg-white text-xs text-[#17231B] px-3 py-1.5 rounded-xl border border-[#D7E0D9] focus:outline-none focus:border-[#267A45] cursor-pointer font-medium"
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E2E8E3]">
                <span className="text-[10px] uppercase font-bold text-[#526258] mr-1">Active:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F0F4F1] text-[11px] text-[#17231B] border border-[#D7E0D9]">
                    <span>"{search}"</span>
                    <button type="button" onClick={() => updateParam('search', '')} className="hover:text-[#267A45] cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {sportSlug && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E7F3E9] text-[11px] text-[#1D6537] border border-[#C9DFCE]">
                    <span>Sport: {sports.find((s) => s.slug === sportSlug)?.name || sportSlug}</span>
                    <button type="button" onClick={() => updateParam('sport', '')} className="hover:text-[#17231B] cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {city && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F0F4F1] text-[11px] text-[#17231B] border border-[#D7E0D9]">
                    <span>City: {city}</span>
                    <button type="button" onClick={() => updateParam('city', '')} className="hover:text-[#267A45] cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedFacilities.map((fac) => (
                  <span key={fac} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E7F3E9] text-[11px] text-[#1D6537] border border-[#C9DFCE]">
                    <span>✓ {fac}</span>
                    <button type="button" onClick={() => handleFacilityToggle(fac)} className="hover:text-[#17231B] cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F0F4F1] text-[11px] text-[#17231B] border border-[#D7E0D9]">
                    <span>₹{minPrice || '0'} - ₹{maxPrice || '∞'}</span>
                    <button type="button" onClick={() => { updateParam('minPrice', ''); updateParam('maxPrice', '') }} className="hover:text-[#267A45] cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Results Grid States */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#526258] text-xs">
              <Loader2 className="w-8 h-8 text-[#267A45] animate-spin" />
              <span>Finding matching sports arenas and hourly pricing...</span>
            </div>
          ) : isError ? (
            <div className="p-6 rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-[#922B27] shrink-0" />
                <span>Failed to retrieve turfs: {error?.message}</span>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#F8D2CE] hover:bg-[#FDF0EF] text-[#922B27] font-semibold text-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : turfs.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-3xl bg-white border border-[#D7E0D9] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F4F1] text-[#526258] flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#17231B]">
                  {sportSlug
                    ? `No arenas currently match "${sports.find((s) => s.slug === sportSlug)?.name || sportSlug}"`
                    : 'No turf arenas match your search'}
                </h3>
                <p className="text-xs text-[#526258] max-w-sm mx-auto mt-1">
                  Try clearing some filters or exploring all sports arenas.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {turfs.map((turf) => (
                <TurfCard key={turf._id} turf={turf} activeSportSlug={sportSlug} />
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
                className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-[#17231B] px-3">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => updateParam('page', String(page + 1))}
                className="p-2 rounded-xl bg-white border border-[#D7E0D9] text-[#17231B] hover:bg-[#F0F6F1] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
