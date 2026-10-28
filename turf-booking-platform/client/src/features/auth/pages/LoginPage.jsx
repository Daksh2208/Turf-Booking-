import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowRight, Info, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { FormField } from '../../../components/common/FormField'
import { Input } from '../../../components/common/Input'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { Button } from '../../../components/common/Button'
import { loginValidationRules } from '../schemas/auth.schemas'
import { useAuth } from '../../../hooks/useAuth'

export const LoginPage = () => {
  const [serverError, setServerError] = useState(null)
  const [showForgotNotice, setShowForgotNotice] = useState(false)
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Success message if user was redirected from registration
  const registrationSuccess = location.state?.registered
  const prefilledEmail = location.state?.email || ''

  const rawFrom = location.state?.from
  const fromPath =
    typeof rawFrom === 'string'
      ? rawFrom
      : rawFrom?.pathname
        ? `${rawFrom.pathname}${rawFrom.search || ''}`
        : null

  // Determine post-login destination based on user role
  const getDestination = (role, targetPath) => {
    // Admin must strictly land on the dashboard as their primary view
    if (role === 'admin') {
      return '/admin/dashboard'
    }
    return targetPath && !targetPath.startsWith('/admin') ? targetPath : '/'
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = user.role === 'admin' ? '/admin/dashboard' : getDestination(user.role, fromPath)
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, user, navigate, fromPath])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: prefilledEmail,
      password: '',
      rememberMe: false,
    },
    mode: 'onChange',
  })

  // Clear server error whenever user changes inputs
  useEffect(() => {
    if (!serverError) return
    const subscription = watch(() => {
      setServerError(null)
    })
    return () => subscription.unsubscribe()
  }, [watch, serverError])

  // Set prefilled email if navigating from registration
  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail)
    }
  }, [prefilledEmail, setValue])

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const loggedInUser = await login(data.email.trim(), data.password)
      const role = loggedInUser?.role || user?.role
      const destination = role === 'admin' ? '/admin/dashboard' : getDestination(role, fromPath)
      navigate(destination, { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Unable to sign in. Please verify your email and password.'
      setServerError(message)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to reserve slots, manage bookings, and access member rates."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Registration Success Banner */}
        {registrationSuccess && !serverError && (
          <div
            role="status"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#E7F3E9] border border-[#C9DFCE] text-[#1D6537] text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#17231B]">Account Created Successfully</p>
              <p className="text-[#1D6537]">Please enter your password to sign in.</p>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs leading-relaxed animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#922B27]">Sign In Failed</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        {/* Email Field */}
        <FormField
          label="Email Address"
          htmlFor="email"
          required
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email?.message}
            {...register('email', loginValidationRules.email)}
          />
        </FormField>

        {/* Password Field */}
        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password', loginValidationRules.password)}
          />
        </FormField>

        {/* Remember Me & Forgot Password Placeholder */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#46564A] hover:text-[#17231B]">
            <input
              type="checkbox"
              id="rememberMe"
              className="w-4 h-4 rounded border-[#D7E0D9] bg-white text-[#267A45] focus:ring-[#267A45]/20 focus:ring-offset-0 focus:ring-2 cursor-pointer"
              {...register('rememberMe')}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowForgotNotice(true)}
            className="text-[#267A45] hover:text-[#1E6338] font-semibold focus-visible:outline-none focus-visible:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Informative notice if user clicks Forgot Password */}
        {showForgotNotice && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F0F4F1] border border-[#D7E0D9] text-xs text-[#46564A]">
            <Info className="w-4 h-4 text-[#267A45] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#17231B]">Password Reset Info</p>
              <p className="text-[#526258]">
                Self-service password recovery is currently being activated. Please contact the facility support team if you cannot access your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotNotice(false)}
              className="text-[#526258] hover:text-[#17231B] text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <span>Sign In to Account</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>

        {/* Navigation to Registration & Back to Home */}
        <div className="text-center pt-3 border-t border-[#E2E8E3] space-y-2">
          <p className="text-xs text-[#526258]">
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              state={{ from: location.state?.from }}
              className="font-semibold text-[#267A45] hover:text-[#1E6338] transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Create Account
            </Link>
          </p>

          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526258] hover:text-[#267A45] transition-colors py-1 px-3 rounded-xl hover:bg-[#F0F6F1] group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#267A45] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
