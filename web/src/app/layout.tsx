import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { AuthGate } from "@/components/auth-gate"
import { ChatProvider } from "@/contexts/chat-context"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: {
    default: "Gabi — Inteligência Artificial para Compliance",
    template: "%s | Gabi",
  },
  description:
    "Plataforma de IA para compliance regulatório, análise jurídica e gestão documental. Powered by ness.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Gabi — IA para Compliance",
    description: "Análise jurídica, monitoramento regulatório e gestão documental com IA.",
    type: "website",
    locale: "pt_BR",
    siteName: "Gabi",
  },
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="cyber-grid">
        <AuthProvider>
          <ChatProvider>
            <AuthGate>{children}</AuthGate>
          </ChatProvider>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#1E293B",
              border: "1px solid #334155",
              color: "#F8FAFC",
              fontFamily: "var(--font-ui)",
              fontSize: "0.85rem",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            },
          }}
        />
      </body>
    </html>
  )
}
