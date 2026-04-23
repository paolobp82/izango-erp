"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const ESTADO_COT: Record<string, any> = {
  borrador:         { bg: "#f3f4f6", color: "#6b7280",  label: "Borrador" },
  en_revision:      { bg: "#fef9c3", color: "#92400e",  label: "En revision" },
  aprobada_interna: { bg: "#dbeafe", color: "#1e40af",  label: "Aprobada interna" },
  enviada_cliente:  { bg: "#fed7aa", color: "#9a3412",  label: "Enviada cliente" },
  aprobada_cliente: { bg: "#dcfce7", color: "#15803d",  label: "Aprobada cliente" },
  rechazada:        { bg: "#fee2e2", color: "#991b1b",  label: "Rechazada" },
  recotizar:        { bg: "#f5f3ff", color: "#6d28d9",  label: "Recotizar" },
}

export default function ProformasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [clientes, setClientes] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("cotizaciones")
      .select("*, proyecto:proyectos(id, nombre, codigo, cliente:clientes(id, razon_social))")
      .order("created_at", { ascending: false })
    setCotizaciones(data || [])
    const clientesUnicos = Array.from(
      new Map((data || []).map((c: any) => [c.proyecto?.cliente?.id, c.proyecto?.cliente]).filter(([k]) => k)).values()
    )
    setClientes(clientesUnicos)
    setLoading(false)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const filtradas = cotizaciones.filter(c => {
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (filtroCliente && c.proyecto?.cliente?.id !== filtroCliente) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!c.proyecto?.nombre?.toLowerCase().includes(q) &&
          !c.proyecto?.codigo?.toLowerCase().includes(q) &&
          !c.proyecto?.cliente?.razon_social?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalAprobadas = cotizaciones.filter(c => c.estado === "aprobada_cliente").reduce((s, c) => s + (c.total_cliente || 0), 0)
  const totalEnviadas = cotizaciones.filter(c => c.estado === "enviada_cliente").reduce((s, c) => s + (c.total_cliente || 0), 0)
  const totalBorradores = cotizaciones.filter(c => c.estado === "borrador").length

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Proformas</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{cotizaciones.length} proformas en total</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ background: "#dcfce7", border: "none" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#15803d", textTransform: "uppercase", marginBottom: 4 }}>Aprobadas por cliente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{fmt(totalAprobadas)}</div>
          <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>{cotizaciones.filter(c => c.estado === "aprobada_cliente").length} proformas</div>
        </div>
        <div className="card" style={{ background: "#fed7aa", border: "none" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9a3412", textTransform: "uppercase", marginBottom: 4 }}>Enviadas al cliente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#9a3412" }}>{fmt(totalEnviadas)}</div>
          <div style={{ fontSize: 11, color: "#c2410c", marginTop: 2 }}>{cotizaciones.filter(c => c.estado === "enviada_cliente").length} proformas</div>
        </div>
        <div className="card" style={{ background: "#f3f4f6", border: "none" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Borradores</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{totalBorradores}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Pendientes de envio</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", minWidth: 220 }}
            placeholder="Buscar por proyecto o cliente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_COT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
          {(filtroEstado || filtroCliente || busqueda) && (
            <button onClick={() => { setFiltroEstado(""); setFiltroCliente(""); setBusqueda("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtradas.length} resultados</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
              <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VERSION</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL CLIENTE</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA</th>
              <th style={{ padding: "10px 20px", width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay proformas</td></tr>
            ) : (
              filtradas.map((cot, idx) => {
                const ec = ESTADO_COT[cot.estado] || { bg: "#f3f4f6", color: "#6b7280", label: cot.estado }
                return (
                  <tr key={cot.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{cot.proyecto?.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{cot.proyecto?.codigo}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{cot.proyecto?.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 700, fontSize: 14, color: "#374151" }}>V{cot.version}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ec.label}</span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {cot.total_cliente > 0 ? fmt(cot.total_cliente) : "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (cot.margen_pct || 0) >= 35 ? "#0F6E56" : (cot.margen_pct || 0) >= 20 ? "#ca8a04" : "#6b7280" }}>
                      {cot.margen_pct > 0 ? cot.margen_pct.toFixed(1) + "%" : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#9ca3af" }}>
                      {cot.created_at ? new Date(cot.created_at).toLocaleDateString("es-PE") : "—"}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => router.push(`/proyectos/${cot.proyecto?.id}/cotizaciones/${cot.id}`)}
                          className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                        <button onClick={() => router.push(`/proyectos/${cot.proyecto?.id}/cotizaciones/${cot.id}/preview`)}
                          style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer" }}>
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

}