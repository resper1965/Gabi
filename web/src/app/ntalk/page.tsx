"use client"

import { useState, useCallback } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { ChatHistorySidebar } from "@/components/chat-history-sidebar"
import { HelpTooltip } from "@/components/help-tooltip"
import { useChatStore } from "@/contexts/chat-context"
import { gabi } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Database, Settings, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

const ACCENT = "var(--color-mod-ntalk)"
const CTX_WINDOW = 10

const SUGGESTED_PROMPTS = [
  "Qual é o VGV total por empreendimento neste trimestre?",
  "Mostre a inadimplência por categoria nos últimos 6 meses",
  "Compare o NOI entre os anos 2023 e 2024",
  "Qual empreendimento tem maior cap rate?",
]

interface ConnectionForm {
  host: string
  port: string
  db_name: string
  username: string
  secret_manager_ref: string
}

export default function NTalkPage() {
  const { messages, setMessages, clearMessages } = useChatStore("ntalk")
  const { user, profile } = useAuth()
  const tenantId = profile?.org_id || user?.uid || "default"
  const [isLoading, setIsLoading] = useState(false)
  const summary: string | null = null // placeholder for summary if needed later
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connForm, setConnForm] = useState<ConnectionForm>({
    host: "",
    port: "1433",
    db_name: "",
    username: "",
    secret_manager_ref: "",
  })
  const [savingConn, setSavingConn] = useState(false)

  const handleSend = useCallback(
    async (text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: text, createdAt: Date.now() },
      ])
      setIsLoading(true)

      const assistantId = (Date.now() + 1).toString()

      try {
        const history = messages
          .slice(-CTX_WINDOW)
          .map((m) => ({ role: m.role, content: m.content }))

        const controller = new AbortController()
        const reader = await gabi.ntalk.askStream({
          tenant_id: tenantId,
          question: text,
          chat_history: history,
          summary: summary || undefined,
        }, controller.signal)

        let fullText = ""
        let sqlPrefix = ""
        let resultsMeta: Record<string, unknown> | undefined

        // Add empty assistant message to stream into
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "⏳", createdAt: Date.now() },
        ])

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") continue

            try {
              const event = JSON.parse(payload)
              if (event.type === "meta") {
                if (event.sql) sqlPrefix = `**SQL Gerado:**\n\`\`\`sql\n${event.sql}\n\`\`\`\n\n`
                if (event.results) resultsMeta = event.results
              } else if (event.type === "text") {
                fullText += event.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: sqlPrefix + fullText, metadata: resultsMeta ? { results: resultsMeta } : undefined }
                      : m
                  )
                )
              }
            } catch {
              // skip malformed events
            }
          }
        }

        // Final update
        if (!fullText && !sqlPrefix) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: "Sem resposta" } : m))
          )
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao processar"
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantId),
          {
            id: Date.now().toString(),
            role: "assistant",
            content: msg,
            createdAt: Date.now(),
            isError: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, summary, setMessages, tenantId],
  )

  const handleSyncSchema = async () => {
    setIsLoading(true)
    try {
      const res = (await gabi.data.syncSchema(tenantId)) as {
        tables_synced: number
        terms_created: number
      }
      toast.success(`🔄 Schema sincronizado: ${res.tables_synced} tabelas, ${res.terms_created} termos`)
    } catch (e: unknown) {
      toast.error(`Sync falhou: ${e instanceof Error ? e.message : "Erro"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConnection = async () => {
    setSavingConn(true)
    try {
      await gabi.data.registerConnection({
        tenant_id: tenantId,
        name: connForm.db_name || "Banco Principal",
        host: connForm.host,
        port: Number(connForm.port) || 1433,
        db_name: connForm.db_name,
        username: connForm.username,
        secret_manager_ref: connForm.secret_manager_ref,
      })
      toast.success("Conexão registrada com sucesso")
      setSettingsOpen(false)
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : "Falha ao salvar"}`)
    } finally {
      setSavingConn(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, var(--color-mod-ntalk) 15%, transparent)` }}
          >
            <Database className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">gabi.data</h1>
            <p className="text-xs text-slate-500">Sua CFO de Dados</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncSchema}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200"
            style={{
              background: `color-mix(in srgb, var(--color-mod-ntalk) 12%, transparent)`,
              color: ACCENT,
            }}
            title="Sincronizar schema do banco MS SQL"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Schema
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       transition-all duration-200 bg-[#1E293B] text-slate-400 hover:text-white
                       border border-[#334155] hover:border-slate-500"
            title="Configurar conexão"
          >
            <Settings className="w-3.5 h-3.5" />
            Conexão
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
            title="Histórico de conversas"
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Chat ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            onNewConversation={clearMessages}
            suggestedPrompts={SUGGESTED_PROMPTS}
            isLoading={isLoading}
            placeholder="Pergunte sobre seus dados..."
            moduleAccent={ACCENT}
          />
        </div>

        <ChatHistorySidebar
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onLoadSession={(msgs) => {
            setMessages(
              msgs.map((m, i) => ({
                id: `hist-${i}`,
                role: m.role as "user" | "assistant",
                content: m.content,
                metadata: m.metadata as Record<string, unknown> | undefined,
              })),
            )
          }}
          module="ntalk"
          moduleAccent={ACCENT}
        />
      </div>

      {/* ── Connection Settings Modal ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <div className="w-full max-w-md mx-4 rounded-2xl bg-[#1E293B] border border-[#334155] p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">Conexão MS SQL</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure o banco de dados do tenant</p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(
                [
                  { key: "host",               label: "Host",              placeholder: "sqlserver.empresa.com" },
                  { key: "port",               label: "Porta",             placeholder: "1433" },
                  { key: "db_name",            label: "Database",          placeholder: "NomeDoDatabase" },
                  { key: "username",           label: "Usuário",           placeholder: "sa" },
                  { key: "secret_manager_ref", label: "Secret Manager Ref",placeholder: "projects/xxx/secrets/sql-pass/versions/latest" },
                ] as { key: keyof ConnectionForm; label: string; placeholder: string }[]
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
                  <input
                    type={key === "secret_manager_ref" ? "text" : "text"}
                    value={connForm[key]}
                    onChange={(e) =>
                      setConnForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2
                               text-sm text-slate-100 placeholder:text-slate-600
                               focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setSettingsOpen(false)}
                className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white
                           bg-[#0F172A] border border-[#334155] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConnection}
                disabled={savingConn || !connForm.host || !connForm.db_name}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: ACCENT }}
              >
                {savingConn ? "Salvando..." : "Salvar Conexão"}
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpTooltip module="ntalk" moduleAccent={ACCENT} />
    </div>
  )
}
