import React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * Accessible FormField wrapper providing standardized label, hint, and error/success displays
 */
export const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  success,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={htmlFor}
            className="block text-xs font-semibold text-[#17231B]"
          >
            {label}
            {required && <span className="ml-1 text-[#267A45] font-bold">*</span>}
          </label>
          {hint && <span className="text-xs text-[#526258]">{hint}</span>}
        </div>
      )}

      {children}

      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="flex items-center gap-1.5 text-xs text-[#922B27] font-medium transition-all duration-150"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : success ? (
        <p
          id={htmlFor ? `${htmlFor}-success` : undefined}
          className="flex items-center gap-1.5 text-xs text-[#267A45] font-medium transition-all duration-150"
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{success}</span>
        </p>
      ) : null}
    </div>
  )
}

