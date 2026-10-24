import React from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Trophy,
} from 'lucide-react'

export const TurfCard = ({ turf }) => {
  if (!turf) return null

  const startingPrice = turf.pricing?.baseRate
    ? `₹${(turf.pricing.baseRate / 100).toFixed(0)}`
    : '₹800'

  const primaryImage =
    turf.images && turf.images.length > 0 && turf.images[0]
      ? turf.images[0]
      : 'https://images.unsplash.com/photo-1529900245534-47fbf76681e0?auto=format&fit=crop&w=800&q=80'

  const locationText = [turf.address?.street, turf.address?.city]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="group rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/20 backdrop-blur-md">
      {/* Top Image Preview with Overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950">
        <img
          src={primaryImage}
          alt={turf.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Operating Hours Tag */}
        {turf.openingHours && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-[10px] font-semibold text-slate-300 flex items-center gap-1 shadow-sm">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>
              {turf.openingHours.open} - {turf.openingHours.close}
            </span>
          </div>
        )}

        {/* Starting Price Pill */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 text-xs font-mono font-bold shadow-md shadow-slate-950/50 flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-sans font-normal">From</span>
          <span className="text-emerald-400 font-black">{startingPrice}</span>
          <span className="text-[10px] text-slate-500 font-sans">/hr</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Sports Supported Badges */}
          {turf.sports && turf.sports.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {turf.sports.slice(0, 3).map((sport) => {
                const sportName = typeof sport === 'object' ? sport.name : 'Sport'
                const sportId = typeof sport === 'object' ? sport._id : sport
                return (
                  <span
                    key={sportId || sportName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    <Trophy className="w-2.5 h-2.5 shrink-0" />
                    <span>{sportName}</span>
                  </span>
                )
              })}
              {turf.sports.length > 3 && (
                <span className="text-[10px] text-slate-500 font-semibold">
                  +{turf.sports.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Turf Name */}
          <Link to={`/turfs/${turf.slug || turf._id}`}>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
              {turf.name}
            </h3>
          </Link>

          {/* Area / Location */}
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{locationText || turf.address?.city || 'Sports Arena'}</span>
          </p>

          {/* Specs / Surface */}
          {(turf.size || turf.surface) && (
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
              {turf.size && (
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-medium">
                  {turf.size}
                </span>
              )}
              {turf.surface && (
                <span className="text-slate-400 font-medium truncate">
                  {turf.surface}
                </span>
              )}
            </div>
          )}

          {/* Facilities Preview */}
          {turf.facilities && turf.facilities.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1.5">
              {turf.facilities.slice(0, 3).map((facility, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] text-slate-300 font-medium border border-slate-700/60"
                >
                  {facility}
                </span>
              ))}
              {turf.facilities.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
                  +{turf.facilities.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <Link
            to={`/turfs/${turf.slug || turf._id}`}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-emerald-600 text-slate-200 hover:text-white font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 group/btn shadow-sm"
          >
            <span>View Details & Slots</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TurfCard
