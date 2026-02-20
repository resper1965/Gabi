"use client"

import { useState, type FormEvent } from "react"
import { signInWithEmailAndPassword, signInWithPopup, googleProvider, auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      router.push("/")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar com Google"
      if (msg.includes("popup-closed")) setError("Popup de login foi fechado")
      else if (msg.includes("unauthorized-domain")) setError("Domínio não autorizado no Firebase")
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar"
      if (msg.includes("invalid-credential")) setError("Email ou senha inválidos")
      else if (msg.includes("too-many-requests")) setError("Muitas tentativas. Tente novamente em alguns minutos.")
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center cyber-grid">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-10">
          <img
            src="/logo.png"
            alt="Gabi Logo"
            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-lg"
          />
          <h1
            className="text-3xl text-white font-medium"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Gabi<span style={{ color: "#00ade8" }}>.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">Inteligencia Artificial powered</p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 rounded-[var(--radius-soft)] text-sm font-semibold
                     bg-white text-gray-800 hover:bg-gray-100
                     transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-3 mb-6"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-700/50" />
          <span className="text-xs text-slate-600">ou com email</span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-[var(--radius-soft)] bg-[var(--color-surface-card)]
                         tech-border text-sm text-white placeholder:text-slate-600 focus:outline-none"
              style={{ fontFamily: "var(--font-ui)" }}
              placeholder="voce@empresa.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-[var(--radius-soft)] bg-[var(--color-surface-card)]
                         tech-border text-sm text-white placeholder:text-slate-600 focus:outline-none"
              style={{ fontFamily: "var(--font-ui)" }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-[var(--radius-tech)] px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[var(--radius-soft)] text-sm font-semibold text-white
                       transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, var(--color-gabi-primary), var(--color-gabi-hover))" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-8">
          © {new Date().getFullYear()} ness<span className="neon-text">.</span>
        </p>
      </div>
    </div>
  )
}
