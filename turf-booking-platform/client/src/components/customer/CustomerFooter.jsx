import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '../../hooks/useApi'
import {
  Trophy,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react'
import customerInventoryService from '../../services/customer/inventory.service'

export const CustomerFooter = () => {
  const { data: settings } = useQuery({
    queryKey: ['publicBusinessSettings'],
    queryFn: () => customerInventoryService.getSettings(),
  })

  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs">
      {/* Top Footer Banner Highlights */}
      <div className="border-b border-slate-800/60 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Real-Time Slot Engine</h4>
              <p className="text-[11px] text-slate-400">Instant availability with automated peak & weekend pricing.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Conflict-Free Guarantee</h4>
              <p className="text-[11px] text-slate-400">Strict overlap checking protects your reserved matches.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Standardized Operating Hours</h4>
              <p className="text-[11px] text-slate-400">Full day and overnight sessions in {settings?.timezone || 'Asia/Kolkata'}.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Contact Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                TURF<span className="text-emerald-400">SPOT</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Premium sports turf booking platform connecting players to box cricket, football, pickleball, and badminton arenas with live availability.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Discover Arenas
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/turfs" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>Browse All Turfs</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600" />
                </Link>
              </li>
              <li>
                <Link to="/turfs?sport=box-cricket" className="hover:text-emerald-400 transition-colors">
                  Box Cricket Arenas
                </Link>
              </li>
              <li>
                <Link to="/turfs?sport=football" className="hover:text-emerald-400 transition-colors">
                  Football Pitches
                </Link>
              </li>
              <li>
                <Link to="/turfs?sport=pickleball" className="hover:text-emerald-400 transition-colors">
                  Pickleball Courts
                </Link>
              </li>
              <li>
                <Link to="/turfs?sport=badminton" className="hover:text-emerald-400 transition-colors">
                  Badminton Courts
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/#how-it-works" className="hover:text-emerald-400 transition-colors">
                  How Booking Works
                </a>
              </li>
              <li>
                <span className="text-slate-500">Live Slot Engine (Part 8)</span>
              </li>
              <li>
                <span className="text-slate-500">Dynamic Pricing Rules (Part 7)</span>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Player Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Register Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Contact Details from Settings API */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Business & Support
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {settings?.businessName && (
                <li className="font-semibold text-white">
                  {settings.businessName}
                </li>
              )}
              {settings?.supportEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-emerald-400 transition-colors">
                    {settings.supportEmail}
                  </a>
                </li>
              )}
              {settings?.supportPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a href={`tel:${settings.supportPhone}`} className="hover:text-emerald-400 transition-colors font-mono">
                    {settings.supportPhone}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {[
                      settings.address.street,
                      settings.address.city,
                      settings.address.state,
                      settings.address.zipCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {currentYear} {settings?.businessName || 'TurfSpot Arena Platform'}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-slate-400">Timezone: {settings?.timezone || 'Asia/Kolkata'}</span>
            <span className="text-slate-700">•</span>
            <span>Security: HttpOnly JWT Authentication</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default CustomerFooter
