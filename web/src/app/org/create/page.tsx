"use client"

import { useState } from "react"
import { gabiOrg } from "@/lib/api"
import { Building2, Package, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

const MODULES = [
  { key: "ghost", label: "gabi.writer", desc: "Clone de estilo + geração de texto", color: "var(--color-mod-ghost)" },
  { key: "law", label: "gabi.legal", desc: "RAG jurídico + compliance regulatório", color: "var(--color-mod-law)" },
  { key: "ntalk", label: "gabi.data", desc: "SQL por linguagem natural", color: "var(--color-mod-ntalk)" },
]

const SECTORS = [
  { value: "advocacia", label: "Advocacia" },
  { value: "asset_mgmt", label: "Asset Management" },
  { value: "compliance", label: "Compliance" },
  { value: "banco", label: "Banco / Fintech" },
  { value: "seguros", label: "Seguros / Corretora" },
  { value: "energia", label: "Energia" },
  { value: "outro", label: "Outro" },
]

export default function CreateOrgPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [sector, setSector] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [selectedModules, setSelectedModules] = useState<string[]>(["ghost", "law", "ntalk"])
  const [loading, setLoading] = useState(false)

  const toggleModule = (key: string) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome da organização é obrigatório"); return }
    setLoading(true)
    try {
      await gabiOrg.createOrg({
        name: name.trim(),
        modules: selectedModules,
        sector: sector || undefined,
        cnpj: cnpj || undefined,
      })
      toast.success("Organização criada com sucesso!")
      // Force profile refresh
      window.location.href = "/org"
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar organização"
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const steps = [
    // Step 0: Name + sector
    <div key="info" className="space-y-5">
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-2">Nome da organização *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: NovaTech Advogados"
          className="w-full bg-transparent border border-[#334155] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-2">Setor</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSector(s.value)}
              className={`text-xs px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                sector === s.value
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-[#334155] text-slate-400 hover:border-slate-500 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-2">CNPJ (opcional)</label>
        <input
          type="text"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00"
          className="w-full bg-transparent border border-[#334155] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
    </div>,

    // Step 1: Modules
    <div key="modules" className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">Selecione os módulos que sua organização precisa.</p>
      {MODULES.map((mod) => {
        const selected = selectedModules.includes(mod.key)
        return (
          <button
            key={mod.key}
            onClick={() => toggleModule(mod.key)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
              selected
                ? "border-opacity-50 bg-opacity-5"
                : "border-[#334155] hover:border-slate-500"
            }`}
            style={{
              borderColor: selected ? mod.color : undefined,
              background: selected ? `${mod.color}08` : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${mod.color} ${selected ? "20" : "10"}%, transparent)`,
                border: `1px solid color-mix(in srgb, ${mod.color} 25%, transparent)`,
              }}
            >
              {selected ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: mod.color }} />
              ) : (
                <Package className="w-5 h-5" style={{ color: mod.color, opacity: 0.4 }} />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: selected ? "white" : "#94a3b8" }}>{mod.label}</p>
              <p className="text-xs text-slate-500">{mod.desc}</p>
            </div>
          </button>
        )
      })}
    </div>,

    // Step 2: Confirm
    <div key="confirm" className="space-y-6">
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Confirme os dados
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nome</span>
            <span className="text-white font-medium">{name}</span>
          </div>
          {sector && (
            <div className="flex justify-between">
              <span className="text-slate-500">Setor</span>
              <span className="text-white">{SECTORS.find(s => s.value === sector)?.label}</span>
            </div>
          )}
          {cnpj && (
            <div className="flex justify-between">
              <span className="text-slate-500">CNPJ</span>
              <span className="text-white">{cnpj}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Plano</span>
            <span className="text-amber-400 font-medium">Trial (gratuito)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Módulos</span>
            <div className="flex gap-1.5">
              {selectedModules.map((m) => {
                const mod = MODULES.find(mod => mod.key === m)
                return (
                  <span
                    key={m}
                    className="text-[0.6rem] px-2 py-0.5 rounded font-medium"
                    style={{ color: mod?.color, background: `${mod?.color}15` }}
                  >
                    {mod?.label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
  ]

  const stepLabels = ["Dados", "Módulos", "Confirmar"]
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? selectedModules.length > 0 : true

  return (
    <div className="flex items-center justify-center h-full animate-fade-in-up">
      <div className="max-w-md w-full px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Criar Organização</h1>
          <p className="text-slate-500 text-sm mt-1">Configure sua organização na plataforma ness.</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold transition-all ${
                  i <= step ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-600 border border-[#334155]"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= step ? "text-emerald-400" : "text-slate-600"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-emerald-500/30" : "bg-[#334155]"}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {steps[step]}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-slate-400 bg-[#1E293B] border border-[#334155] hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--color-gabi-primary), color-mix(in srgb, var(--color-gabi-primary) 70%, black))",
              }}
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--color-gabi-primary), color-mix(in srgb, var(--color-gabi-primary) 70%, black))",
                boxShadow: "0 4px 20px rgba(16,185,129,0.2)",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Criar Organização
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
