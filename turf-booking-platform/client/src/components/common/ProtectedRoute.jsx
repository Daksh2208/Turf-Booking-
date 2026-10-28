import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const ProtectedRoute = ({
  requireAdmin = false,
  requireCustomer = false,
  forbidAdmin = false,
  redirectTo = '/login',
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#267A45] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#526258] font-medium">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Admin-only route guard
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // Customer-only / Admin-blocked route guard
  if ((requireCustomer || forbidAdmin) && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children ? children : <Outlet />
}

export default ProtectedRoute
