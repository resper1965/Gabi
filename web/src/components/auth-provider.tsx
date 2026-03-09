"use client"

import { useEffect, useState, createContext, useContext, useCallback, useRef, type ReactNode } from "react"
import { auth, type User } from "@/lib/firebase"

interface UserProfile {
  uid: string
  email: string
  name: string | null
  picture: string | null
  role: string
  status: string
  allowed_modules: string[]
  org_id: string | null
  org_role: string | null
  org_modules: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  profile: UserProfile | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
})

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PROFILE_CACHE_KEY = "gabi_profile_cache"
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const { profile, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(PROFILE_CACHE_KEY)
      return null
    }
    return profile
  } catch {
    return null
  }
}

function setCachedProfile(profile: UserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ profile, timestamp: Date.now() }))
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY)
    }
  } catch {
    // localStorage not available
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with cached profile for instant render
  const cached = getCachedProfile()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!cached)
  const [profile, setProfile] = useState<UserProfile | null>(cached)

  // If we have a cached profile, don't block the UI
  const hasCache = cached !== null

  const fetchProfile = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          setCachedProfile(data)
        }
      } catch (err) {
        clearTimeout(timeoutId)
        console.error("AuthProvider: Could not fetch user profile from API:", err)
      }
    } catch (err) {
      console.error("AuthProvider: Could not get Firebase token:", err)
    }
  }, [])

  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Safety timeout: reduced from 15s to 8s
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
      console.warn("AuthProvider: Safety timeout reached — auth state never fired")
    }, 8000)

    // Use onIdTokenChanged to detect token refreshes (covers both auth state + token changes)
    const unsubscribe = auth.onIdTokenChanged(async (firebaseUser) => {
      clearTimeout(safetyTimeout)
      setUser(firebaseUser)
      if (firebaseUser) {
        await fetchProfile(firebaseUser)

        // Set up periodic token refresh (every 50 min, Firebase tokens expire at 60 min)
        if (!refreshInterval.current) {
          refreshInterval.current = setInterval(async () => {
            try {
              await firebaseUser.getIdToken(true) // Force refresh
            } catch (err) {
              console.warn("AuthProvider: Token refresh failed:", err)
            }
          }, 50 * 60 * 1000)
        }
      } else {
        setProfile(null)
        setCachedProfile(null)
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current)
          refreshInterval.current = null
        }
      }
      setLoading(false)
    })
    return () => {
      clearTimeout(safetyTimeout)
      unsubscribe()
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
        refreshInterval.current = null
      }
    }
  }, [fetchProfile, hasCache])

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
