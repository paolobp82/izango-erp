"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts"

const ESTADO_COLOR: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Prod." },
  aprobado:             { bg: "#dbeafe", color: "#1e40af", label: "Aprobado" },
  en_curso:             { bg: "#dcfce7", color: "#15803d", label: "En curso" },
  terminado:            { bg: "#f3f4f6", color: "#6b7280", label: "Terminado" },
  facturado:            { bg: "#f5f3ff", color: "#6d28d9", label: "Facturado" },
  liquidado:            { bg: "#f0fdf4", color: "#166534", label: "Liquidado" },
}

const DONA_COLORS = ["#f59e0b","#3b82f6","#10b981","#6b7280","#8b5cf6","#059669"]
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default function DashboardPage() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [proyectos, setProyectos] = useState<any[]>([])
  const [metricas, setMetricas] = useState<any>({})
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [chartFacturacion, setChartFacturacion] = useState<any[]>([])
  const [chartEstados, setChartEstados] = useState<any[]>([])
  const [chartRQs, setChartRQs] = useState<any[]>([])
  const [topProyectos, setTopProyectos] = useState<any[]>([])

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
      { data: cotizaciones },
    ] = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").order("created_at", { ascending: false }).limit(10),
      supabase.from("facturas").select("subtotal, igv, monto_final_abonado, estado, created_at"),
      supabase.from("liquidaciones").select("margen_real_pct, cerrada, proyecto_id"),
      supabase.from("requerimientos_pago").select("id, estado, monto_solicitado"),
      supabase.from("cotizaciones").select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from("crm_leads").select("estado, temperatura, presupuesto_estimado"),
      supabase.from("cotizaciones").select("proyecto_id, total_cliente, estado, proyecto:proyectos(nombre, codigo)").eq("estado", "aprobada_cliente").order("total_cliente", { ascending: false }).limit(6),
    ])

    setProyectos(provs || [])

    // Métricas base
    const allProv = provs || []
    const activos = allProv.filter(p => ["aprobado","aprobado_produccion","en_curso"].includes(p.estado))
    const pendientes = allProv.filter(p => p.estado === "pendiente_aprobacion")
    const terminadosSinLiquidar = allProv.filter(p => p.estado === "terminado")
    const totalFacturado = (facturas || []).filter(f => f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal||0)+(f.igv||0)), 0)
    const totalCobrado = (facturas || []).filter(f => f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado||0), 0)
    const porCobrar = (facturas || []).filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado||0), 0)
    const liqCerradas = (liquidaciones || []).filter(l => l.cerrada && l.margen_real_pct > 0)
    const margenPromedio = liqCerradas.length > 0 ? liqCerradas.reduce((s, l) => s + l.margen_real_pct, 0) / liqCerradas.length : 0
    const rqsPendientes = (rqs || []).filter(r => !["pagado","rechazado"].includes(r.estado))
    const rqsPendientesMonto = rqsPendientes.reduce((s, r) => s + (r.monto_solicitado||0), 0)
    const leadsCalientes = (leads || []).filter(l => l.temperatura === "caliente").length
    const pipelineCRM = (leads || []).filter(l => !["ganado","perdido"].includes(l.estado)).length

    // Comparativa mes anterior
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1)
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
    const factMesAct = (facturas||[]).filter(f => new Date(f.created_at) >= inicioMes && f.estado !== "anulada").reduce((s,f) => s+((f.subtotal||0)+(f.igv||0)),0)
    const factMesAnt = (facturas||[]).filter(f => { const d = new Date(f.created_at); return d >= inicioMesAnt && d <= finMesAnt && f.estado !== "anulada" }).reduce((s,f) => s+((f.subtotal||0)+(f.igv||0)),0)
    const varFacturacion = factMesAnt > 0 ? ((factMesAct - factMesAnt) / factMesAnt) * 100 : 0

    setMetricas({
      activos: activos.length, pendientes: pendientes.length,
      terminadosSinLiquidar: terminadosSinLiquidar.length,
      rqsPendientes: rqsPendientes.length, rqsPendientesMonto,
      totalFacturado, totalCobrado, porCobrar, margenPromedio,
      cotMes: cotMes||0, leadsCalientes, pipelineCRM, factMesAct, varFacturacion,
    })

    // Chart facturación por mes (últimos 6 meses)
    const chartFact: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth()-i+1, 0)
      const facturado = (facturas||[]).filter(f => { const fd = new Date(f.created_at); return fd >= d && fd <= fin && f.estado !== "anulada" }).reduce((s,f) => s+((f.subtotal||0)+(f.igv||0)),0)
      const cobrado = (facturas||[]).filter(f => { const fd = new Date(f.created_at); return fd >= d && fd <= fin && f.estado === "cobrada" }).reduce((s,f) => s+(f.monto_final_abonado||0),0)
      chartFact.push({ mes: MESES[d.getMonth()], facturado: Math.round(facturado), cobrado: Math.round(cobrado) })
    }
    setChartFacturacion(chartFact)

    // Chart estados proyectos para dona
    const estadosData = [
      { name: "Pendiente", value: allProv.filter(p => p.estado === "pendiente_aprobacion").length, color: "#f59e0b" },
      { name: "Aprobado", value: allProv.filter(p => p.estado === "aprobado").length, color: "#3b82f6" },
      { name: "En curso", value: allProv.filter(p => p.estado === "en_curso").length, color: "#10b981" },
      { name: "Terminado", value: allProv.filter(p => p.estado === "terminado").length, color: "#6b7280" },
      { name: "Facturado", value: allProv.filter(p => p.estado === "facturado").length, color: "#8b5cf6" },
      { name: "Liquidado", value: allProv.filter(p => p.estado === "liquidado").length, color: "#059669" },
    ].filter(d => d.value > 0)
    setChartEstados(estadosData)

    // Chart RQs por estado
    const rqsData = [
      { name: "Pendiente", value: (rqs||[]).filter(r => r.estado === "pendiente_aprobacion").length, color: "#f59e0b" },
      { name: "Aprobado", value: (rqs||[]).filter(r => r.estado === "aprobado").length, color: "#3b82f6" },
      { name: "Programado", value: (rqs||[]).filter(r => r.estado === "programado").length, color: "#8b5cf6" },
      { name: "Pagado", value: (rqs||[]).filter(r => r.estado === "pagado").length, color: "#10b981" },
    ].filter(d => d.value > 0)
    setChartRQs(rqsData)

    // Top proyectos por valor
    const top = (cotizaciones||[]).map((c: any) => ({
      nombre: c.proyecto?.codigo || "—",
      valor: Math.round(c.total_cliente || 0),
    })).slice(0, 5)
    setTopProyectos(top)

    // Alertas
    const alerts: any[] = []
    if (pendientes.length > 0) alerts.push({ tipo: "warning", msg: pendientes.length + " proyecto(s) esperando aprobación", link: "/proyectos" })
    if (terminadosSinLiquidar.length > 0) alerts.push({ tipo: "warning", msg: terminadosSinLiquidar.length + " proyecto(s) terminado(s) sin liquidar", link: "/liquidaciones" })
    if (rqsPendientes.length > 0) alerts.push({ tipo: "info", msg: rqsPendientes.length + " RQs pendientes — S/ " + Number(rqsPendientesMonto).toLocaleString("es-PE",{minimumFractionDigits:0}), link: "/rq" })
    if (leadsCalientes > 0) alerts.push({ tipo: "hot", msg: leadsCalientes + " lead(s) caliente(s) requieren atención", link: "/crm" })
    setAlertas(alerts)
    setLoading(false)
  }

  const fmt = (n: number) => "S/ " + Number(n||0).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2})
  const fmtShort = (n: number) => {
    if (n >= 1000000) return "S/ " + (n/1000000).toFixed(1) + "M"
    if (n >= 1000) return "S/ " + (n/1000).toFixed(0) + "K"
    return fmt(n)
  }
  const fmtAxis = (v: number) => v >= 1000 ? (v/1000).toFixed(0)+"K" : String(v)

  if (loading) return <div style={{ color: "#6b7280", padding: 24, fontSize: 13 }}>Cargando dashboard...</div>

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
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

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 20, display: "grid", gap: 8 }}>
          {alertas.map((a, i) => (
            <a key={i} href={a.link} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10,
                background: a.tipo === "hot" ? "#fef2f2" : a.tipo === "warning" ? "#fffbeb" : "#eff6ff",
                border: "1px solid " + (a.tipo === "hot" ? "#fecaca" : a.tipo === "warning" ? "#fde68a" : "#bfdbfe") }}>
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
        {[
          { label: "Facturado este mes", value: fmtShort(metricas.factMesAct||0), sub: (metricas.varFacturacion||0) >= 0 ? "↑ "+Math.abs(metricas.varFacturacion||0).toFixed(1)+"% vs mes ant." : "↓ "+Math.abs(metricas.varFacturacion||0).toFixed(1)+"% vs mes ant.", subColor: (metricas.varFacturacion||0) >= 0 ? "#059669" : "#dc2626", border: "#2563EB", valueColor: "#1E293B" },
          { label: "Por cobrar", value: fmtShort(metricas.porCobrar||0), sub: "Cobrado: "+fmtShort(metricas.totalCobrado||0), subColor: "#64748B", border: "#1e40af", valueColor: "#1e40af" },
          { label: "Margen real", value: (metricas.margenPromedio||0) > 0 ? (metricas.margenPromedio||0).toFixed(1)+"%" : "—", sub: "En proyectos liquidados", subColor: "#64748B", border: (metricas.margenPromedio||0) >= 30 ? "#059669" : "#dc2626", valueColor: (metricas.margenPromedio||0) >= 30 ? "#059669" : "#dc2626" },
          { label: "Proyectos activos", value: String(metricas.activos||0), sub: (metricas.pendientes||0)+" pendientes aprobación", subColor: "#64748B", border: "#0F6E56", valueColor: "#0F6E56" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: "4px solid "+k.border }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.valueColor }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.subColor, marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* KPIs Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "RQs pendientes", value: String(metricas.rqsPendientes||0), sub: fmtShort(metricas.rqsPendientesMonto||0)+" en espera", color: (metricas.rqsPendientes||0) > 0 ? "#d97706" : "#374151" },
          { label: "Sin liquidar", value: String(metricas.terminadosSinLiquidar||0), sub: "Proyectos terminados", color: (metricas.terminadosSinLiquidar||0) > 0 ? "#d97706" : "#374151" },
          { label: "Pipeline CRM", value: String(metricas.pipelineCRM||0), sub: (metricas.leadsCalientes||0)+" leads calientes 🔥", color: "#374151" },
          { label: "Cotizaciones mes", value: String(metricas.cotMes||0), sub: "Versiones generadas", color: "#374151" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficos Row 1: Facturación + Estados */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Tendencia de facturación — últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartFacturacion} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
              <Tooltip formatter={(v: any) => fmtShort(v)} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="facturado" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: "#2563EB" }} name="Facturado" />
              <Line type="monotone" dataKey="cobrado" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: "#059669" }} name="Cobrado" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Estados de proyectos</div>
          {chartEstados.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 32 }}>Sin proyectos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartEstados} cx="40%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {chartEstados.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráficos Row 2: Top proyectos + RQs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Top proyectos por valor aprobado</div>
          {topProyectos.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 32 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProyectos} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v: any) => fmtShort(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="valor" fill="#0F6E56" radius={[0, 6, 6, 0]} name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>RQs por estado</div>
          {chartRQs.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 32 }}>Sin RQs</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartRQs} cx="50%" cy="45%" outerRadius={70} dataKey="value" paddingAngle={3} label={({ name, value }) => name + ": " + value}>
                  {chartRQs.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Proyectos recientes */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#1E293B" }}>Proyectos recientes</h2>
          <a href="/proyectos" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>Ver todos →</a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["CÓDIGO","PROYECTO","CLIENTE","PRODUCTOR","ESTADO","INICIO"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px " + (h === "CÓDIGO" ? "20px" : "12px"), fontSize: 11, fontWeight: 600, color: "#64748B" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proyectos.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No hay proyectos. <a href="/proyectos/nuevo" style={{ color: "#0F6E56", fontWeight: 600 }}>Crea el primero</a>
              </td></tr>
            ) : proyectos.map((p, idx) => {
              const ec = ESTADO_COLOR[p.estado] || { bg: "#f3f4f6", color: "#6b7280", label: p.estado }
              return (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#64748B", fontFamily: "monospace" }}>{p.codigo}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <a href={"/proyectos/"+p.id} style={{ fontWeight: 600, color: "#1E293B", textDecoration: "none", fontSize: 13 }}>{p.nombre}</a>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "#475569" }}>{p.cliente?.razon_social || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "#475569" }}>{p.productor ? p.productor.nombre+" "+p.productor.apellido : "—"}</td>
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
  )
}