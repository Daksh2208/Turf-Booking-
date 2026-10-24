import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Event name for pub-sub cache invalidation across the app
 */
const INVALIDATE_EVENT = 'app:invalidateQueries'

function serializeKey(key) {
  try {
    return JSON.stringify(key)
  } catch {
    return String(key)
  }
}

function matchKeys(key1, key2) {
  if (!key1 || !key2) return true
  const k1 = Array.isArray(key1) ? key1 : [key1]
  const k2 = Array.isArray(key2) ? key2 : [key2]
  const len = Math.min(k1.length, k2.length)
  for (let i = 0; i < len; i++) {
    const item1 = k1[i]
    const item2 = k2[i]
    if (typeof item1 === 'string' && typeof item2 === 'string') {
      if (item1 !== item2) return false
    } else {
      if (serializeKey(item1) !== serializeKey(item2)) return false
    }
  }
  return true
}

/**
 * Native React Custom Hook: useQuery
 * Replaces third-party TanStack useQuery using 100% standard React hooks
 */
export function useQuery(options) {
  const {
    queryKey,
    queryFn,
    enabled = true,
    refetchInterval = null,
    onSuccess,
    onError,
  } = options || {}

  const [data, setData] = useState(undefined)
  const [isLoading, setIsLoading] = useState(Boolean(enabled))
  const [isFetching, setIsFetching] = useState(Boolean(enabled))
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState(null)

  const isMountedRef = useRef(true)
  const queryFnRef = useRef(queryFn)
  const queryKeyRef = useRef(queryKey)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  queryFnRef.current = queryFn
  queryKeyRef.current = queryKey
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  const keySerialized = serializeKey(queryKey)

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!queryFnRef.current) return
      if (!isBackground && isMountedRef.current) {
        setIsFetching(true)
      }
      try {
        const result = await queryFnRef.current()
        if (isMountedRef.current) {
          setData(result)
          setIsError(false)
          setError(null)
          setIsLoading(false)
          setIsFetching(false)
          if (onSuccessRef.current) {
            onSuccessRef.current(result)
          }
        }
        return result
      } catch (err) {
        if (isMountedRef.current) {
          setIsError(true)
          setError(err)
          setIsLoading(false)
          setIsFetching(false)
          if (onErrorRef.current) {
            onErrorRef.current(err)
          }
        }
      }
    },
    []
  )

  // Initial and reactive fetch on queryKey/enabled change
  useEffect(() => {
    isMountedRef.current = true
    if (enabled) {
      setIsLoading(true)
      fetchData(false)
    } else {
      setIsLoading(false)
      setIsFetching(false)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [enabled, keySerialized, fetchData])

  // Periodic polling if refetchInterval > 0
  useEffect(() => {
    if (!enabled || !refetchInterval || refetchInterval <= 0) return
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        fetchData(true)
      }
    }, refetchInterval)

    return () => clearInterval(timer)
  }, [enabled, refetchInterval, fetchData])

  // Listen for global invalidation events
  useEffect(() => {
    const handleInvalidate = (e) => {
      const targetKey = e.detail?.queryKey
      if (matchKeys(targetKey, queryKeyRef.current)) {
        if (enabled && isMountedRef.current) {
          fetchData(true)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(INVALIDATE_EVENT, handleInvalidate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(INVALIDATE_EVENT, handleInvalidate)
      }
    }
  }, [enabled, fetchData])

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: () => fetchData(false),
  }
}

/**
 * Native React Custom Hook: useMutation
 * Replaces third-party TanStack useMutation using 100% standard React hooks
 */
export function useMutation(options) {
  const { mutationFn, onSuccess, onError } = options || {}
  const [data, setData] = useState(undefined)
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState(null)

  const mutationFnRef = useRef(mutationFn)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  mutationFnRef.current = mutationFn
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  const mutateAsync = useCallback(async (variables) => {
    setIsPending(true)
    setIsError(false)
    setError(null)
    try {
      const result = await mutationFnRef.current(variables)
      setData(result)
      setIsPending(false)
      if (onSuccessRef.current) {
        onSuccessRef.current(result, variables)
      }
      return result
    } catch (err) {
      setIsError(true)
      setError(err)
      setIsPending(false)
      if (onErrorRef.current) {
        onErrorRef.current(err, variables)
      }
      throw err
    }
  }, [])

  const mutate = useCallback(
    (variables) => {
      mutateAsync(variables).catch(() => {})
    },
    [mutateAsync]
  )

  const reset = useCallback(() => {
    setData(undefined)
    setIsPending(false)
    setIsError(false)
    setError(null)
  }, [])

  return {
    mutate,
    mutateAsync,
    isPending,
    isLoading: isPending,
    isError,
    error,
    data,
    reset,
  }
}

/**
 * Native React QueryClient Replacement
 */
export const queryClient = {
  invalidateQueries: ({ queryKey }) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(INVALIDATE_EVENT, { detail: { queryKey } })
      )
    }
  },
}

export function useQueryClient() {
  return queryClient
}

export function QueryClientProvider({ children }) {
  return children
}

export class QueryClient {
  constructor() {}
  invalidateQueries() {}
  clear() {}
}

export default {
  useQuery,
  useMutation,
  useQueryClient,
  queryClient,
  QueryClientProvider,
  QueryClient,
}
