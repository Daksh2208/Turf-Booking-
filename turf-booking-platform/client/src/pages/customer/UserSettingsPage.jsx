import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  User,
  Mail,
  Shield,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Home,
  Phone,
  Lock,
  Save,
  KeyRound,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import authService from '../../services/auth.service'
import { FormField } from '../../components/common/FormField'
import { PasswordInput } from '../../components/common/PasswordInput'

export const UserSettingsPage = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Profile Edit State
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordErr, setPasswordErr] = useState('')
  const [fieldPasswordErrors, setFieldPasswordErrors] = useState({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Auto-dismiss refs for success messages (dismisses after ~3s)
  const profileMsgTimeoutRef = useRef(null)
  const passwordMsgTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (profileMsgTimeoutRef.current) clearTimeout(profileMsgTimeoutRef.current)
      if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)
    }
  }, [])

  // Real-time progressive validation for new password
  const getNewPasswordError = (pwd, currentPwd) => {
    if (!pwd) return null
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Za-z]/.test(pwd)) return 'Password must contain at least one letter'
    if (!/\d/.test(pwd)) return 'Password must contain at least one number'
    if (!/[^A-Za-z0-9]/.test(pwd))
      return 'Password must contain at least one special character (e.g. !@#$)'
    if (currentPwd && pwd === currentPwd)
      return 'New password cannot be the same as current password'
    return null
  }

  const newPasswordValidationError = getNewPasswordError(newPassword, currentPassword)
  const isNewPasswordCriteriaMet = Boolean(newPassword) && !newPasswordValidationError

  const isConfirmPasswordMatched =
    Boolean(confirmPassword) &&
    Boolean(newPassword) &&
    confirmPassword === newPassword &&
    isNewPasswordCriteriaMet

  const confirmPasswordError =
    confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match' : null

  // Clear server alerts and field errors when typing
  const handleCurrentPasswordChange = (val) => {
    setCurrentPassword(val)
    setPasswordErr('')
    setPasswordMsg('')
    if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)
    if (fieldPasswordErrors.currentPassword) {
      setFieldPasswordErrors((prev) => ({ ...prev, currentPassword: '' }))
    }
  }

  const handleNewPasswordChange = (val) => {
    setNewPassword(val)
    setPasswordErr('')
    setPasswordMsg('')
    if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)
    if (fieldPasswordErrors.newPassword) {
      setFieldPasswordErrors((prev) => ({ ...prev, newPassword: '' }))
    }
  }

  const handleConfirmPasswordChange = (val) => {
    setConfirmPassword(val)
    setPasswordErr('')
    setPasswordMsg('')
    if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)
    if (fieldPasswordErrors.confirmPassword) {
      setFieldPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }))
    }
  }

  const handleNameChange = (val) => {
    setName(val)
    setProfileErr('')
    setProfileMsg('')
    if (profileMsgTimeoutRef.current) clearTimeout(profileMsgTimeoutRef.current)
  }

  const handlePhoneChange = (val) => {
    setPhone(val)
    setProfileErr('')
    setProfileMsg('')
    if (profileMsgTimeoutRef.current) clearTimeout(profileMsgTimeoutRef.current)
  }

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || '')
    }
  }, [user])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    if (profileMsgTimeoutRef.current) clearTimeout(profileMsgTimeoutRef.current)

    if (name.trim().length < 2) {
      setProfileErr('Name must be at least 2 characters.')
      return
    }

    if (phone.trim()) {
      const raw = phone.trim().replace(/(?!^\+)[^\d]/g, '')
      const nat = raw.startsWith('+91') ? raw.slice(3) : raw.startsWith('+') ? raw.slice(1) : raw
      if (nat.startsWith('0')) {
        setProfileErr("Please remove leading '0'. Indian mobile numbers start with 6–9.")
        return
      }
      if (!/^[6-9]/.test(nat)) {
        setProfileErr('Indian mobile numbers must start with 6, 7, 8, or 9.')
        return
      }
      if (nat.length !== 10) {
        setProfileErr(`Mobile number must be exactly 10 digits (${nat.length} entered).`)
        return
      }
    }

    try {
      setIsSavingProfile(true)
      await authService.updateProfile({ name: name.trim(), phone: phone.trim() })
      setProfileMsg('Profile updated successfully.')
      if (profileMsgTimeoutRef.current) clearTimeout(profileMsgTimeoutRef.current)
      profileMsgTimeoutRef.current = setTimeout(() => {
        setProfileMsg('')
      }, 3000)
    } catch (err) {
      setProfileErr(err.response?.data?.error?.message || 'Failed to update profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')
    setPasswordErr('')
    if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)

    const errors = {}
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required.'
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required.'
    } else if (newPasswordValidationError) {
      errors.newPassword = newPasswordValidationError
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.'
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldPasswordErrors(errors)
      return
    }

    try {
      setIsChangingPassword(true)
      const res = await authService.changePassword({ currentPassword, newPassword })
      setPasswordMsg(res?.message || 'Password changed successfully.')
      if (passwordMsgTimeoutRef.current) clearTimeout(passwordMsgTimeoutRef.current)
      passwordMsgTimeoutRef.current = setTimeout(() => {
        setPasswordMsg('')
      }, 3000)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFieldPasswordErrors({})
    } catch (err) {
      setPasswordErr(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to change password. Please verify current password.'
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#17231B] flex flex-col font-sans selection:bg-[#267A45] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[#E2E8E3] bg-white sticky top-0 z-40 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] shadow-xs group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4 text-[#267A45]" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-[#17231B] block">
                TURF<span className="text-[#267A45]">SPOT</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#526258]">
                Account Settings
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin/sports"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1D6537] bg-[#E7F3E9] hover:bg-[#C9DFCE] border border-[#C9DFCE] transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#267A45]" />
                <span className="hidden sm:inline">Admin Console</span>
              </Link>
            )}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#17231B] hover:bg-[#F0F6F1] bg-white border border-[#D7E0D9] transition-all shadow-xs"
              title="Return to Home"
            >
              <Home className="w-3.5 h-3.5 text-[#267A45]" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        {/* Header Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#17231B] tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#526258]">
            Manage your personal profile, credentials, and active session.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8E3]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] flex items-center justify-center text-[#267A45] text-2xl font-black shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#17231B]">{user?.name || 'User Profile'}</h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#E7F3E9] text-[#1D6537] border border-[#C9DFCE]">
                    {user?.role || 'Customer'}
                  </span>
                </div>
                <p className="text-xs text-[#526258]">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#1D6537] bg-[#E7F3E9] border border-[#C9DFCE] px-3 py-1.5 rounded-xl self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#267A45]" />
              <span className="font-semibold">Active Account</span>
            </div>
          </div>

          {/* User Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-1">
              <span className="text-[11px] font-semibold text-[#526258] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#267A45]" />
                Full Name
              </span>
              <p className="text-sm font-semibold text-[#17231B]">{user?.name || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-1">
              <span className="text-[11px] font-semibold text-[#526258] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#267A45]" />
                Email Address
              </span>
              <p className="text-sm font-semibold text-[#17231B]">{user?.email || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-1">
              <span className="text-[11px] font-semibold text-[#526258] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#267A45]" />
                Phone Number
              </span>
              <p className="text-sm font-semibold text-[#17231B]">{user?.phone || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#D7E0D9] space-y-1">
              <span className="text-[11px] font-semibold text-[#526258] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#267A45]" />
                Account Role
              </span>
              <p className="text-sm font-semibold text-[#267A45] capitalize">
                {user?.role || 'Customer'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile & Password Update Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edit Profile Form */}
          <div className="p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#17231B] flex items-center gap-2">
              <User className="w-4 h-4 text-[#267A45]" />
              <span>Update Profile</span>
            </h3>

            {profileMsg && (
              <div className="p-2.5 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
                <span>{profileMsg}</span>
              </div>
            )}
            {profileErr && (
              <div className="p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
                <span>{profileErr}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#17231B] font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white border border-[#D7E0D9] rounded-xl px-3 py-2 text-[#17231B] focus:outline-none focus:border-[#267A45]"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#17231B] font-semibold text-xs">Mobile Phone</label>
                  <span className="text-[10px] text-[#526258]">India (starts with 6–9, 10 digits)</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={phone?.startsWith('+91') ? 13 : 10}
                  value={phone}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Backspace' ||
                      e.key === 'Delete' ||
                      e.key === 'Tab' ||
                      e.key === 'ArrowLeft' ||
                      e.key === 'ArrowRight' ||
                      e.key === 'Enter' ||
                      e.key === 'Home' ||
                      e.key === 'End' ||
                      (e.ctrlKey || e.metaKey)
                    ) return
                    if (e.key === '+' && e.target.selectionStart === 0 && !e.target.value.includes('+')) return
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault()
                      return
                    }
                    const maxLen = e.target.value.startsWith('+91') ? 13 : 10
                    const selected = (e.target.selectionEnd || 0) - (e.target.selectionStart || 0)
                    if (e.target.value.length >= maxLen && selected === 0) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const pasted = (e.clipboardData?.getData('text') || '').trim()
                    const sanitized = pasted.replace(/(?!^\+)[^\d]/g, '')
                    const maxLen = sanitized.startsWith('+91') ? 13 : 10
                    handlePhoneChange(sanitized.slice(0, maxLen))
                  }}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/(?!^\+)[^\d]/g, '')
                    const maxLen = sanitized.startsWith('+91') ? 13 : 10
                    handlePhoneChange(sanitized.slice(0, maxLen))
                  }}
                  className="w-full bg-white border border-[#D7E0D9] rounded-xl px-3 py-2 text-xs text-[#17231B] focus:outline-none focus:border-[#267A45] font-mono"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Profile</span>
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#17231B] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#267A45]" />
              <span>Change Password</span>
            </h3>

            {passwordMsg && (
              <div className="p-2.5 rounded-xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0" />
                <span>{passwordMsg}</span>
              </div>
            )}
            {passwordErr && (
              <div className="p-2.5 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0" />
                <span>{passwordErr}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <FormField
                label="Current Password"
                htmlFor="currentPassword"
                required
                error={fieldPasswordErrors.currentPassword}
              >
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => handleCurrentPasswordChange(e.target.value)}
                  error={fieldPasswordErrors.currentPassword}
                />
              </FormField>

              <FormField
                label="New Password"
                htmlFor="newPassword"
                required
                error={fieldPasswordErrors.newPassword || newPasswordValidationError}
                success={isNewPasswordCriteriaMet ? 'Strong password' : undefined}
              >
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  placeholder="Min 8 chars, letter, number, special char"
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  error={fieldPasswordErrors.newPassword || newPasswordValidationError}
                  success={isNewPasswordCriteriaMet}
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                htmlFor="confirmPassword"
                required
                error={fieldPasswordErrors.confirmPassword || confirmPasswordError}
                success={isConfirmPasswordMatched ? 'Passwords match' : undefined}
              >
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  error={fieldPasswordErrors.confirmPassword || confirmPasswordError}
                  success={isConfirmPasswordMatched}
                />
              </FormField>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 rounded-xl bg-[#267A45] hover:bg-[#1E6338] text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>


        {/* Admin Quick Action Card (shown only if admin) */}
        {isAdmin && (
          <div className="p-6 rounded-2xl bg-[#EDF5EF] border border-[#C9DFCE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#267A45]" />
                <h3 className="text-sm font-bold text-[#17231B]">Administrator Management</h3>
              </div>
              <p className="text-xs text-[#526258]">
                You have elevated privileges to configure sports, turfs, add-ons, banners, and business settings.
              </p>
            </div>
            <Link
              to="/admin/dashboard"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#267A45] hover:bg-[#1E6338] shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>Open Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Session Management & Sign Out Section */}
        <div className="p-6 rounded-2xl bg-white border border-[#D7E0D9] shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#17231B] flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[#922B27]" />
              <span>Session & Logout</span>
            </h3>
            <p className="text-xs text-[#526258]">
              Sign out of this session. You will need your email and password to log back in.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FDF0EF] border border-[#F8D2CE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#922B27]">Current Active Session</p>
              <p className="text-[11px] text-[#922B27]/80">
                Connected from current browser. Revokes the active refresh token.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#922B27] hover:bg-[#78231F] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UserSettingsPage
