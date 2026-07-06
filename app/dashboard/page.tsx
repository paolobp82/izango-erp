"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-html-link-for-pages, react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  alcanceModulo,
  dashboardScope,
  filtrarPorAlcance,
  puedeVerInformacionSensible,
} from "@/lib/permisos"
import KpiCard from "@/components/ui/KpiCard"
import MasterPage from "@/components/design-system/MasterPage"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts"

const ESTADO_COLOR: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Prod." },
  aprobado:             { bg: "#dbeafe", color: "#1e40af", label: "Aprobado" },
  aprobado_gerencia:    { bg: "#e0e7ff", color: "#3730a3", label: "Aprobado Gerencia" },
  aprobado_cliente:     { bg: "#dcfce7", color: "#15803d", label: "Aprobado Cliente" },
  en_curso:             { bg: "#dcfce7", color: "#15803d", label: "En curso" },
  terminado:            { bg: "#f3f4f6", color: "#6b7280", label: "Terminado" },
  facturado:            { bg: "#f5f3ff", color: "#6d28d9", label: "Facturado" },
  liquidado:            { bg: "#f0fdf4", color: "#166534", label: "Liquidado" },
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const COTIZACION_APROBADA_ESTADOS = ["aprobada_cliente", "aprobado_cliente"]
const PROYECTO_PENDIENTE_ESTADOS = ["pendiente_aprobacion"]
const PROYECTO_EN_CURSO_ESTADOS = ["aprobado_cliente", "en_curso", "terminado", "liquidado", "pendiente_facturacion", "facturado", "cerrado_financiero"]
const FACTURA_ANULADA_ESTADOS = ["anulada", "cancelada"]
const FACTURA_COBRADA_ESTADOS = ["cobrada", "pagada"]
const FACTURA_POR_COBRAR_ESTADOS = ["emitida", "pendiente", "pendiente_cobro"]
const num = (value: any) => Number(value) || 0
const COTIZACION_SELECT = "id, proyecto_id, version, estado, created_at, updated_at, total_cliente, subtotal_precio_cliente, subtotal_con_fee, igv_monto, fee_agencia_pct, fee_activo, igv_pct, descuento_pct, items:cotizacion_items(precio_cliente, incluir_en_total)"
const FINANCIAL_LOCK_LABEL = "Restringido"

function totalCotizacion(cotizacion: any) {
  const totalGuardado = [
    cotizacion?.total_cliente,
    cotizacion?.subtotal_con_fee && num(cotizacion.subtotal_con_fee) + num(cotizacion.igv_monto),
    cotizacion?.subtotal_precio_cliente,
  ].map(num).find(total => total > 0)

  if (totalGuardado) return totalGuardado

  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : []
  const totalPrecioCliente = items
    .filter((item: any) => item.incluir_en_total !== false)
    .reduce((s: number, item: any) => s + num(item.precio_cliente), 0)

  if (totalPrecioCliente <= 0) return 0

  const feePct = cotizacion?.fee_activo === false ? 0 : num(cotizacion?.fee_agencia_pct)
  const subtotalConFee = totalPrecioCliente + (totalPrecioCliente * feePct / 100)
  const subtotalConDescuento = subtotalConFee - (subtotalConFee * num(cotizacion?.descuento_pct) / 100)
  const igvPct = cotizacion?.igv_pct === null || cotizacion?.igv_pct === undefined ? 18 : num(cotizacion.igv_pct)
  return subtotalConDescuento + (subtotalConDescuento * igvPct / 100)
}

function fechaCotizacion(cotizacion: any) {
  return new Date(cotizacion?.updated_at || cotizacion?.created_at || 0).getTime()
}

function ordenarCotizaciones(a: any, b: any) {
  const aAprobada = COTIZACION_APROBADA_ESTADOS.includes(a?.estado) ? 1 : 0
  const bAprobada = COTIZACION_APROBADA_ESTADOS.includes(b?.estado) ? 1 : 0
  if (aAprobada !== bAprobada) return bAprobada - aAprobada

  const versionDiff = num(b?.version) - num(a?.version)
  if (versionDiff !== 0) return versionDiff

  const fechaDiff = fechaCotizacion(b) - fechaCotizacion(a)
  if (fechaDiff !== 0) return fechaDiff

  return totalCotizacion(b) - totalCotizacion(a)
}

function mejorCotizacion(cotizaciones: any[]) {
  return [...cotizaciones]
    .filter(cotizacion => totalCotizacion(cotizacion) > 0)
    .sort(ordenarCotizaciones)[0]
}

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
  const [cotsProyState, setCotsProyState] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)
    const alcanceDashboard = alcanceModulo(p, "dashboard")
    const scopeDashboard = dashboardScope(p)
    const canSeePrecioCliente = puedeVerInformacionSensible(p, "precio_cliente")
    const canSeeFacturas = puedeVerInformacionSensible(p, "facturas") || puedeVerInformacionSensible(p, "facturacion_consolidada")
    const canSeeCobranza = puedeVerInformacionSensible(p, "cobranza")
    const canSeeCostos = puedeVerInformacionSensible(p, "costo_real") || puedeVerInformacionSensible(p, "costo_presupuestado")
    const canSeeMargen = puedeVerInformacionSensible(p, "margen_pct") || puedeVerInformacionSensible(p, "margenes") || puedeVerInformacionSensible(p, "rentabilidad")

    if (alcanceDashboard === "NINGUNO" || scopeDashboard.sinAcceso) {
      setProyectos([])
      setMetricas({})
      setAlertas([])
      setChartFacturacion([])
      setChartEstados([])
      setChartRQs([])
      setTopProyectos([])
      setCotsProyState([])
      setLoading(false)
      return
    }

    const dashboardResults = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido), cotizacion_aprobada:cotizaciones!cotizacion_aprobada_id(total_cliente)").is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
      supabase.from("proyectos").select("id, estado, codigo, nombre, created_at, fecha_inicio, productor_id, comercial_id, created_by, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").is("deleted_at", null),
      supabase.from("facturas").select("subtotal, igv, monto_final_abonado, estado, created_at, fecha_emision, proyecto_id"),
      supabase.from("liquidaciones").select("margen_real_pct, cerrada, proyecto_id, created_by"),
      supabase.from("requerimientos_pago").select("id, estado, monto_solicitado, proyecto_id, solicitado_por, created_by"),
      supabase.from("cotizaciones").select(COTIZACION_SELECT).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from("crm_leads").select("estado, temperatura, presupuesto_estimado, created_by"),
      supabase.from("cotizaciones").select(COTIZACION_SELECT),
    ])
    const [
      provsResult,
      todosProyectosResult,
      facturasResult,
      liquidacionesResult,
      rqsResult,
      cotMesResult,
      leadsResult,
      cotsProyResult,
    ] = dashboardResults
    const dashboardErrors = [
      ["proyectos recientes", provsResult.error],
      ["proyectos", todosProyectosResult.error],
      ["facturas", facturasResult.error],
      ["liquidaciones", liquidacionesResult.error],
      ["requerimientos_pago", rqsResult.error],
      ["cotizaciones del mes", cotMesResult.error],
      ["crm_leads", leadsResult.error],
      ["cotizaciones por proyecto", cotsProyResult.error],
    ].filter(([, error]) => Boolean(error))
    if (dashboardErrors.length > 0) {
      console.error("Dashboard Supabase errors:", dashboardErrors)
    }
    const provs = provsResult.data
    const todosProyectos = todosProyectosResult.data
    const facturas = facturasResult.data
    const liquidaciones = liquidacionesResult.data
    const rqs = rqsResult.data
    const cotMes = cotMesResult.data
    const leads = leadsResult.data
    const cotsProy = cotsProyResult.data

    const rawProjects = todosProyectos || []
    const teamIds = scopeDashboard.equipo && p?.perfil === "gerente_produccion"
      ? rawProjects.flatMap((proyecto: any) => [proyecto.productor_id, proyecto.comercial_id]).filter(Boolean)
      : []
    const contextoPermisos = { usuarioId: user.id, equipoIds: teamIds }
    const allProv = filtrarPorAlcance(rawProjects, p, "dashboard", contextoPermisos)
    const proyectosRecientes = filtrarPorAlcance((provs || []), p, "dashboard", contextoPermisos)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 10)
    setProyectos(proyectosRecientes)
    const activeProjectIds = new Set(allProv.map((p: any) => String(p.id)))
    const projectById = new Map(allProv.map((p: any) => [p.id, p]))
    const scopedProjectIds = Array.from(activeProjectIds).map(String)
    const rowHasActiveProject = (row: any) => row?.proyecto_id ? activeProjectIds.has(String(row.proyecto_id)) : scopeDashboard.total
    const facturasActivas = canSeeFacturas ? (facturas || []).filter(rowHasActiveProject) : []
    const liquidacionesActivas = canSeeMargen ? (liquidaciones || []).filter(rowHasActiveProject) : []
    const rqsActivosBase = canSeeCostos ? (rqs || []).filter(rowHasActiveProject) : []
    const rqsActivos = filtrarPorAlcance(rqsActivosBase, p, "rq", { ...contextoPermisos, proyectoIds: scopedProjectIds })
    const cotsProyActivas = (cotsProy || []).filter(rowHasActiveProject)
    const cotMesActivas = (cotMes || []).filter(rowHasActiveProject)
    const leadsVisibles = filtrarPorAlcance((leads || []), p, "crm", contextoPermisos)
    setCotsProyState(cotsProyActivas)
    const cotizacionesPorProyecto = new Map<string, any[]>()
    cotsProyActivas.forEach((cotizacion: any) => {
      if (!cotizacion?.proyecto_id) return
      const proyectoId = String(cotizacion.proyecto_id)
      cotizacionesPorProyecto.set(proyectoId, [...(cotizacionesPorProyecto.get(proyectoId) || []), cotizacion])
    })
    const mejorCotizacionProyecto = (proyectoId: string) => mejorCotizacion(cotizacionesPorProyecto.get(String(proyectoId)) || [])
    const totalMejorCotizacionProyecto = (proyectoId: string) => totalCotizacion(mejorCotizacionProyecto(proyectoId))

    // Métricas base
    const activos = allProv.filter(p => p.estado === "en_curso")
    const pendientes = allProv.filter(p => p.estado === "pendiente_aprobacion")
    const terminadosSinLiquidar = allProv.filter(p => p.estado === "terminado")
    const fechaFactura = (factura: any) => new Date(factura.fecha_emision || factura.created_at)
    const totalFacturado = facturasActivas.filter(f => !FACTURA_ANULADA_ESTADOS.includes(f.estado)).reduce((s, f) => s + num(f.subtotal) + num(f.igv), 0)
    const totalCobrado = canSeeCobranza ? facturasActivas.filter(f => FACTURA_COBRADA_ESTADOS.includes(f.estado)).reduce((s, f) => s + num(f.monto_final_abonado), 0) : 0
    const porCobrar = canSeeCobranza ? facturasActivas.filter(f => FACTURA_POR_COBRAR_ESTADOS.includes(f.estado)).reduce((s, f) => s + num(f.monto_final_abonado), 0) : 0
    const liqCerradas = liquidacionesActivas.filter(l => l.cerrada && Number.isFinite(Number(l.margen_real_pct)))
    const margenPromedio = liqCerradas.length > 0 ? liqCerradas.reduce((s, l) => s + num(l.margen_real_pct), 0) / liqCerradas.length : 0
    const rqsPendientes = rqsActivos.filter(r => !["pagado","rechazado","cancelado","cerrado"].includes(r.estado))
    const rqsPendientesMonto = rqsPendientes.reduce((s, r) => s + num(r.monto_solicitado), 0)
    const leadsCalientes = leadsVisibles.filter(l => l.temperatura === "caliente").length
    const pipelineCRM = leadsVisibles.filter(l => !["ganado","perdido"].includes(l.estado)).length

    // Comparativa mes anterior
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1)
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
    const factMesAct = facturasActivas.filter(f => fechaFactura(f) >= inicioMes && !FACTURA_ANULADA_ESTADOS.includes(f.estado)).reduce((s,f) => s + num(f.subtotal) + num(f.igv),0)
    const factMesAnt = facturasActivas.filter(f => { const d = fechaFactura(f); return d >= inicioMesAnt && d <= finMesAnt && !FACTURA_ANULADA_ESTADOS.includes(f.estado) }).reduce((s,f) => s + num(f.subtotal) + num(f.igv),0)
    const varFacturacion = factMesAnt > 0 ? ((factMesAct - factMesAnt) / factMesAnt) * 100 : 0

    setMetricas({
      activos: activos.length, pendientes: pendientes.length,
      terminadosSinLiquidar: terminadosSinLiquidar.length,
      rqsPendientes: rqsPendientes.length, rqsPendientesMonto,
      totalFacturado, totalCobrado, porCobrar, margenPromedio,
      cotMes: cotMesActivas.length, leadsCalientes, pipelineCRM, factMesAct, varFacturacion,
      canSeePrecioCliente, canSeeFacturas, canSeeCobranza, canSeeCostos, canSeeMargen,
      presupuestosPendientes: canSeePrecioCliente ? allProv.filter((p: any) => {
        const creado = p.created_at ? new Date(p.created_at) : null
        return PROYECTO_PENDIENTE_ESTADOS.includes(p.estado) && creado && creado >= inicioMes && creado <= hoy
      }).reduce((s: number, p: any) => s + totalMejorCotizacionProyecto(p.id), 0) : 0,
      pendientesMes: allProv.filter((p: any) => {
        const creado = p.created_at ? new Date(p.created_at) : null
        return PROYECTO_PENDIENTE_ESTADOS.includes(p.estado) && creado && creado >= inicioMes && creado <= hoy
      }).length,
      presupuestosAprobados: canSeePrecioCliente ? allProv
        .filter((p: any) => PROYECTO_EN_CURSO_ESTADOS.includes(p.estado))
        .reduce((s: number, p: any) => s + totalMejorCotizacionProyecto(p.id), 0) : 0,
    })

    // Chart facturación por mes (últimos 6 meses)
    const chartFact: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth()-i+1, 0)
      const facturado = canSeeFacturas ? facturasActivas.filter(f => { const fd = fechaFactura(f); return fd >= d && fd <= fin && !FACTURA_ANULADA_ESTADOS.includes(f.estado) }).reduce((s,f) => s + num(f.subtotal) + num(f.igv),0) : 0
      const cobrado = canSeeCobranza ? facturasActivas.filter(f => { const fd = fechaFactura(f); return fd >= d && fd <= fin && FACTURA_COBRADA_ESTADOS.includes(f.estado) }).reduce((s,f) => s + num(f.monto_final_abonado),0) : 0
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
      { name: "Pendiente", value: rqsActivos.filter(r => r.estado === "pendiente_aprobacion").length, color: "#f59e0b" },
      { name: "Aprobado", value: rqsActivos.filter(r => r.estado === "aprobado").length, color: "#3b82f6" },
      { name: "Programado", value: rqsActivos.filter(r => r.estado === "programado").length, color: "#8b5cf6" },
      { name: "Pagado", value: rqsActivos.filter(r => r.estado === "pagado").length, color: "#10b981" },
    ].filter(d => d.value > 0)
    setChartRQs(rqsData)

    // Top proyectos por valor
    const top = canSeePrecioCliente ? allProv
      .map((proyecto: any) => {
        const cotizacion = mejorCotizacionProyecto(proyecto.id)
        return {
          nombre: projectById.get(proyecto.id)?.codigo || "—",
          valor: Math.round(totalCotizacion(cotizacion)),
        }
      })
      .filter((c: any) => c.valor > 0)
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5) : []
    setTopProyectos(top)

    // Alertas
    const alerts: any[] = []
    if (pendientes.length > 0) alerts.push({ tipo: "warning", msg: pendientes.length + " proyecto(s) esperando aprobación", link: "/proyectos" })
    if (terminadosSinLiquidar.length > 0) alerts.push({ tipo: "warning", msg: terminadosSinLiquidar.length + " proyecto(s) terminado(s) sin liquidar", link: "/liquidaciones" })
    if (rqsPendientes.length > 0) alerts.push({ tipo: "info", msg: rqsPendientes.length + " RQs pendientes" + (canSeeCostos ? " — S/ " + Number(rqsPendientesMonto).toLocaleString("es-PE",{minimumFractionDigits:0}) : ""), link: "/rq" })
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
      )}      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="Presupuestos Pendientes" value={metricas.canSeePrecioCliente ? fmt(metricas.presupuestosPendientes || 0) : FINANCIAL_LOCK_LABEL} sub={(metricas.pendientesMes || 0) + " oportunidades abiertas este mes"} borderColor="#10B981" valueColor="#059669" />

        <KpiCard icon="shield" label="Presupuestos en Curso" value={metricas.canSeePrecioCliente ? fmt(metricas.presupuestosAprobados || 0) : FINANCIAL_LOCK_LABEL} sub={`${metricas.activos || 0} proyectos en ejecución`} borderColor="#3B82F6" valueColor="#1D4ED8" />

        <KpiCard icon="chart" label="Facturado Este Mes" value={metricas.canSeeFacturas ? fmtShort(metricas.factMesAct || 0) : FINANCIAL_LOCK_LABEL} sub="0% vs. mes ant." borderColor="#14B8A6" valueColor="#0D9488" />

        <KpiCard icon="wallet" label="Por Cobrar" value={metricas.canSeeCobranza ? fmtShort(metricas.porCobrar || 0) : FINANCIAL_LOCK_LABEL} sub={metricas.canSeeCobranza ? "Cobrados: " + fmtShort(metricas.totalCobrado || 0) : "Información financiera restringida"} borderColor="#8B5CF6" valueColor="#5B21B6" />

        <KpiCard icon="folder" label="Proyectos en Curso" value={String(metricas.activos || 0)} sub="Actualmente en ejecución" borderColor="#F97316" valueColor="#EA580C" />

        <KpiCard icon="file" label="Cotizaciones Mes" value={String(metricas.cotMes || 0)} sub="Versiones generadas" borderColor="#10B981" valueColor="#059669" />
      </div>

      {/* Gráficos Row 1: Facturación + Estados */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Tendencia de facturación — últimos 6 meses</div>
          {!metricas.canSeeFacturas ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 64 }}>Información financiera restringida</div>
          ) : (
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
          )}
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
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>Top proyectos aprobados por valor</div>
          {!metricas.canSeePrecioCliente ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 32 }}>Información comercial restringida</div>
          ) : topProyectos.length === 0 ? (
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
          {!metricas.canSeeCostos ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 32 }}>Información financiera restringida</div>
          ) : chartRQs.length === 0 ? (
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
              {["CÓDIGO","PROYECTO","CLIENTE","PRODUCTOR","ESTADO","SUBTOTAL","INICIO"].map(h => (
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
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
                    {metricas.canSeePrecioCliente ? (() => { const cots = (cotsProyState || []).filter((c: any) => String(c.proyecto_id) === String(p.id)); const monto = totalCotizacion(mejorCotizacion(cots)); return monto ? fmt(monto) : "—" })() : "—"}
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
















