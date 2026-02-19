"use client"

import { useState, type FormEvent } from "react"
import { signInWithEmailAndPassword, auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
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
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: "linear-gradient(135deg, var(--color-gabi-primary), var(--color-gabi-dark))" }}
          >
            g
          </div>
          <h1 className="brand-mark text-3xl text-white">
            gabi<span className="dot">.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">Plataforma de Inteligência Artificial</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
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
