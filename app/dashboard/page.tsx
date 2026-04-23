"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: "Pendiente", aprobado: "Aprobado", en_curso: "En curso",
  terminado: "Terminado", facturado: "Facturado", liquidado: "Liquidado",
}
const ESTADO_COLOR: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e" },
  aprobado: { bg: "#dbeafe", color: "#1e40af" },
  en_curso: { bg: "#dcfce7", color: "#15803d" },
  terminado: { bg: "#f3f4f6", color: "#6b7280" },
  facturado: { bg: "#f5f3ff", color: "#6d28d9" },
  liquidado: { bg: "#f3f4f6", color: "#374151" },
}

export default function DashboardPage() {
  const [perfil, setPerfil] = useState<any>(null)
  const [proyectos, setProyectos] = useState<any[]>([])
  const [metricas, setMetricas] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const [
      { data: provs },
      { count: rqPendientes },
      { count: rqAprobados },
      { count: rqProgramados },
      { data: facturas },
      { data: liquidaciones },
      { count: cotMes },
    ] = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").order("created_at", { ascending: false }).limit(20),
      supabase.from("requerimientos_pago").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("requerimientos_pago").select("id", { count: "exact", head: true }).in("estado", ["aprobado_produccion", "aprobado"]),
      supabase.from("requerimientos_pago").select("id", { count: "exact", head: true }).eq("estado", "programado"),
      supabase.from("facturas").select("subtotal, igv, monto_final_abonado, estado"),
      supabase.from("liquidaciones").select("margen_real_pct, cerrada"),
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    setProyectos(provs || [])

    const totalFacturado = (facturas || []).filter(f => f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)
    const totalCobrado = (facturas || []).filter(f => f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
    const porCobrar = (facturas || []).filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
    const margenPromedio = (liquidaciones || []).filter(l => l.cerrada && l.margen_real_pct > 0).reduce((s, l, _, arr) => s + l.margen_real_pct / arr.length, 0)

    setMetricas({
      activos: (provs || []).filter(p => ["aprobado", "en_curso"].includes(p.estado)).length,
      pendientesAprobacion: (provs || []).filter(p => p.estado === "pendiente_aprobacion").length,
      terminadosSinLiquidar: (provs || []).filter(p => p.estado === "terminado").length,
      rqPendientes: rqPendientes || 0,
      rqAprobados: rqAprobados || 0,
      rqProgramados: rqProgramados || 0,
      totalFacturado,
      totalCobrado,
      porCobrar,
      margenPromedio,
      cotMes: cotMes || 0,
    })
    setLoading(false)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando dashboard...</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Bienvenido, {perfil?.nombre} {perfil?.apellido} · <span style={{ textTransform: "capitalize" }}>{perfil?.perfil?.replace("_", " ")}</span>
          </p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo proyecto</a>
      </div>

      {/* Métricas principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Proyectos activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0F6E56" }}>{metricas.activos}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{metricas.pendientesAprobacion} pendientes aprobación</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid " + (metricas.rqPendientes > 0 ? "#f59e0b" : "#e5e7eb") }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>RQs pendientes</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: metricas.rqPendientes > 0 ? "#f59e0b" : "#374151" }}>{metricas.rqPendientes}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{metricas.rqAprobados} en aprobación · {metricas.rqProgramados} programados</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #1e40af" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Por cobrar</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e40af" }}>{fmt(metricas.porCobrar)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Total emitido: {fmt(metricas.totalFacturado)}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid " + (metricas.margenPromedio >= 30 ? "#15803d" : "#dc2626") }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Margen promedio</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: metricas.margenPromedio >= 30 ? "#15803d" : "#dc2626" }}>
            {metricas.margenPromedio > 0 ? metricas.margenPromedio.toFixed(1) + "%" : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>En proyectos liquidados</div>
        </div>
      </div>

      {/* Segunda fila métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#15803d", textTransform: "uppercase", marginBottom: 4 }}>Total cobrado</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#15803d" }}>{fmt(metricas.totalCobrado)}</div>
        </div>
        <div className="card" style={{ background: metricas.terminadosSinLiquidar > 0 ? "#fef9c3" : "#f9fafb", border: "1px solid " + (metricas.terminadosSinLiquidar > 0 ? "#fde68a" : "#e5e7eb") }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: metricas.terminadosSinLiquidar > 0 ? "#92400e" : "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Sin liquidar</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: metricas.terminadosSinLiquidar > 0 ? "#f59e0b" : "#374151" }}>{metricas.terminadosSinLiquidar}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Proyectos terminados</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Cotizaciones del mes</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#374151" }}>{metricas.cotMes}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Versiones generadas</div>
        </div>
      </div>

      {/* Tabla proyectos */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Proyectos recientes</h2>
          <a href="/proyectos" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>Ver todos →</a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CÓDIGO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>INICIO</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.length > 0 ? proyectos.map((p, idx) => {
              const ec = ESTADO_COLOR[p.estado] || { bg: "#f3f4f6", color: "#6b7280" }
              return (
                <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#6b7280", fontFamily: "monospace" }}>{p.codigo}</td>
                  <td style={{ padding: "12px" }}>
                    <a href={"/proyectos/" + p.id} style={{ fontWeight: 600, color: "#111827", textDecoration: "none", fontSize: 14 }}>{p.nombre}</a>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.cliente?.razon_social || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.productor ? p.productor.nombre + " " + p.productor.apellido : "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {ESTADO_LABEL[p.estado] || p.estado}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#9ca3af" }}>
                    {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: "40px 20px", fontSize: 14 }}>
                  No hay proyectos. <a href="/proyectos/nuevo" style={{ color: "#0F6E56", fontWeight: 600 }}>Crea el primero</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
