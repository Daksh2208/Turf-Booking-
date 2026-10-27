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
    validate: {
      noWhitespace: (val) => {
        if (!val) return true
        return !/\s/.test(val) || 'Email address cannot contain spaces'
      },
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
    maxLength: {
      value: 60,
      message: 'Name cannot exceed 60 characters',
    },
    validate: {
      minLength: (val) => {
        if (!val) return true
        return val.length >= 2 || 'Name must be at least 2 characters'
      },
      notOnlyWhitespace: (val) => {
        if (!val) return true
        return (
          val.trim().length >= 2 ||
          'Name must contain at least 2 non-space characters'
        )
      },
      validCharacters: (val) => {
        if (!val) return true
        return (
          /^[a-zA-Z\s.'-]+$/.test(val.trim()) ||
          'Name can only contain letters, spaces, hyphens, and apostrophes'
        )
      },
    },
  },
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    validate: {
      noWhitespace: (val) => {
        if (!val) return true
        return !/\s/.test(val) || 'Email address cannot contain spaces'
      },
    },
  },
  password: {
    required: 'Password is required',
    validate: (val) => {
      if (!val) return true
      if (val.length < 8) return 'Password must be at least 8 characters'
      if (!/[A-Za-z]/.test(val)) return 'Password must contain at least one letter'
      if (!/\d/.test(val)) return 'Password must contain at least one number'
      if (!/[^A-Za-z0-9]/.test(val))
        return 'Password must contain at least one special character (e.g. !@#$)'
      return true
    },
  },
  confirmPassword: (password) => ({
    required: 'Please confirm your password',
    validate: (val, formValues) => {
      if (!val) return true
      const target = password !== undefined ? password : formValues?.password
      return val === target || 'Passwords do not match'
    },
  }),
  acceptTerms: {
    required: 'You must agree to the Terms of Service and Cancellation Policy',
  },
}

