import React from 'react'
import { Activity, ShieldCheck, Users } from 'lucide-react'

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-xl w-full text-center space-y-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>Step 1: Project Initialized</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Turf Booking <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Platform</span>
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed">
          Production foundation ready. Separate architecture prepared for Customer experience and Admin control panel.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <Users className="w-4 h-4" />
              <span>Customer Portal</span>
            </div>
            <p className="text-xs text-slate-400">Turf booking, live pricing & availability engine</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
            <div className="flex items-center gap-2 text-teal-400 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </div>
            <p className="text-xs text-slate-400">Real-time inventory, rates, slots & settings control</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
