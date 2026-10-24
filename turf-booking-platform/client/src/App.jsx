import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { LandingPlaceholder } from './pages/public/LandingPlaceholder'
import { NotFoundPage } from './pages/public/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing View */}
        <Route path="/" element={<LandingPlaceholder />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Catch-all Not Found Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
