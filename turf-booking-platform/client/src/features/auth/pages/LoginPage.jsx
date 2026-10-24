import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowRight, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
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
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Success message if user was redirected from registration
  const registrationSuccess = location.state?.registered
  const prefilledEmail = location.state?.email || ''

  const fromPath = location.state?.from?.pathname || '/'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true })
    }
  }, [isAuthenticated, navigate, fromPath])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: prefilledEmail,
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur',
  })

  // Set prefilled email if navigating from registration
  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail)
    }
  }, [prefilledEmail, setValue])

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      await login(data.email, data.password)
      navigate(fromPath, { replace: true })
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Registration Success Banner */}
        {registrationSuccess && !serverError && (
          <div
            role="status"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-200">Account Created Successfully</p>
              <p>Please enter your password to sign in.</p>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Sign In Failed</p>
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
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-slate-200">
            <input
              type="checkbox"
              id="rememberMe"
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 focus:ring-2 cursor-pointer"
              {...register('rememberMe')}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowForgotNotice(true)}
            className="text-emerald-400 hover:text-emerald-300 font-semibold focus-visible:outline-none focus-visible:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Informative notice if user clicks Forgot Password */}
        {showForgotNotice && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-slate-200">Password Reset Info</p>
              <p className="text-slate-400">
                Self-service password recovery is currently being activated. Please contact the facility support team if you cannot access your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotNotice(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold px-1"
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

        {/* Navigation to Registration */}
        <div className="text-center pt-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
