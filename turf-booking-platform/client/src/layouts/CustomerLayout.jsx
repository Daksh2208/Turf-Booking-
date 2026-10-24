import React from 'react'
import { Outlet } from 'react-router-dom'
import { CustomerNavbar } from '../components/customer/CustomerNavbar'
import { CustomerFooter } from '../components/customer/CustomerFooter'

export const CustomerLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <CustomerNavbar />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <CustomerFooter />
    </div>
  )
}

export default CustomerLayout
