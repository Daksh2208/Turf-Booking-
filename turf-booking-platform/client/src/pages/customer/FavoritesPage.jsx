import React from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Trophy,
  ChevronRight,
  Loader2,
  AlertCircle,
  Compass,
  ArrowLeft,
} from 'lucide-react'
import { useQuery } from '../../hooks/useApi'
import customerInventoryService from '../../services/customer/inventory.service'
import { TurfCard } from '../../components/customer/TurfCard'

export const FavoritesPage = () => {
  const {
    data: favorites = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userFavorites'],
    queryFn: () => customerInventoryService.getFavorites(),
  })

  // Filter out any deactivated or null turfs safely
  const activeFavorites = Array.isArray(favorites)
    ? favorites.filter((turf) => turf && turf._id && turf.isActive !== false)
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8E3]">
        <div className="space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-xs font-semibold text-[#526258] hover:text-[#267A45] border border-[#D7E0D9] shadow-2xs transition-all w-fit group cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#267A45] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] shrink-0">
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
              Saved Favourites
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#526258]">
            Quickly access and book your preferred sports turf arenas.
          </p>
        </div>

        <Link
          to="/turfs"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Explore All Turfs</span>
        </Link>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-white border border-[#D7E0D9] overflow-hidden flex flex-col justify-between h-96 animate-pulse"
            >
              <div className="h-48 bg-[#EDF5EF]" />
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-[#EDF5EF] rounded w-3/4" />
                  <div className="h-3 bg-[#EDF5EF] rounded w-1/2" />
                </div>
                <div className="h-9 bg-[#EDF5EF] rounded-xl w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-[#922B27] mx-auto" />
          <h2 className="text-base font-bold text-[#17231B]">Failed to load favourites</h2>
          <p className="text-xs text-[#922B27]">
            {error?.response?.data?.error?.message ||
              error?.message ||
              'Unable to retrieve your saved favourite turfs.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-white text-xs font-semibold text-[#17231B] border border-[#D7E0D9] hover:bg-[#F0F6F1] transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : activeFavorites.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#D7E0D9] text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27]">
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#17231B]">No Favourite Turfs Saved Yet</h2>
            <p className="text-xs text-[#526258] max-w-md mx-auto mt-1 leading-relaxed">
              When exploring sports arenas, click the heart icon on any turf card to save it here for fast, one-click access and booking.
            </p>
          </div>
          <Link
            to="/turfs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold text-xs shadow-xs transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Turfs</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#526258]">
            <span>
              Showing <strong className="text-[#17231B] font-bold">{activeFavorites.length}</strong>{' '}
              {activeFavorites.length === 1 ? 'favourite arena' : 'favourite arenas'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeFavorites.map((turf) => (
              <TurfCard
                key={turf._id}
                turf={turf}
                isFavorite={true}
                onFavoriteToggle={() => refetch()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FavoritesPage

