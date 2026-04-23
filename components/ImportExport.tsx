"use client"
import { useState, useRef } from "react"
import * as XLSX from "xlsx"

interface ImportExportProps {
  modulo: string
  campos: { key: string, label: string, requerido?: boolean }[]
  datos: any[]
  onImportar: (registros: any[]) => Promise<{ exitosos: number, errores: string[] }>
}

export default function ImportExport({ modulo, campos, datos, onImportar }: ImportExportProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportarCSV() {
    const headers = campos.map(c => c.label).join(",")
    const rows = datos.map(row =>
      campos.map(c => {
        const val = row[c.key] ?? ""
        const str = String(val).replace(/"/g, '""')
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str
      }).join(",")
    )
    const csv = [headers, ...rows].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = modulo + "_" + new Date().toISOString().slice(0, 10) + ".csv"
    a.click()
    URL.revokeObjectURL(url)
    setShowMenu(false)
  }

  function exportarExcel() {
    const wsData = [
      campos.map(c => c.label),
      ...datos.map(row => campos.map(c => row[c.key] ?? ""))
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, modulo)
    XLSX.writeFile(wb, modulo + "_" + new Date().toISOString().slice(0, 10) + ".xlsx")
    setShowMenu(false)
  }

  function descargarPlantilla() {
    const headers = campos.map(c => c.label + (c.requerido ? " *" : "")).join(",")
    const ejemplo = campos.map(c => c.requerido ? "REQUERIDO" : "opcional").join(",")
    const csv = [headers, ejemplo].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla_" + modulo + ".csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function procesarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrores([])
    setResultado(null)

    const ext = file.name.split(".").pop()?.toLowerCase()

    if (ext === "csv") {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        parsearCSV(text)
      }
      reader.readAsText(file, "UTF-8")
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const data = ev.target?.result
        const wb = XLSX.read(data, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        if (rows.length < 2) { setErrores(["El archivo está vacío"]); return }
        const headers = rows[0].map((h: any) => String(h).replace(" *", "").trim())
        const registros = rows.slice(1).filter(r => r.some(v => v)).map(row => {
          const obj: any = {}
          headers.forEach((h: string, i: number) => {
            const campo = campos.find(c => c.label === h)
            if (campo) obj[campo.key] = row[i] ?? ""
          })
          return obj
        })
        validarYPreview(registros)
      }
      reader.readAsBinaryString(file)
    }
  }

  function parsearCSV(text: string) {
    const lines = text.trim().split("\n")
    if (lines.length < 2) { setErrores(["El archivo está vacío"]); return }
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").replace(" *", "").trim())
    const registros = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.replace(/"/g, "").trim())
      const obj: any = {}
      headers.forEach((h, i) => {
        const campo = campos.find(c => c.label === h)
        if (campo) obj[campo.key] = values[i] ?? ""
      })
      return obj
    }).filter(r => Object.values(r).some(v => v))
    validarYPreview(registros)
  }

  function validarYPreview(registros: any[]) {
    const errs: string[] = []
    registros.forEach((r, i) => {
      campos.filter(c => c.requerido).forEach(c => {
        if (!r[c.key] || r[c.key] === "REQUERIDO") {
          errs.push(`Fila ${i + 2}: campo "${c.label}" es requerido`)
        }
      })
    })
    setErrores(errs)
    setPreview(registros.slice(0, 5))
    if (fileRef.current) fileRef.current.value = ""
  }

  async function confirmarImportacion() {
    if (preview.length === 0) return
    setImporting(true)
    const result = await onImportar(preview)
    setResultado(result)
    setImporting(false)
    setPreview([])
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", gap: 8 }}>
      {/* Exportar */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowMenu(!showMenu)}
          style={{ padding: "7px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#374151", fontFamily: "inherit" }}>
          ↓ Exportar <span style={{ fontSize: 10 }}>▾</span>
        </button>
        {showMenu && (
          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 160 }}>
            <button onClick={exportarCSV}
              style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", background: "none", cursor: "pointer", color: "#374151", fontFamily: "inherit" }}>
              📄 Exportar CSV
            </button>
            <button onClick={exportarExcel}
              style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", background: "none", cursor: "pointer", color: "#374151", fontFamily: "inherit", borderTop: "1px solid #f3f4f6" }}>
              📊 Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* Importar */}
      <button onClick={() => { setShowImport(true); setShowMenu(false) }}
        style={{ padding: "7px 14px", border: "1px solid #1D9E75", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#0F6E56", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        ↑ Importar
      </button>

      {/* Modal importar */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>Importar {modulo}</h2>
              <button onClick={() => { setShowImport(false); setPreview([]); setErrores([]); setResultado(null) }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            {resultado ? (
              <div>
                <div style={{ background: resultado.errores.length === 0 ? "#f0fdf4" : "#fef9c3", border: "1px solid " + (resultado.errores.length === 0 ? "#bbf7d0" : "#fde68a"), borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: resultado.errores.length === 0 ? "#15803d" : "#92400e" }}>
                    {resultado.exitosos} registros importados exitosamente
                  </div>
                  {resultado.errores.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>{resultado.errores.length} errores:</div>
                      {resultado.errores.map((e: string, i: number) => <div key={i} style={{ fontSize: 12, color: "#92400e" }}>• {e}</div>)}
                    </div>
                  )}
                </div>
                <button onClick={() => { setShowImport(false); setResultado(null) }} className="btn-primary" style={{ fontSize: 13 }}>Cerrar</button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Paso 1 — Descarga la plantilla</div>
                  <button onClick={descargarPlantilla}
                    style={{ padding: "6px 14px", border: "1px dashed #1D9E75", borderRadius: 7, background: "#fff", fontSize: 12, color: "#0F6E56", cursor: "pointer", fontFamily: "inherit" }}>
                    ↓ Descargar plantilla CSV
                  </button>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>
                    Los campos marcados con * son obligatorios.
                  </p>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Paso 2 — Sube tu archivo</div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={procesarArchivo}
                    style={{ fontSize: 13, fontFamily: "inherit" }} />
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>Formatos soportados: CSV, Excel (.xlsx, .xls)</p>
                </div>

                {errores.length > 0 && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>Errores de validacion:</div>
                    {errores.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12, color: "#dc2626" }}>• {e}</div>)}
                    {errores.length > 5 && <div style={{ fontSize: 12, color: "#dc2626" }}>... y {errores.length - 5} más</div>}
                  </div>
                )}

                {preview.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                      Vista previa — {preview.length} registro(s) listos para importar
                    </div>
                    <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            {campos.slice(0, 4).map(c => (
                              <th key={c.key} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>{c.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                              {campos.slice(0, 4).map(c => (
                                <td key={c.key} style={{ padding: "8px 12px", color: "#374151" }}>{row[c.key] || "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button onClick={() => { setPreview([]); setErrores([]) }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
                      <button onClick={confirmarImportacion} disabled={importing || errores.length > 0} className="btn-primary" style={{ fontSize: 13 }}>
                        {importing ? "Importando..." : "Confirmar importacion"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showMenu && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />}
    </div>
  )
}