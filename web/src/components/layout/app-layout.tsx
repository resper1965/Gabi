"use client"

import React from "react"
import { Sidebar } from "./sidebar"
import { BottomTabs } from "./bottom-tabs"
import { ErrorBoundary } from "../error-boundary"
import { TrialBanner } from "../trial-banner"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Navigation Sidebar (desktop only, hidden < 1024px) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto cyber-grid">
        <div className="h-full flex flex-col pb-[68px] lg:pb-0">
          <TrialBanner />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Bottom Tab Bar (mobile/tablet only, hidden >= 1024px) */}
      <BottomTabs />
    </div>
  )
}

