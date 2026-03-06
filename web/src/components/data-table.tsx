"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Download, Search } from "lucide-react"

interface DataTableProps {
  columns: string[]
  rows: Record<string, string | number | null>[]
}

export function DataTable({ columns, rows }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filter, setFilter] = useState("")

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  const filteredRows = rows.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(filter.toLowerCase())
    )
  )

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortCol) return 0
    const valA = a[sortCol] ?? ""
    const valB = b[sortCol] ?? ""
    if (valA < valB) return sortDir === "asc" ? -1 : 1
    if (valA > valB) return sortDir === "asc" ? 1 : -1
    return 0
  })

  return (
    <div className="my-4 glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col max-h-[500px]">
      <div className="px-4 py-3 bg-white/2 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Filtrar resultados..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
        <button 
          onClick={() => {
            const csv = [columns.join(","), ...rows.map(r => columns.map(c => `"${r[c]}"`).join(","))].join("\n")
            const blob = new Blob([csv], { type: "text/csv" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "export_gabi_data.csv"
            a.click()
          }}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          title="Exportar CSV"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 font-semibold text-slate-300 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    {col}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {sortCol === col ? (
                        sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-600" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-white/2 transition-colors border-b border-white/2 last:border-0"
              >
                {columns.map((col) => {
                  const val = row[col]
                  const isNumber = typeof val === "number"
                  return (
                    <td 
                      key={col} 
                      className={`px-4 py-2.5 ${isNumber ? "font-mono text-emerald-400/80" : "text-slate-400"}`}
                    >
                      {isNumber ? (val.toLocaleString('pt-BR')) : String(val ?? "-")}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-4 py-2 bg-white/1 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-medium">
          {sortedRows.length} {sortedRows.length === 1 ? 'registro' : 'registros'}
        </span>
        {filter && (
          <span className="text-[10px] text-amber-500/70 animate-pulse">Filtrado</span>
        )}
      </div>
    </div>
  )
}
