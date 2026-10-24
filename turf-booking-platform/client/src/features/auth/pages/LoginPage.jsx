import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowRight, Info, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { FormField } from '../../../components/common/FormField'
import { Input } from '../../../components/common/Input'
import { PasswordInput } from '../../../components/common/PasswordInput'
import { Button } from '../../../components/common/Button'
import { loginValidationRules } from '../schemas/auth.schemas'

export const LoginPage = () => {
  const [submissionFeedback, setSubmissionFeedback] = useState(null)
  const [showForgotNotice, setShowForgotNotice] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur',
  })

  // Validated client-side submission without mock backend authentication
  const onSubmit = async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    setSubmissionFeedback({
      type: 'info',
      message:
        'Client-side validation passed! The authentication API will be connected in the next phase.',
    })
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to reserve slots, manage bookings, and access member rates."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Placeholder container for server-side notices */}
        {submissionFeedback && (
          <div
            tabIndex={-1}
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-200">Validation Successful</p>
              <p>{submissionFeedback.message}</p>
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
                Automated password reset via email will be activated alongside the notification service in Phase 4.
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
