"use client"

interface DataChartProps {
  columns: string[]
  rows: Record<string, string | number | null>[]
}

export function DataChart({ columns, rows }: DataChartProps) {
  // Find numeric columns for the Y axis
  const numericCols = columns.filter(col => 
    rows.length > 0 && typeof rows[0][col] === "number"
  )

  // Find a label column (usually the first string column)
  const labelCol = columns.find(col => 
    rows.length > 0 && typeof rows[0][col] === "string"
  ) || columns[0]

  if (numericCols.length === 0 || rows.length === 0) return null

  // Process data for the first numeric column for now
  const targetCol = numericCols[0]
  const vals = rows.map(r => Number(r[targetCol]) || 0)
  const maxVal = Math.max(...vals, 1)
  const chartData = rows.slice(0, 10).map((row, i) => ({
    label: String(row[labelCol] || ""),
    value: vals[i]
  }))

  return (
    <div className="my-4 glass-panel p-6 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Visualização Rápida</h4>
          <p className="text-xs font-semibold text-white">{targetCol} por {labelCol}</p>
        </div>
      </div>

      <div className="h-40 flex items-end gap-2 px-2">
        {chartData.map((item, i) => {
          const height = (item.value / maxVal) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div 
                className="w-full bg-emerald-500/20 border-t-2 border-emerald-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-emerald-500/40"
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-500 text-black text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                  {item.value.toLocaleString()}
                </div>
              </div>
              <div className="mt-2 text-[8px] text-slate-500 rotate-45 origin-left truncate w-full max-w-[40px]">
                {item.label}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
        <span className="text-[9px] text-slate-600">Gráfico gerado automaticamente pela gabi.</span>
      </div>
    </div>
  )
}
