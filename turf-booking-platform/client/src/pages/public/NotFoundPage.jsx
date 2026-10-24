import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#17231B] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6 bg-white border border-[#D7E0D9] rounded-3xl p-8 shadow-xs">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] flex items-center justify-center text-[#922B27] text-2xl font-black">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#17231B]">Page Not Found</h1>
          <p className="text-sm text-[#526258]">
            The requested page does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F6F1] text-[#17231B] text-sm font-semibold border border-[#D7E0D9] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#267A45]" />
            <span>Go to Home</span>
          </Link>
          <Link
            to="/login"
            className="px-4 py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
