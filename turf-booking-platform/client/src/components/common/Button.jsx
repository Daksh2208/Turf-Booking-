import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Reusable Button component with sports-tech styling and accessible states
 */
export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#267A45] focus-visible:ring-offset-2 focus-visible:ring-offset-white'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  }

  const variantStyles = {
    primary:
      'bg-[#267A45] hover:bg-[#1E6338] active:scale-[0.99] text-white shadow-xs border border-transparent',
    secondary:
      'bg-white hover:bg-[#F0F6F1] active:scale-[0.99] text-[#17231B] border border-[#D7E0D9]',
    subtle:
      'bg-[#E7F3E9] hover:bg-[#d8eedb] active:scale-[0.99] text-[#267A45] border border-[#C9DFCE]',
    outline:
      'bg-transparent hover:bg-[#F0F6F1] active:scale-[0.99] text-[#17231B] border border-[#D7E0D9]',
    ghost:
      'bg-transparent hover:bg-[#E7F3E9] text-[#17231B] hover:text-[#267A45]',
    danger:
      'bg-[#922B27] hover:bg-[#7b231f] active:scale-[0.99] text-white shadow-xs border border-transparent',
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 text-current shrink-0" />}
          {children}
        </>
      )}
    </button>
  )
}
