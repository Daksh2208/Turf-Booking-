import React, { useState, forwardRef } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

/**
 * Accessible PasswordInput component with Show/Hide visibility toggle
 */
export const PasswordInput = forwardRef(
  (
    {
      id,
      name,
      placeholder = '••••••••',
      error,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-slate-500 flex items-center justify-center">
          <Lock className="w-4 h-4" />
        </div>

        <input
          ref={ref}
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={`w-full bg-slate-900/80 border rounded-xl text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed pl-10 pr-11 py-2.5 ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          } ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute right-3 text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:text-emerald-400 p-1 rounded-lg transition-colors cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
