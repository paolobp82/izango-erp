"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()
  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: proy } = await supabase.from("proyectos").select("*, cliente:clientes(razon_social, ruc)").eq("id", id).single()
      setProyecto(proy)
      const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).order("version")
      setCotizaciones(cots || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function nuevaVersion() {
    setCreando(true)
    const ultimaVersion = cotizaciones.length > 0 ? Math.max(...cotizaciones.map(c => c.version || 1)) : 0
    const { data: nueva } = await supabase.from("cotizaciones").insert({
      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",
      condicion_pago: "50% adelanto / 50% contra entrega", validez_dias: 10,
      fee_agencia_pct: 10, fee_activo: true, igv_pct: 18, total_cliente: 0, margen_pct: 0,
    }).select().single()
    setCreando(false)
    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const ec: any = { borrador: { bg: "#fef9c3", color: "#92400e" }, enviada_cliente: { bg: "#dbeafe", color: "#1e40af" }, aprobada_cliente: { bg: "#dcfce7", color: "#15803d" }, rechazada: { bg: "#fee2e2", color: "#991b1b" } }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>{proyecto?.codigo}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{proyecto?.cliente?.razon_social}</p>
        </div>
        <button onClick={nuevaVersion} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
          {creando ? "Creando..." : "+ Nueva proforma"}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Proformas</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{cotizaciones.length} versiones</span>
        </div>
        {cotizaciones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No hay proformas aún</div>
            <div style={{ fontSize: 12 }}>Crea la primera versión para comenzar</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VERSIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONDICIÓN PAGO</th>
                <th style={{ padding: "10px 20px", width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((cot, idx) => {
                const e = ec[cot.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                return (
                  <tr key={cot.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontWeight: 700, fontSize: 15, color: "#111827" }}>V{cot.version}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: e.bg, color: e.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{cot.estado || "borrador"}</span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {cot.total_cliente > 0 ? fmt(cot.total_cliente) : "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (cot.margen_pct || 0) >= 35 ? "#0F6E56" : "#6b7280" }}>
                      {cot.margen_pct > 0 ? cot.margen_pct.toFixed(1) + "%" : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{cot.condicion_pago || "—"}</td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
