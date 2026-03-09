"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { gabiOrg } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Building2, CheckCircle2, Loader2, XCircle } from "lucide-react"

export default function InvitePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { user } = useAuth()

  const hasToken = !!token
  const initialStatus = hasToken ? "loading" : "no-token"
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(initialStatus)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!hasToken || !user) return

    const join = async () => {
      try {
        const res = await gabiOrg.joinByToken(token!) as { org_id?: string; name?: string }
        setMessage(res.name || "Organização")
        setStatus("success")
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Convite inválido ou expirado"
        setMessage(msg)
        setStatus("error")
      }
    }
    join()
  }, [hasToken, token, user])

  return (
    <div className="flex items-center justify-center h-full animate-fade-in-up">
      <div className="max-w-sm w-full px-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Processando convite...</h2>
            <p className="text-slate-500 text-sm">Aguarde enquanto validamos seu acesso.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Bem-vindo!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Você agora faz parte da organização <strong className="text-white">{message}</strong>.
            </p>
            <a
              href="/org"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, var(--color-gabi-primary), color-mix(in srgb, var(--color-gabi-primary) 70%, black))",
              }}
            >
              <Building2 className="w-4 h-4" />
              Ver minha organização
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Convite inválido</h2>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              ← Voltar ao início
            </Link>
          </>
        )}

        {status === "no-token" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Token não encontrado</h2>
            <p className="text-slate-500 text-sm mb-6">
              Use o link completo do convite que você recebeu por e-mail.
            </p>
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              ← Voltar ao início
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
