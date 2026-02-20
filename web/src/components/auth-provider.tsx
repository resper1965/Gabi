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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const fetchProfile = useCallback(async (firebaseUser: User) => {
    console.log("AuthProvider: Fetching profile for", firebaseUser.email)
    try {
      const token = await firebaseUser.getIdToken()
      console.log("AuthProvider: Token acquired (length):", token.length)
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log("AuthProvider: API response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("AuthProvider: Profile fetched successfully, role:", data.role)
        setProfile(data)
      } else {
        const errorText = await res.text()
        console.error("AuthProvider: API error response:", errorText)
      }
    } catch (err) {
      console.error("AuthProvider: Could not fetch user profile from API:", err)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await fetchProfile(firebaseUser)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
