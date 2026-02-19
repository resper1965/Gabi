"use client"

import { useEffect, useState, createContext, useContext, type ReactNode } from "react"
import { auth, onAuthStateChanged, type User } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  role: string
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: "user" })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState("user")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult()
        setRole((token.claims.role as string) || "user")
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
