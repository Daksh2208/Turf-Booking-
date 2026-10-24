import React from 'react'
import { Outlet } from 'react-router-dom'
import { CustomerNavbar } from '../components/customer/CustomerNavbar'
import { CustomerFooter } from '../components/customer/CustomerFooter'

export const CustomerLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F8F6] text-[#17231B] selection:bg-[#267A45] selection:text-white">
      <CustomerNavbar />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <CustomerFooter />
    </div>
  )
}

export default CustomerLayout
