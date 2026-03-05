"use client"

import { useAuth } from "@/components/auth-provider"
import LandingPage from "./landing/page"
import DashboardPage from "@/components/dashboard"

export default function RootPage() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <LandingPage />

  return <DashboardPage />
}
