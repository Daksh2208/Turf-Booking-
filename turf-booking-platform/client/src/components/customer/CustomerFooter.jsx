import React from 'react'
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

  const { data: sports = [] } = useQuery({
    queryKey: ['publicSports'],
    queryFn: () => customerInventoryService.getSports(),
  })

  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-[#D7E0D9] bg-white text-[#526258] text-xs">
      {/* Top Footer Banner Highlights */}
      <div className="border-b border-[#E2E8E3] bg-[#F6F8F6] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
              <Zap className="w-5 h-5 text-[#267A45]" />
            </div>
            <div>
              <h4 className="font-bold text-[#17231B] text-sm">Real-Time Slot Engine</h4>
              <p className="text-[11px] text-[#526258]">Instant availability with automated peak & weekend pricing.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#267A45]" />
            </div>
            <div>
              <h4 className="font-bold text-[#17231B] text-sm">Conflict-Free Guarantee</h4>
              <p className="text-[11px] text-[#526258]">Strict overlap checking protects your reserved matches.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shrink-0">
              <Clock className="w-5 h-5 text-[#267A45]" />
            </div>
            <div>
              <h4 className="font-bold text-[#17231B] text-sm">Standardized Operating Hours</h4>
              <p className="text-[11px] text-[#526258]">Full day and overnight sessions in {settings?.timezone || 'Asia/Kolkata'}.</p>
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
              <div className="w-8 h-8 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45]">
                <Trophy className="w-4 h-4 text-[#267A45]" />
              </div>
              <span className="text-lg font-black tracking-tight text-[#17231B]">
                TURF<span className="text-[#267A45]">SPOT</span>
              </span>
            </Link>
            <p className="text-xs text-[#526258] leading-relaxed">
              {settings?.aboutText ||
                'Premium sports turf booking platform connecting players to sports arenas with live availability.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
              Discover Arenas
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/turfs" className="text-[#46564A] hover:text-[#267A45] transition-colors flex items-center gap-1">
                  <span>Browse All Turfs</span>
                  <ArrowUpRight className="w-3 h-3 text-[#647168]" />
                </Link>
              </li>
              {sports.slice(0, 5).map((sport) => (
                <li key={sport._id || sport.slug}>
                  <Link
                    to={`/turfs?sport=${sport.slug}`}
                    className="text-[#46564A] hover:text-[#267A45] transition-colors"
                  >
                    {sport.name} Arenas
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/#how-it-works" className="text-[#46564A] hover:text-[#267A45] transition-colors">
                  How Booking Works
                </Link>
              </li>
              <li>
                <span className="text-[#647168]">Live Slot Engine</span>
              </li>
              <li>
                <span className="text-[#647168]">Dynamic Pricing Rules</span>
              </li>
              <li>
                <Link to="/login" className="text-[#46564A] hover:text-[#267A45] transition-colors">
                  Player Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-[#46564A] hover:text-[#267A45] transition-colors">
                  Register Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Contact Details from Settings API */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17231B]">
              Business & Support
            </h4>
            <ul className="space-y-2.5 text-xs text-[#526258]">
              {settings?.businessName && (
                <li className="font-semibold text-[#17231B]">
                  {settings.businessName}
                </li>
              )}
              {settings?.supportEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                  <a href={`mailto:${settings.supportEmail}`} className="text-[#46564A] hover:text-[#267A45] transition-colors">
                    {settings.supportEmail}
                  </a>
                </li>
              )}
              {settings?.supportPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#267A45] shrink-0" />
                  <a href={`tel:${settings.supportPhone}`} className="text-[#46564A] hover:text-[#267A45] transition-colors font-mono">
                    {settings.supportPhone}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#267A45] shrink-0 mt-0.5" />
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
        <div className="border-t border-[#E2E8E3] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#647168]">
          <p>© {currentYear} {settings?.businessName || 'TurfSpot Arena Platform'}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[#526258]">Timezone: {settings?.timezone || 'Asia/Kolkata'}</span>
            <span className="text-[#D7E0D9]">•</span>
            <span>Security: HttpOnly JWT Authentication</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default CustomerFooter
