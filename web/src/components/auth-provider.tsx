"use client"

import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from "react"
import { auth, onAuthStateChanged, type User } from "@/lib/firebase"

interface UserProfile {
  uid: string
  email: string
  name: string | null
  picture: string | null
  role: string
  status: string
  allowed_modules: string[]
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedProfile())

  // If we have a cached profile, don't block the UI
  const hasCache = profile !== null

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

  useEffect(() => {
    // If we have a cached profile, stop the loading spinner immediately
    if (hasCache) {
      setLoading(false)
    }

    // Safety timeout: reduced from 15s to 8s
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
      console.warn("AuthProvider: Safety timeout reached — auth state never fired")
    }, 8000)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimeout)
      setUser(firebaseUser)
      if (firebaseUser) {
        await fetchProfile(firebaseUser)
      } else {
        setProfile(null)
        setCachedProfile(null)
      }
      setLoading(false)
    })
    return () => {
      clearTimeout(safetyTimeout)
      unsubscribe()
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
