import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { AuthGate } from "@/components/auth-gate"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Gabi",
  description: "Inteligencia Artificial powered by ness.",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="cyber-grid">
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--color-surface-card)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              fontFamily: "var(--font-ui)",
              fontSize: "0.8rem",
            },
          }}
        />
      </body>
    </html>
  )
}
