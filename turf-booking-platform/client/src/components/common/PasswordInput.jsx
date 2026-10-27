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
      success,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-[#647168] flex items-center justify-center">
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
          aria-describedby={
            error && id ? `${id}-error` : success && id ? `${id}-success` : undefined
          }
          className={`w-full bg-white border rounded-xl text-sm text-[#17231B] placeholder:text-[#647168] transition-all duration-150 outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#EDF1EE] disabled:text-[#69756D] pl-10 pr-11 py-2.5 ${
            error
              ? 'border-[#922B27] focus:border-[#922B27] focus:ring-2 focus:ring-[#922B27]/20'
              : success
              ? 'border-[#267A45] focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20'
              : 'border-[#D7E0D9] hover:border-[#C9DFCE] focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20'
          } ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute right-3 text-[#647168] hover:text-[#17231B] focus-visible:outline-none focus-visible:text-[#267A45] p-1 rounded-lg transition-colors cursor-pointer"
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
