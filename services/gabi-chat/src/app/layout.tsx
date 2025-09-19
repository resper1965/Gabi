import type { Metadata } from 'next'
import { DM_Mono, Geist, Montserrat } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'
const geistSans = Geist({
  variable: '--font-geist-sans',
  weight: '400',
  subsets: ['latin']
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: '400'
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: '500'
})

export const metadata: Metadata = {
  title: 'Gabi Chat',
  description:
    'Gabi - Chat multi-agentes powered by ness. Interface original com customizações de estilo ness.',
  icons: {
    icon: '/icon.svg',
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${dmMono.variable} ${montserrat.variable} antialiased`}>
        <AuthProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
