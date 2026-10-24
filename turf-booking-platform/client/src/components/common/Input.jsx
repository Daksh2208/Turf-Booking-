import React, { forwardRef } from 'react'

/**
 * Standardized Input component with icon adornment and validation state styling
 */
export const Input = forwardRef(
  (
    {
      id,
      name,
      type = 'text',
      placeholder,
      icon: Icon,
      error,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-500 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={`w-full bg-slate-900/80 border rounded-xl text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } py-2.5 ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          } ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
