"use client"

import { useState, type FormEvent } from "react"
import { signInWithEmailAndPassword, signInWithPopup, googleProvider, auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden selection:bg-[color:var(--color-gabi-primary)] selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0"></div>
      
      {/* Aurora Ambient Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] mix-blend-screen pointer-events-none opacity-20 motion-reduce:hidden z-0"
        style={{ background: `radial-gradient(circle, var(--color-gabi-primary) 0%, transparent 70%)` }}
      />

      <div className="w-full max-w-md animate-fade-in-up relative z-10 px-6 sm:px-10 py-12 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
        <Link href="/landing" className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md px-2 py-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        {/* Brand */}
        <div className="text-center mb-10 mt-6">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 blur-xl opacity-40 motion-safe:animate-pulse" style={{ background: "var(--color-gabi-primary)" }}></div>
            <NextImage
              src="/logo.png"
              alt="Gabi Logo"
              width={64}
              height={64}
              unoptimized
              className="relative w-16 h-16 rounded-2xl mx-auto object-cover shadow-xl ring-1 ring-white/10"
            />
          </div>
          <h1
            className="text-3xl text-white font-medium tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Gabi<span style={{ color: "#00ade8" }}>.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Inteligência Artificial<br />
            powered by <span className="text-slate-400">ness<span className="text-[#00ade8]">.</span></span>
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold
                     bg-white text-gray-900 hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]
                     transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-3 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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
              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 backdrop-blur-sm
                         border border-white/5 text-sm text-white placeholder:text-slate-500 
                         focus:outline-none focus:ring-2 focus:ring-[color:var(--color-gabi-primary)] focus:border-transparent transition-all duration-300"
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
              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 backdrop-blur-sm
                         border border-white/5 text-sm text-white placeholder:text-slate-500 
                         focus:outline-none focus:ring-2 focus:ring-[color:var(--color-gabi-primary)] focus:border-transparent transition-all duration-300"
              style={{ fontFamily: "var(--font-ui)" }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white
                       transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                       hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-gabi-primary)_40%,transparent)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            style={{ background: "linear-gradient(135deg, var(--color-gabi-primary), color-mix(in srgb, var(--color-gabi-primary) 70%, #000))" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-8">
          &copy; {new Date().getFullYear()} ness<span className="text-[#00ade8]">.</span>
        </p>
      </div>
    </div>
  )
}
