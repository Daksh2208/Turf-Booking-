import React from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * Accessible FormField wrapper providing standardized label, hint, and error displays
 */
export const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={htmlFor}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            {label}
            {required && <span className="ml-1 text-emerald-400">*</span>}
          </label>
          {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </div>
      )}

      {children}

      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="flex items-center gap-1.5 text-xs text-rose-400 font-medium transition-all duration-150"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
