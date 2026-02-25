"use client"

import React from "react"
import { Sidebar } from "./sidebar"
import { ErrorBoundary } from "../error-boundary"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto cyber-grid">
        <div className="h-full flex flex-col">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
