import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { User, Mail, ArrowRight, Check, X, AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { FormField } from '../../../components/common/FormField'
import { Input } from '../../../components/common/Input'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { Button } from '../../../components/common/Button'
import { registerValidationRules } from '../schemas/auth.schemas'
import { useAuth } from '../../../hooks/useAuth'

export const RegisterPage = () => {
  const [serverError, setServerError] = useState(null)
  const { register: registerCustomer, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const rawFrom = location.state?.from
  const fromPath =
    typeof rawFrom === 'string'
      ? rawFrom
      : rawFrom?.pathname
        ? `${rawFrom.pathname}${rawFrom.search || ''}`
        : '/'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        const dest = fromPath && !fromPath.startsWith('/admin') ? fromPath : '/'
        navigate(dest, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate, fromPath])

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onChange',
  })

  // Watch password value for dynamic requirements checklist and instant confirm password validation
  const passwordValue = watch('password') || ''
  const confirmPasswordValue = watch('confirmPassword') || ''
  const isPasswordCriteriaMet =
    passwordValue.length >= 8 &&
    /[A-Za-z]/.test(passwordValue) &&
    /\d/.test(passwordValue) &&
    /[^A-Za-z0-9]/.test(passwordValue)

  // Re-trigger confirmPassword validation immediately whenever password or confirmPassword changes
  useEffect(() => {
    if (confirmPasswordValue) {
      trigger('confirmPassword')
    }
  }, [passwordValue, confirmPasswordValue, trigger])

  // Clear server error whenever user modifies inputs
  useEffect(() => {
    if (!serverError) return
    const subscription = watch(() => {
      setServerError(null)
    })
    return () => subscription.unsubscribe()
  }, [watch, serverError])

  const isPasswordMatched = Boolean(
    confirmPasswordValue &&
    passwordValue &&
    confirmPasswordValue === passwordValue &&
    !errors.confirmPassword
  )

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
          from: location.state?.from,
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
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FDF0EF] border border-[#F8D2CE] text-[#922B27] text-xs leading-relaxed animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-[#922B27] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#922B27]">Registration Failed</p>
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
          success={isPasswordCriteriaMet ? 'Strong password' : undefined}
        >
          <PasswordInput
            id="password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            success={isPasswordCriteriaMet}
            {...register('password', registerValidationRules.password)}
          />
        </FormField>

        {/* Confirm Password Field */}
        <FormField
          label="Confirm Password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
          success={isPasswordMatched ? 'Passwords match' : undefined}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            success={isPasswordMatched}
            {...register(
              'confirmPassword',
              registerValidationRules.confirmPassword(passwordValue)
            )}
          />
        </FormField>

        {/* Terms and Conditions Checkbox */}
        <div className="space-y-1 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#46564A]">
            <input
              type="checkbox"
              id="acceptTerms"
              className="w-4 h-4 mt-0.5 rounded border-[#D7E0D9] bg-white text-[#267A45] focus:ring-[#267A45]/20 focus:ring-2 cursor-pointer shrink-0"
              {...register('acceptTerms', registerValidationRules.acceptTerms)}
            />
            <span>
              I agree to the{' '}
              <span className="text-[#267A45] hover:underline font-semibold">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-[#267A45] hover:underline font-semibold">
                Cancellation Policy
              </span>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs text-[#922B27] font-medium">
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

        {/* Navigation to Login & Back to Home */}
        <div className="text-center pt-3 border-t border-[#E2E8E3] space-y-2">
          <p className="text-xs text-[#526258]">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="font-semibold text-[#267A45] hover:text-[#1E6338] transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Sign In
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

export default RegisterPage
