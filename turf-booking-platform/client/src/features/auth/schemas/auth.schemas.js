/**
 * Standard form validation rules (no third-party schema dependencies)
 */

export const loginValidationRules = {
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters',
    },
  },
}

export const registerValidationRules = {
  name: {
    required: 'Full name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters',
    },
    maxLength: {
      value: 60,
      message: 'Name cannot exceed 60 characters',
    },
  },
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
    validate: {
      hasLetter: (val) =>
        /[A-Za-z]/.test(val) || 'Password must contain at least one letter',
      hasNumber: (val) =>
        /\d/.test(val) || 'Password must contain at least one number',
    },
  },
  confirmPassword: (password) => ({
    required: 'Please confirm your password',
    validate: (val) => val === password || 'Passwords do not match',
  }),
  acceptTerms: {
    required: 'You must agree to the Terms of Service and Cancellation Policy',
  },
}
