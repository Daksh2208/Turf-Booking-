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
      success,
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-[#647168] flex items-center justify-center">
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
          aria-describedby={
            error && id ? `${id}-error` : success && id ? `${id}-success` : undefined
          }
          className={`w-full bg-white border rounded-xl text-sm text-[#17231B] placeholder:text-[#647168] transition-all duration-150 outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#EDF1EE] disabled:text-[#69756D] ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } py-2.5 ${
            error
              ? 'border-[#922B27] focus:border-[#922B27] focus:ring-2 focus:ring-[#922B27]/20'
              : success
              ? 'border-[#267A45] focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20'
              : 'border-[#D7E0D9] hover:border-[#C9DFCE] focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20'
          } ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
