import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950/80 to-slate-950 -z-10 pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-emerald-950/30">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Tailwind CSS v4 Configured
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Turf Booking <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Platform</span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Dynamic sports turf reservation engine with live pricing, slot states (Available / Booked / Blocked), and real-time Admin Panel control.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            Interactive Test: {count}
          </button>
          <span className="px-4 py-2.5 rounded-xl bg-slate-800/80 text-slate-300 text-sm font-medium border border-slate-700/60">
            Cricket • Football • Pickleball • Badminton
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
