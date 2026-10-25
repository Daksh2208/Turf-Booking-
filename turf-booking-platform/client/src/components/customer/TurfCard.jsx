import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Trophy,
  Lock,
  Check,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const TurfCard = ({ turf, activeSportSlug }) => {
  const { isAuthenticated } = useAuth()

  if (!turf) return null

  const targetLink = isAuthenticated ? `/turfs/${turf.slug || turf._id}` : '/register'

  const startingPrice =
    turf.pricing?.baseRate != null
      ? `₹${(turf.pricing.baseRate / 100).toFixed(0)}`
      : '₹0'

  const primaryImage =
    turf.images && turf.images.length > 0 && turf.images[0]
      ? turf.images[0]
      : null

  const locationText = [turf.address?.street, turf.address?.city]
    .filter(Boolean)
    .join(', ')

  const sortedSports = useMemo(() => {
    if (!turf?.sports || !Array.isArray(turf.sports)) return []
    if (!activeSportSlug) return turf.sports
    return [...turf.sports].sort((a, b) => {
      const aSlug = typeof a === 'object' ? a.slug : ''
      const bSlug = typeof b === 'object' ? b.slug : ''
      if (aSlug === activeSportSlug) return -1
      if (bSlug === activeSportSlug) return 1
      return 0
    })
  }, [turf?.sports, activeSportSlug])

  return (
    <div className="group rounded-2xl bg-white border border-[#D7E0D9] hover:border-[#267A45]/60 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Top Image Preview with Overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-[#EDF5EF] flex items-center justify-center">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={turf.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#EDF5EF] flex flex-col items-center justify-center gap-2 text-[#526258]">
            <Trophy className="w-12 h-12 text-[#267A45]/30" />
            <span className="text-[11px] font-semibold text-[#526258] uppercase tracking-wider">
              {turf.name}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Operating Hours Tag */}
        {turf.openingHours && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#D7E0D9] text-[10px] font-semibold text-[#17231B] flex items-center gap-1 shadow-xs">
            <Clock className="w-3 h-3 text-[#267A45]" />
            <span>
              {turf.openingHours.open} - {turf.openingHours.close}
            </span>
          </div>
        )}


        {/* Starting Price Pill */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#C9DFCE] text-xs font-mono font-bold shadow-xs flex items-center gap-1">
          <span className="text-[10px] text-[#526258] font-sans font-normal">From</span>
          <span className="text-[#267A45] font-black text-sm">{startingPrice}</span>
          <span className="text-[10px] text-[#647168] font-sans">/hr</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Sports Supported Badges */}
          {sortedSports.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {sortedSports.slice(0, 3).map((sport) => {
                const sportName = typeof sport === 'object' ? sport.name : 'Sport'
                const sportId = typeof sport === 'object' ? sport._id : sport
                const sportSlug = typeof sport === 'object' ? sport.slug : ''
                const isMatched = activeSportSlug && sportSlug === activeSportSlug

                return isMatched ? (
                  <span
                    key={sportId || sportName}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#267A45] text-white shadow-2xs"
                    title="Matched your active sport filter"
                  >
                    <Check className="w-2.5 h-2.5 shrink-0 stroke-[3]" />
                    <span>{sportName}</span>
                  </span>
                ) : (
                  <span
                    key={sportId || sportName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]"
                  >
                    <Trophy className="w-2.5 h-2.5 shrink-0 text-[#267A45]" />
                    <span>{sportName}</span>
                  </span>
                )
              })}
              {sortedSports.length > 3 && (
                <span className="text-[10px] text-[#526258] font-semibold">
                  +{sortedSports.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Turf Name */}
          <Link to={targetLink} state={{ from: `/turfs/${turf.slug || turf._id}` }}>
            <h3 className="text-base font-bold text-[#17231B] group-hover:text-[#267A45] transition-colors line-clamp-1">
              {turf.name}
            </h3>
          </Link>

          {/* Area / Location */}
          <p className="text-xs text-[#46564A] mt-1 flex items-center gap-1.5 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
            <span>{locationText || turf.address?.city || 'Sports Arena'}</span>
          </p>

          {/* Specs / Surface / Capacity */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#526258]">
            {turf.size && (
              <span className="px-2 py-0.5 rounded-md bg-[#F6F8F6] border border-[#D7E0D9] text-[#46564A] font-medium">
                {turf.size}
              </span>
            )}
            {turf.capacity && (
              <span className="px-2 py-0.5 rounded-md bg-[#F6F8F6] border border-[#D7E0D9] text-[#46564A] font-medium">
                Max {turf.capacity.maxPlayers || 22} Players
              </span>
            )}
            {turf.surface && (
              <span className="text-[#526258] font-medium truncate">
                {turf.surface}
              </span>
            )}
          </div>

          {/* Facilities Preview */}
          {turf.facilities && turf.facilities.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#E2E8E3] flex flex-wrap gap-1.5">
              {turf.facilities.slice(0, 3).map((facility, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-[#F0F4F1] text-[10px] text-[#526258] font-medium border border-[#D7E0D9]"
                >
                  {facility}
                </span>
              ))}
              {turf.facilities.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-[#647168] font-medium">
                  +{turf.facilities.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <Link
            to={targetLink}
            state={{ from: `/turfs/${turf.slug || turf._id}` }}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 group/btn shadow-xs cursor-pointer ${
              isAuthenticated
                ? 'bg-[#267A45] hover:bg-[#1E6338] text-white'
                : 'bg-[#E7F3E9] hover:bg-[#C9DFCE] text-[#1D6537] border border-[#C9DFCE]'
            }`}
          >
            {isAuthenticated ? (
              <>
                <span>View Details & Slots</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#267A45]" />
                <span>Sign Up to Book Slots</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TurfCard
