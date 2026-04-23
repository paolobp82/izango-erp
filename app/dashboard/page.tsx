"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const ESTADO_COLOR: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Prod." },
  aprobado:             { bg: "#dbeafe", color: "#1e40af", label: "Aprobado" },
  en_curso:             { bg: "#dcfce7", color: "#15803d", label: "En curso" },
  terminado:            { bg: "#f3f4f6", color: "#6b7280", label: "Terminado" },
  facturado:            { bg: "#f5f3ff", color: "#6d28d9", label: "Facturado" },
  liquidado:            { bg: "#f0fdf4", color: "#166534", label: "Liquidado" },
}

function Sparkline({ data, color }: { data: number[], color: string }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 80, h = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

function DonaChart({ data }: { data: { label: string, value: number, color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>Sin datos</div>
  const size = 100, cx = 50, cy = 50, r = 38, inner = 24
  let angle = -90
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total
    const start = angle
    angle += pct * 360
    return { ...d, pct, start, end: angle }
  })
  function arc(startDeg: number, endDeg: number, r: number) {
    const s = (startDeg * Math.PI) / 180
    const e = (endDeg * Math.PI) / 180
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size}>
        {slices.map((s, i) => <path key={i} d={arc(s.start, s.end, r)} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={inner} fill="#fff" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#374151">{total}</text>
      </svg>
      <div style={{ display: "grid", gap: 4 }}>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>{d.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginLeft: "auto" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [proyectos, setProyectos] = useState<any[]>([])
  const [metricas, setMetricas] = useState<any>({})
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState(3)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const [
      { data: provs },
      { data: facturas },
      { data: liquidaciones },
      { data: rqs },
      { count: cotMes },
      { data: leads },
    ] = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").order("created_at", { ascending: false }).limit(10),
      supabase.from("facturas").select("subtotal, igv, monto_final_abonado, estado, created_at"),
      supabase.from("liquidaciones").select("margen_real_pct, cerrada, proyecto_id"),
      supabase.from("requerimientos_pago").select("id, estado, monto_solicitado").in("estado", ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "programado"]),
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from("crm_leads").select("estado, temperatura"),
    ])

    setProyectos(provs || [])

    const allProv = provs || []
    const activos = allProv.filter(p => ["aprobado", "aprobado_produccion", "en_curso"].includes(p.estado))
    const pendientes = allProv.filter(p => p.estado === "pendiente_aprobacion")
    const terminadosSinLiquidar = allProv.filter(p => p.estado === "terminado")
    const totalFacturado = (facturas || []).filter(f => f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)
    const totalCobrado = (facturas || []).filter(f => f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
    const porCobrar = (facturas || []).filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
    const margenPromedio = (liquidaciones || []).filter(l => l.cerrada && l.margen_real_pct > 0).reduce((s, l, _, arr) => arr.length > 0 ? s + l.margen_real_pct / arr.length : 0, 0)
    const rqsPendientesMonto = (rqs || []).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
    const leadsCalientes = (leads || []).filter(l => l.temperatura === "caliente").length
    const pipelineCRM = (leads || []).filter(l => !["ganado","perdido"].includes(l.estado)).length

    // Mes anterior comparativa
    const inicioMesAnt = new Date(); inicioMesAnt.setDate(1); inicioMesAnt.setMonth(inicioMesAnt.getMonth() - 1); inicioMesAnt.setHours(0,0,0,0)
    const finMesAnt = new Date(); finMesAnt.setDate(0); finMesAnt.setHours(23,59,59)
    const factMesAnt = (facturas || []).filter(f => {
      const d = new Date(f.created_at)
      return d >= inicioMesAnt && d <= finMesAnt && f.estado !== "anulada"
    }).reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)

    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
    const factMesAct = (facturas || []).filter(f => new Date(f.created_at) >= inicioMes && f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)
    const varFacturacion = factMesAnt > 0 ? ((factMesAct - factMesAnt) / factMesAnt) * 100 : 0

    setMetricas({
      activos: activos.length, pendientes: pendientes.length,
      terminadosSinLiquidar: terminadosSinLiquidar.length,
      rqsPendientes: (rqs || []).length, rqsPendientesMonto,
      totalFacturado, totalCobrado, porCobrar, margenPromedio,
      cotMes: cotMes || 0, leadsCalientes, pipelineCRM,
      factMesAct, varFacturacion,
      estadosCount: {
        pendiente_aprobacion: pendientes.length,
        aprobado: allProv.filter(p => p.estado === "aprobado").length,
        en_curso: allProv.filter(p => p.estado === "en_curso").length,
        terminado: terminadosSinLiquidar.length,
        facturado: allProv.filter(p => p.estado === "facturado").length,
        liquidado: allProv.filter(p => p.estado === "liquidado").length,
      }
    })

    // Alertas críticas
    const alerts: any[] = []
    if (pendientes.length > 0) alerts.push({ tipo: "warning", msg: pendientes.length + " proyecto(s) esperando aprobación", link: "/proyectos" })
    if (terminadosSinLiquidar.length > 0) alerts.push({ tipo: "warning", msg: terminadosSinLiquidar.length + " proyecto(s) terminado(s) sin liquidar", link: "/liquidaciones" })
    if ((rqs || []).length > 0) alerts.push({ tipo: "info", msg: (rqs || []).length + " RQs pendientes — S/ " + Number(rqsPendientesMonto).toLocaleString("es-PE", { minimumFractionDigits: 0 }), link: "/rq" })
    if (leadsCalientes > 0) alerts.push({ tipo: "hot", msg: leadsCalientes + " lead(s) caliente(s) requieren atención", link: "/crm" })
    setAlertas(alerts)
    setLoading(false)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtShort = (n: number) => {
    if (n >= 1000000) return "S/ " + (n / 1000000).toFixed(1) + "M"
    if (n >= 1000) return "S/ " + (n / 1000).toFixed(0) + "K"
    return fmt(n)
  }

  const donaData = [
    { label: "Pendiente", value: metricas.estadosCount?.pendiente_aprobacion || 0, color: "#f59e0b" },
    { label: "Aprobado", value: metricas.estadosCount?.aprobado || 0, color: "#3b82f6" },
    { label: "En curso", value: metricas.estadosCount?.en_curso || 0, color: "#10b981" },
    { label: "Terminado", value: metricas.estadosCount?.terminado || 0, color: "#6b7280" },
    { label: "Facturado", value: metricas.estadosCount?.facturado || 0, color: "#8b5cf6" },
    { label: "Liquidado", value: metricas.estadosCount?.liquidado || 0, color: "#059669" },
  ]

  if (loading) return <div style={{ color: "#6b7280", padding: 24, fontSize: 13 }}>Cargando dashboard...</div>

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "0 0 32px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#1E293B" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Bienvenido, {perfil?.nombre} {perfil?.apellido} ·{" "}
            <span style={{ textTransform: "capitalize", color: "#0F6E56", fontWeight: 600 }}>
              {perfil?.perfil?.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo proyecto</a>
      </div>

      {/* Alertas críticas */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 20, display: "grid", gap: 8 }}>
          {alertas.map((a, i) => (
            <a key={i} href={a.link} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10,
                background: a.tipo === "hot" ? "#fef2f2" : a.tipo === "warning" ? "#fffbeb" : "#eff6ff",
                border: "1px solid " + (a.tipo === "hot" ? "#fecaca" : a.tipo === "warning" ? "#fde68a" : "#bfdbfe"),
              }}>
                <span style={{ fontSize: 16 }}>{a.tipo === "hot" ? "🔥" : a.tipo === "warning" ? "⚠️" : "ℹ️"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: a.tipo === "hot" ? "#dc2626" : a.tipo === "warning" ? "#d97706" : "#2563eb" }}>{a.msg}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>Ver →</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* KPIs Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: "4px solid #2563EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Facturado este mes</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1E293B" }}>{fmtShort(metricas.factMesAct || 0)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: (metricas.varFacturacion || 0) >= 0 ? "#059669" : "#dc2626" }}>
              {(metricas.varFacturacion || 0) >= 0 ? "↑" : "↓"} {Math.abs(metricas.varFacturacion || 0).toFixed(1)}%
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>vs mes anterior</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: "4px solid #1e40af" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Por cobrar</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1e40af" }}>{fmtShort(metricas.porCobrar || 0)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Total cobrado: {fmtShort(metricas.totalCobrado || 0)}</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: "4px solid " + ((metricas.margenPromedio || 0) >= 30 ? "#059669" : "#dc2626") }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Margen real</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: (metricas.margenPromedio || 0) >= 30 ? "#059669" : "#dc2626" }}>
            {(metricas.margenPromedio || 0) > 0 ? (metricas.margenPromedio || 0).toFixed(1) + "%" : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>En proyectos liquidados</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Proyectos activos</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0F6E56" }}>{metricas.activos || 0}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{metricas.pendientes || 0} pendientes aprobación</div>
        </div>
      </div>

      {/* KPIs Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>RQs pendientes</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: (metricas.rqsPendientes || 0) > 0 ? "#d97706" : "#374151" }}>{metricas.rqsPendientes || 0}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtShort(metricas.rqsPendientesMonto || 0)} en espera</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Sin liquidar</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: (metricas.terminadosSinLiquidar || 0) > 0 ? "#d97706" : "#374151" }}>{metricas.terminadosSinLiquidar || 0}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Proyectos terminados</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Pipeline CRM</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{metricas.pipelineCRM || 0}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{metricas.leadsCalientes || 0} leads calientes 🔥</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Cotizaciones mes</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{metricas.cotMes || 0}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Versiones generadas</div>
        </div>
      </div>

      {/* Row 3: Dona + Proyectos */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Estados de proyectos</div>
          <DonaChart data={donaData} />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#1E293B" }}>Proyectos recientes</h2>
            <a href="/proyectos" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>Ver todos →</a>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: "8px 20px", fontSize: 11, fontWeight: 600, color: "#64748B" }}>CÓDIGO</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748B" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748B" }}>CLIENTE</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748B" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748B" }}>INICIO</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No hay proyectos. <a href="/proyectos/nuevo" style={{ color: "#0F6E56", fontWeight: 600 }}>Crea el primero</a>
                </td></tr>
              ) : proyectos.map((p, idx) => {
                const ec = ESTADO_COLOR[p.estado] || { bg: "#f3f4f6", color: "#6b7280", label: p.estado }
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#64748B", fontFamily: "monospace" }}>{p.codigo}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <a href={"/proyectos/" + p.id} style={{ fontWeight: 600, color: "#1E293B", textDecoration: "none", fontSize: 13 }}>{p.nombre}</a>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#475569" }}>{p.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ec.label}</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8" }}>
                      {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}