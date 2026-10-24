import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { User, Mail, ArrowRight, Check, X, AlertCircle } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { FormField } from '../../../components/common/FormField'
import { Input } from '../../../components/common/Input'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { Button } from '../../../components/common/Button'
import { registerValidationRules } from '../schemas/auth.schemas'
import { useAuth } from '../../../hooks/useAuth'

export const RegisterPage = () => {
  const [serverError, setServerError] = useState(null)
  const { register: registerCustomer, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onBlur',
  })

  // Watch password value for dynamic requirements checklist and confirm password validation
  const passwordValue = watch('password') || ''
  const hasMinLength = passwordValue.length >= 8
  const hasLetter = /[A-Za-z]/.test(passwordValue)
  const hasNumber = /\d/.test(passwordValue)

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      await registerCustomer({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      })
      // Successful registration: navigate to login with state for immediate sign-in
      navigate('/login', {
        state: {
          registered: true,
          email: data.email.trim(),
        },
      })
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Registration could not be completed. Please try again.'
      setServerError(message)
    }
  }

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join to instantly book box cricket, football, pickleball, and badminton turfs with live price calculation."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Registration Failed</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        {/* Full Name Field */}
        <FormField
          label="Full Name"
          htmlFor="name"
          required
          error={errors.name?.message}
        >
          <Input
            id="name"
            placeholder="e.g. John Doe"
            icon={User}
            error={errors.name?.message}
            {...register('name', registerValidationRules.name)}
          />
        </FormField>

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
            {...register('email', registerValidationRules.email)}
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
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password', registerValidationRules.password)}
          />
        </FormField>

        {/* Password Strength Checklist */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
          <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
            Password Requirements
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
            <span
              className={`flex items-center gap-1.5 ${
                hasMinLength ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {hasMinLength ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>8+ characters</span>
            </span>

            <span
              className={`flex items-center gap-1.5 ${
                hasLetter ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {hasLetter ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>At least 1 letter</span>
            </span>

            <span
              className={`flex items-center gap-1.5 ${
                hasNumber ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {hasNumber ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>At least 1 number</span>
            </span>
          </div>
        </div>

        {/* Confirm Password Field */}
        <FormField
          label="Confirm Password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register(
              'confirmPassword',
              registerValidationRules.confirmPassword(passwordValue)
            )}
          />
        </FormField>

        {/* Terms and Conditions Checkbox */}
        <div className="space-y-1 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              id="acceptTerms"
              className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-2 cursor-pointer shrink-0"
              {...register('acceptTerms', registerValidationRules.acceptTerms)}
            />
            <span>
              I agree to the{' '}
              <span className="text-emerald-400 hover:underline">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-emerald-400 hover:underline">
                Cancellation Policy
              </span>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs text-rose-400 font-medium">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>

        {/* Navigation to Login */}
        <div className="text-center pt-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
