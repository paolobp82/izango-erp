"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  Plus,
  ReceiptText,
  Search,
  Shield,
} from "lucide-react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { createClient } from "@/lib/supabase"
import {
  alcanceModulo,
  dashboardScope,
  filtrarPorAlcance,
  puedeVerInformacionSensible,
  type RegistroConPropiedad,
} from "@/lib/permisos"
import {
  esFacturaAnulada,
  montoCobradoFactura,
  saldoPendienteFactura,
  totalFactura,
} from "@/lib/finance"
import {
  V2Button,
  V2EmptyState,
  V2IconButton,
  V2Input,
  V2SectionCard,
  V2Skeleton,
  V2Toolbar,
  V2ExecutiveHeader,
  V2KpiCard,
  V2AlertCard,
  V2ChartCard,
  V2StatusBreakdown,
  V2ActivityTimeline,
  V2IntelligencePanel,
  V2FinancialSummary,
  V2QuickActions,
  V2StatusBadge,
} from "@/components/v2/system"
import systemStyles from "@/components/v2/system/V2System.module.css"
import styles from "./DashboardV2.module.css"

type Perfil = {
  id: string
  nombre?: string | null
  apellido?: string | null
  perfil?: string | null
}

type Cliente = {
  razon_social?: string | null
}

type Productor = {
  nombre?: string | null
  apellido?: string | null
}

type Proyecto = RegistroConPropiedad & {
  codigo?: string | null
  nombre?: string | null
  estado?: string | null
  created_at?: string | null
  fecha_inicio?: string | null
  cotizacion_aprobada_id?: string | null
  cliente?: Cliente | null
  productor?: Productor | null
}

type Factura = {
  subtotal?: number | string | null
  igv?: number | string | null
  monto_final_abonado?: number | string | null
  estado?: string | null
  created_at?: string | null
  fecha_emision?: string | null
  proyecto_id?: string | null
}

type Liquidacion = {
  margen_real_pct?: number | string | null
  cerrada?: boolean | null
  proyecto_id?: string | null
  created_by?: string | null
}

type RequerimientoPago = RegistroConPropiedad & {
  estado?: string | null
  monto_solicitado?: number | string | null
}

type CotizacionItem = {
  precio_cliente?: number | string | null
  incluir_en_total?: boolean | null
}

type Cotizacion = {
  id?: string | null
  proyecto_id?: string | null
  version?: number | string | null
  estado?: string | null
  created_at?: string | null
  updated_at?: string | null
  total_cliente?: number | string | null
  subtotal_precio_cliente?: number | string | null
  subtotal_con_fee?: number | string | null
  igv_monto?: number | string | null
  fee_agencia_pct?: number | string | null
  fee_activo?: boolean | null
  igv_pct?: number | string | null
  descuento_pct?: number | string | null
  items?: CotizacionItem[] | null
}

type Lead = RegistroConPropiedad & {
  estado?: string | null
  temperatura?: string | null
  presupuesto_estimado?: number | string | null
}

type ChartPoint = {
  mes: string
  facturado: number
  cobrado: number
}

type DistributionPoint = {
  name: string
  value: number
  color: string
}

type TopProject = {
  nombre: string
  valor: number
}

type AlertItem = {
  link: string
  msg: string
  tipo: "warning" | "info" | "hot"
}

type Metrics = {
  activos: number
  pendientesMes: number
  presupuestosPendientes: number
  presupuestosAprobados: number
  factMesAct: number
  varFacturacion: number
  porCobrar: number
  totalCobrado: number
  totalFacturado: number
  rqsPendientes: number
  rqsPendientesMonto: number
  cotMes: number
  margenPromedio: number
  canSeePrecioCliente: boolean
  canSeeFacturas: boolean
  canSeeCobranza: boolean
  canSeeCostos: boolean
  canSeeMargen: boolean
}

type DashboardData = {
  alertas: AlertItem[]
  chartEstados: DistributionPoint[]
  chartFacturacion: ChartPoint[]
  chartRQs: DistributionPoint[]
  cotsProyState: Cotizacion[]
  metricas: Metrics
  perfil: Perfil
  proyectos: Proyecto[]
  topProyectos: TopProject[]
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const COTIZACION_APROBADA_ESTADOS = ["aprobada_cliente", "aprobado_cliente"]
const PROYECTO_PENDIENTE_ESTADOS = ["pendiente_aprobacion"]
const COTIZACION_SELECT = "id, proyecto_id, version, estado, created_at, updated_at, total_cliente, subtotal_precio_cliente, subtotal_con_fee, igv_monto, fee_agencia_pct, fee_activo, igv_pct, descuento_pct, items:cotizacion_items(precio_cliente, incluir_en_total)"
const FINANCIAL_LOCK_LABEL = "Restringido"

const estadoLabels: Record<string, string> = {
  pendiente_aprobacion: "Pendiente",
  aprobado_produccion: "Aprobado Prod.",
  aprobado: "Aprobado",
  aprobado_gerencia: "Aprobado Gerencia",
  aprobado_cliente: "Aprobado Cliente",
  en_curso: "En curso",
  terminado: "Terminado",
  facturado: "Facturado",
  liquidado: "Liquidado",
}

const emptyMetrics: Metrics = {
  activos: 0,
  pendientesMes: 0,
  presupuestosPendientes: 0,
  presupuestosAprobados: 0,
  factMesAct: 0,
  varFacturacion: 0,
  porCobrar: 0,
  totalCobrado: 0,
  totalFacturado: 0,
  rqsPendientes: 0,
  rqsPendientesMonto: 0,
  cotMes: 0,
  margenPromedio: 0,
  canSeePrecioCliente: false,
  canSeeFacturas: false,
  canSeeCobranza: false,
  canSeeCostos: false,
  canSeeMargen: false,
}

function num(value: number | string | null | undefined) {
  return Number(value) || 0
}

function totalCotizacion(cotizacion: Cotizacion | undefined | null) {
  const totalGuardado = [
    cotizacion?.total_cliente,
    cotizacion?.subtotal_con_fee ? num(cotizacion.subtotal_con_fee) + num(cotizacion.igv_monto) : 0,
    cotizacion?.subtotal_precio_cliente,
  ].map(num).find((total) => total > 0)

  if (totalGuardado) return totalGuardado

  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : []
  const totalPrecioCliente = items
    .filter((item) => item.incluir_en_total !== false)
    .reduce((sum, item) => sum + num(item.precio_cliente), 0)

  if (totalPrecioCliente <= 0) return 0

  const feePct = cotizacion?.fee_activo === false ? 0 : num(cotizacion?.fee_agencia_pct)
  const subtotalConFee = totalPrecioCliente + (totalPrecioCliente * feePct / 100)
  const subtotalConDescuento = subtotalConFee - (subtotalConFee * num(cotizacion?.descuento_pct) / 100)
  const igvPct = cotizacion?.igv_pct === null || cotizacion?.igv_pct === undefined ? 18 : num(cotizacion.igv_pct)
  return subtotalConDescuento + (subtotalConDescuento * igvPct / 100)
}

function fechaCotizacion(cotizacion: Cotizacion) {
  return new Date(cotizacion.updated_at || cotizacion.created_at || 0).getTime()
}

function ordenarCotizaciones(a: Cotizacion, b: Cotizacion) {
  const aAprobada = COTIZACION_APROBADA_ESTADOS.includes(a.estado || "") ? 1 : 0
  const bAprobada = COTIZACION_APROBADA_ESTADOS.includes(b.estado || "") ? 1 : 0
  if (aAprobada !== bAprobada) return bAprobada - aAprobada

  const versionDiff = num(b.version) - num(a.version)
  if (versionDiff !== 0) return versionDiff

  const fechaDiff = fechaCotizacion(b) - fechaCotizacion(a)
  if (fechaDiff !== 0) return fechaDiff

  return totalCotizacion(b) - totalCotizacion(a)
}

function mejorCotizacion(cotizaciones: Cotizacion[]) {
  return [...cotizaciones]
    .filter((cotizacion) => totalCotizacion(cotizacion) > 0)
    .sort(ordenarCotizaciones)[0]
}

function fmtCurrency(value: number) {
  return "S/ " + Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCurrencyShort(value: number) {
  if (value >= 1000000) return "S/ " + (value / 1000000).toFixed(1) + "M"
  if (value >= 1000) return "S/ " + (value / 1000).toFixed(0) + "K"
  return fmtCurrency(value)
}

function fmtAxis(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-PE") : "-"
}

function asArray<T>(value: T[] | null | undefined) {
  return value || []
}

function badgeTone(estado?: string | null) {
  if (estado === "en_curso" || estado === "liquidado") return "success"
  if (estado === "terminado" || estado === "facturado") return "info"
  if (estado === "pendiente_aprobacion") return "warning"
  return "neutral"
}

function tooltipCurrency(value: unknown) {
  return fmtCurrencyShort(Number(value) || 0)
}

type IntelligenceData = {
  riesgo: string
  oportunidad: string
  recomendacion: string
  resumen: string
}

function getIntelligenceData(data: DashboardData): IntelligenceData {
  const metrics = data.metricas
  
  // 1. Riesgo
  let riesgo = "Sin riesgos críticos de facturación detectados."
  if (metrics.rqsPendientes > 0) {
    riesgo = `${metrics.rqsPendientes} requerimientos de pago esperando aprobación.`
  } else if (metrics.porCobrar > 50000) {
    riesgo = `Exposición de cobranza elevada: ${fmtCurrencyShort(metrics.porCobrar)} pendientes.`
  }

  // 2. Oportunidad
  let oportunidad = "Explorar nuevas oportunidades de prospección en Q4."
  if (metrics.presupuestosPendientes > 0) {
    oportunidad = `Propuestas comerciales en negociación por ${fmtCurrencyShort(metrics.presupuestosPendientes)}.`
  } else if (data.alertas.some(a => a.tipo === "hot")) {
    oportunidad = "Leads calientes pendientes de conversión en CRM."
  }

  // 3. Recomendación
  let recomendacion = "Optimizar asignación de recursos en proyectos activos."
  if (metrics.porCobrar > 0) {
    recomendacion = "Iniciar seguimiento de cobro sobre facturas pendientes."
  } else if (metrics.presupuestosPendientes > 0) {
    recomendacion = "Priorizar aprobación del presupuesto para iniciar ejecución."
  }

  // 4. Resumen
  const resumen = `El portafolio activo cuenta con ${metrics.activos} proyectos en ejecución. Este mes se ha facturado ${fmtCurrencyShort(metrics.factMesAct)} con una variación mensual de ${metrics.varFacturacion.toFixed(1)}%. Se mantiene un margen promedio de ${metrics.margenPromedio.toFixed(1)}% en liquidaciones cerradas. Se recomienda priorizar la cobranza pendiente de ${fmtCurrencyShort(metrics.porCobrar)}.`

  return { riesgo, oportunidad, recomendacion, resumen }
}

async function loadDashboardData(): Promise<DashboardData | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: perfilData } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  const perfil = perfilData as Perfil | null
  if (!perfil) return null

  const alcanceDashboard = alcanceModulo(perfil, "dashboard")
  const scopeDashboard = dashboardScope(perfil)
  const canSeePrecioCliente = puedeVerInformacionSensible(perfil, "precio_cliente")
  const canSeeFacturas = puedeVerInformacionSensible(perfil, "facturas") || puedeVerInformacionSensible(perfil, "facturacion_consolidada")
  const canSeeCobranza = puedeVerInformacionSensible(perfil, "cobranza")
  const canSeeCostos = puedeVerInformacionSensible(perfil, "costo_real") || puedeVerInformacionSensible(perfil, "costo_presupuestado")
  const canSeeMargen = puedeVerInformacionSensible(perfil, "margen_pct") || puedeVerInformacionSensible(perfil, "margenes") || puedeVerInformacionSensible(perfil, "rentabilidad")

  if (alcanceDashboard === "NINGUNO" || scopeDashboard.sinAcceso) {
    return {
      alertas: [],
      chartEstados: [],
      chartFacturacion: [],
      chartRQs: [],
      cotsProyState: [],
      metricas: emptyMetrics,
      perfil,
      proyectos: [],
      topProyectos: [],
    }
  }

  const [
    provsResult,
    todosProyectosResult,
    facturasResult,
    liquidacionesResult,
    rqsResult,
    cotMesResult,
    leadsResult,
    cotsProyResult,
  ] = await Promise.all([
    supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido), cotizacion_aprobada:cotizaciones!cotizacion_aprobada_id(total_cliente)").is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
    supabase.from("proyectos").select("id, estado, codigo, nombre, created_at, fecha_inicio, productor_id, comercial_id, created_by, cotizacion_aprobada_id, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").is("deleted_at", null),
    supabase.from("facturas").select("subtotal, igv, monto_final_abonado, estado, created_at, fecha_emision, proyecto_id"),
    supabase.from("liquidaciones").select("margen_real_pct, cerrada, proyecto_id, created_by"),
    supabase.from("requerimientos_pago").select("id, estado, monto_solicitado, proyecto_id, solicitado_por, created_by"),
    supabase.from("cotizaciones").select(COTIZACION_SELECT).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from("crm_leads").select("estado, temperatura, presupuesto_estimado, created_by"),
    supabase.from("cotizaciones").select(COTIZACION_SELECT),
  ])

  const dashboardErrors = [
    provsResult.error,
    todosProyectosResult.error,
    facturasResult.error,
    liquidacionesResult.error,
    rqsResult.error,
    cotMesResult.error,
    leadsResult.error,
    cotsProyResult.error,
  ].filter(Boolean)
  if (dashboardErrors.length > 0) {
    throw new Error("No se pudieron cargar todos los datos del dashboard")
  }

  const rawProjects = asArray(todosProyectosResult.data as Proyecto[] | null)
  const teamIds = scopeDashboard.equipo && perfil.perfil === "gerente_produccion"
    ? rawProjects.flatMap((proyecto) => [proyecto.productor_id, proyecto.comercial_id]).filter(Boolean)
    : []
  const contextoPermisos = { usuarioId: user.id, equipoIds: teamIds }
  const allProv = filtrarPorAlcance(rawProjects, perfil, "dashboard", contextoPermisos)
  const proyectosRecientes = filtrarPorAlcance(asArray(provsResult.data as Proyecto[] | null), perfil, "dashboard", contextoPermisos)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 10)

  const activeProjectIds = new Set(allProv.map((project) => String(project.id)))
  const projectById = new Map(allProv.map((project) => [project.id, project]))
  const scopedProjectIds = Array.from(activeProjectIds).map(String)
  const rowHasActiveProject = (row: { proyecto_id?: string | null }) => row.proyecto_id ? activeProjectIds.has(String(row.proyecto_id)) : scopeDashboard.total
  const facturasActivas = canSeeFacturas ? asArray(facturasResult.data as Factura[] | null).filter(rowHasActiveProject) : []
  const liquidacionesActivas = canSeeMargen ? asArray(liquidacionesResult.data as Liquidacion[] | null).filter(rowHasActiveProject) : []
  const rqsActivosBase = canSeeCostos ? asArray(rqsResult.data as RequerimientoPago[] | null).filter(rowHasActiveProject) : []
  const rqsActivos = filtrarPorAlcance(rqsActivosBase, perfil, "rq", { ...contextoPermisos, proyectoIds: scopedProjectIds })
  const cotsProyActivas = asArray(cotsProyResult.data as Cotizacion[] | null).filter(rowHasActiveProject)
  const cotMesActivas = asArray(cotMesResult.data as Cotizacion[] | null).filter(rowHasActiveProject)
  const leadsVisibles = filtrarPorAlcance(asArray(leadsResult.data as Lead[] | null), perfil, "crm", contextoPermisos)

  const cotizacionesPorProyecto = new Map<string, Cotizacion[]>()
  const cotizacionPorId = new Map<string, Cotizacion>()
  cotsProyActivas.forEach((cotizacion) => {
    if (cotizacion.id) cotizacionPorId.set(String(cotizacion.id), cotizacion)
    if (!cotizacion.proyecto_id) return
    const proyectoId = String(cotizacion.proyecto_id)
    cotizacionesPorProyecto.set(proyectoId, [...(cotizacionesPorProyecto.get(proyectoId) || []), cotizacion])
  })
  const mejorCotizacionProyecto = (proyectoId: string) => mejorCotizacion(cotizacionesPorProyecto.get(String(proyectoId)) || [])
  const totalMejorCotizacionProyecto = (proyectoId: string) => totalCotizacion(mejorCotizacionProyecto(proyectoId))
  const cotizacionAprobadaOficial = (proyecto: Proyecto) => {
    const cotizacionId = String(proyecto.cotizacion_aprobada_id || "")
    if (!cotizacionId) return null
    const cotizacion = cotizacionPorId.get(cotizacionId)
    if (!cotizacion || String(cotizacion.proyecto_id) !== String(proyecto.id)) return null
    return cotizacion
  }

  const activos = allProv.filter((project) => project.estado === "en_curso")
  const pendientes = allProv.filter((project) => PROYECTO_PENDIENTE_ESTADOS.includes(project.estado || ""))
  const terminadosSinLiquidar = allProv.filter((project) => project.estado === "terminado")
  const fechaFactura = (factura: Factura) => new Date(factura.fecha_emision || factura.created_at || 0)
  const facturasActivasNoAnuladas = facturasActivas.filter((factura) => !esFacturaAnulada(factura))
  const totalFacturado = facturasActivasNoAnuladas.reduce((sum, factura) => sum + totalFactura(factura), 0)
  const totalCobrado = canSeeCobranza ? facturasActivasNoAnuladas.reduce((sum, factura) => sum + montoCobradoFactura(factura), 0) : 0
  const porCobrar = canSeeCobranza ? facturasActivasNoAnuladas.reduce((sum, factura) => sum + saldoPendienteFactura(factura), 0) : 0
  const liqCerradas = liquidacionesActivas.filter((liquidacion) => liquidacion.cerrada && Number.isFinite(Number(liquidacion.margen_real_pct)))
  const margenPromedio = liqCerradas.length > 0 ? liqCerradas.reduce((sum, liquidacion) => sum + num(liquidacion.margen_real_pct), 0) / liqCerradas.length : 0
  const rqsPendientes = rqsActivos.filter((rq) => !["pagado", "rechazado", "cancelado"].includes(rq.estado || ""))
  const rqsPendientesMonto = rqsPendientes.reduce((sum, rq) => sum + num(rq.monto_solicitado), 0)
  const leadsCalientes = leadsVisibles.filter((lead) => lead.temperatura === "caliente").length

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
  const factMesAct = facturasActivasNoAnuladas.filter((factura) => fechaFactura(factura) >= inicioMes).reduce((sum, factura) => sum + totalFactura(factura), 0)
  const factMesAnt = facturasActivasNoAnuladas
    .filter((factura) => {
      const date = fechaFactura(factura)
      return date >= inicioMesAnt && date <= finMesAnt
    })
    .reduce((sum, factura) => sum + totalFactura(factura), 0)
  const varFacturacion = factMesAnt > 0 ? ((factMesAct - factMesAnt) / factMesAnt) * 100 : 0

  const chartFacturacion: ChartPoint[] = []
  for (let index = 5; index >= 0; index -= 1) {
    const start = new Date(hoy.getFullYear(), hoy.getMonth() - index, 1)
    const end = new Date(hoy.getFullYear(), hoy.getMonth() - index + 1, 0)
    const facturado = canSeeFacturas ? facturasActivasNoAnuladas
      .filter((factura) => {
        const date = fechaFactura(factura)
        return date >= start && date <= end
      })
      .reduce((sum, factura) => sum + totalFactura(factura), 0) : 0
    const cobrado = canSeeCobranza ? facturasActivasNoAnuladas
      .filter((factura) => {
        const date = fechaFactura(factura)
        return date >= start && date <= end
      })
      .reduce((sum, factura) => sum + montoCobradoFactura(factura), 0) : 0
    chartFacturacion.push({ mes: MESES[start.getMonth()], facturado: Math.round(facturado), cobrado: Math.round(cobrado) })
  }

  const chartEstados = [
    { name: "Pendiente", value: allProv.filter((project) => project.estado === "pendiente_aprobacion").length, color: "#f59e0b" },
    { name: "Aprobado", value: allProv.filter((project) => project.estado === "aprobado").length, color: "#3b82f6" },
    { name: "En curso", value: allProv.filter((project) => project.estado === "en_curso").length, color: "#10b981" },
    { name: "Terminado", value: allProv.filter((project) => project.estado === "terminado").length, color: "#6b7280" },
    { name: "Facturado", value: allProv.filter((project) => project.estado === "facturado").length, color: "#8b5cf6" },
    { name: "Liquidado", value: allProv.filter((project) => project.estado === "liquidado").length, color: "#059669" },
  ].filter((point) => point.value > 0)

  const chartRQs = [
    { name: "Pendiente", value: rqsActivos.filter((rq) => rq.estado === "pendiente_aprobacion").length, color: "#f59e0b" },
    { name: "Aprobado", value: rqsActivos.filter((rq) => rq.estado === "aprobado").length, color: "#3b82f6" },
    { name: "Programado", value: rqsActivos.filter((rq) => rq.estado === "programado").length, color: "#8b5cf6" },
    { name: "Pagado", value: rqsActivos.filter((rq) => rq.estado === "pagado").length, color: "#10b981" },
  ].filter((point) => point.value > 0)

  const topProyectos = canSeePrecioCliente ? allProv
    .map((proyecto) => ({
      nombre: projectById.get(proyecto.id)?.codigo || "-",
      valor: Math.round(totalCotizacion(cotizacionAprobadaOficial(proyecto))),
    }))
    .filter((project) => project.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5) : []

  const alertas: AlertItem[] = []
  if (pendientes.length > 0) alertas.push({ tipo: "warning", msg: `${pendientes.length} proyecto(s) esperando aprobacion`, link: "/proyectos" })
  if (terminadosSinLiquidar.length > 0) alertas.push({ tipo: "warning", msg: `${terminadosSinLiquidar.length} proyecto(s) terminado(s) sin liquidar`, link: "/liquidaciones" })
  if (rqsPendientes.length > 0) alertas.push({ tipo: "info", msg: `${rqsPendientes.length} RQs pendientes${canSeeCostos ? ` - ${fmtCurrencyShort(rqsPendientesMonto)}` : ""}`, link: "/rq" })
  if (leadsCalientes > 0) alertas.push({ tipo: "hot", msg: `${leadsCalientes} lead(s) caliente(s) requieren atencion`, link: "/crm" })

  return {
    alertas,
    chartEstados,
    chartFacturacion,
    chartRQs,
    cotsProyState: cotsProyActivas,
    metricas: {
      activos: activos.length,
      pendientesMes: pendientes.length,
      presupuestosPendientes: canSeePrecioCliente ? pendientes.reduce((sum, project) => sum + totalMejorCotizacionProyecto(String(project.id)), 0) : 0,
      presupuestosAprobados: canSeePrecioCliente ? allProv.filter((project) => project.estado === "en_curso").reduce((sum, project) => sum + totalMejorCotizacionProyecto(String(project.id)), 0) : 0,
      factMesAct,
      varFacturacion,
      porCobrar,
      totalCobrado,
      totalFacturado,
      rqsPendientes: rqsPendientes.length,
      rqsPendientesMonto,
      cotMes: cotMesActivas.length,
      margenPromedio,
      canSeePrecioCliente,
      canSeeFacturas,
      canSeeCobranza,
      canSeeCostos,
      canSeeMargen,
    },
    perfil,
    proyectos: proyectosRecientes,
    topProyectos,
  }
}

export function DashboardV2Module() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  // Reloj y fecha dinámica
  const [timeStr, setTimeStr] = useState("")
  const [dateStr, setDateStr] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      setTimeStr(d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      setDateStr(d.toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      setError(null)
      setLoading(true)
      try {
        const result = await loadDashboardData()
        if (active) setData(result)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const projects = data?.proyectos || []
    if (!query.trim()) return projects
    const normalizedQuery = query.toLowerCase()
    return projects.filter((project) => [project.codigo, project.nombre, project.cliente?.razon_social]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery))
  }, [data?.proyectos, query])

  if (loading) {
    return (
      <div className={styles.dashboardRoot}>
        <V2Skeleton height={140} width="100%" />
        <div className={systemStyles.kpiGrid}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <V2SectionCard key={item} title=" ">
              <V2Skeleton height={14} width="60%" />
              <V2Skeleton height={24} width="40%" />
              <V2Skeleton height={10} width="80%" />
            </V2SectionCard>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboardRoot}>
        <div className={styles.statePanel}>
          <div>
            <p className={systemStyles.heading3}>No se pudo cargar el Dashboard V2</p>
            <p className={systemStyles.bodyCompact}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.dashboardRoot}>
        <V2EmptyState title="Sesion requerida" description="El dashboard conserva la autenticacion real del SIG." />
      </div>
    )
  }

  const metrics = data.metricas
  const facturacionTrend = `${metrics.varFacturacion >= 0 ? "+" : ""}${metrics.varFacturacion.toFixed(1)}%`
  const maxEstado = Math.max(...data.chartEstados.map((point) => point.value), 1)

  // Calculemos los datos deterministicos para el panel de Inteligencia
  const intel = getIntelligenceData(data)

  // Resumen financiero comparativo
  const inflowsPct = metrics.totalFacturado > 0 ? Math.round((metrics.totalCobrado / metrics.totalFacturado) * 100) : 0
  const receivablesPct = metrics.totalFacturado > 0 ? Math.round((metrics.porCobrar / metrics.totalFacturado) * 100) : 0

  const hora = new Date().getHours()
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <div className={styles.dashboardRoot}>
      {/* 1. Executive Header */}
      <V2ExecutiveHeader
        title={`${saludo}, ${data.perfil.nombre || "Usuario"}`}
        dateStr={dateStr}
        timeStr={timeStr}
        syncText="Hace un momento"
        summaryText={
          <>
            Portafolio activo con <strong style={{ color: "var(--v2-accent)" }}>{metrics.activos} proyectos</strong> en ejecución técnica y una facturación mensual de <strong>{fmtCurrency(metrics.factMesAct)}</strong>. La cobranza reporta <strong>{fmtCurrency(metrics.totalCobrado)}</strong> liquidados con una variación de facturación del <strong style={{ color: metrics.varFacturacion >= 0 ? "var(--v2-success)" : "var(--v2-danger)" }}>{facturacionTrend}</strong>.
          </>
        }
      />

      {/* Franja superior de alertas compactas */}
      {data.alertas.length > 0 ? (
        <div className={styles.alertRow}>
          {data.alertas.slice(0, 4).map((alert) => (
            <V2AlertCard
              key={`${alert.tipo}-${alert.msg}`}
              tipo={alert.tipo}
              message={alert.msg}
              href={alert.link}
            />
          ))}
        </div>
      ) : null}

      {/* 2. Matriz ejecutiva de seis KPI rediseñados */}
      <div className={styles.kpiGridPremium}>
        <V2KpiCard
          icon={<CircleDollarSign size={15} />}
          label="Presupuestos pendientes"
          value={metrics.canSeePrecioCliente ? fmtCurrencyShort(metrics.presupuestosPendientes) : FINANCIAL_LOCK_LABEL}
          trend="neutral"
          trendLabel="Pendiente"
          meta={`${metrics.pendientesMes} proyectos en espera`}
          indicatorColor="var(--v2-warning)"
        />
        <V2KpiCard
          icon={<BriefcaseBusiness size={15} />}
          label="Presupuestos en curso"
          value={metrics.canSeePrecioCliente ? fmtCurrencyShort(metrics.presupuestosAprobados) : FINANCIAL_LOCK_LABEL}
          trend="positive"
          trendLabel="Curso"
          meta={`${metrics.activos} proyectos activos`}
          indicatorColor="var(--v2-success)"
        />
        <V2KpiCard
          icon={<ReceiptText size={15} />}
          label="Facturado este mes"
          value={metrics.canSeeFacturas ? fmtCurrencyShort(metrics.factMesAct) : FINANCIAL_LOCK_LABEL}
          trend={metrics.varFacturacion >= 0 ? "positive" : "negative"}
          trendLabel={metrics.canSeeFacturas ? facturacionTrend : "-"}
          meta="Comparativa contra mes anterior"
          indicatorColor="var(--v2-info)"
        />
        <V2KpiCard
          icon={<Shield size={15} />}
          label="Cuentas por cobrar"
          value={metrics.canSeeCobranza ? fmtCurrencyShort(metrics.porCobrar) : FINANCIAL_LOCK_LABEL}
          trend="neutral"
          trendLabel="Cobranza"
          meta={metrics.canSeeCobranza ? `Cobrado ${fmtCurrencyShort(metrics.totalCobrado)}` : "Informacion restringida"}
          indicatorColor="var(--v2-warning)"
        />
        <V2KpiCard
          icon={<FolderKanban size={15} />}
          label="Proyectos activos"
          value={String(metrics.activos)}
          trend="positive"
          trendLabel="Técnico"
          meta="En ejecución técnica"
          indicatorColor="var(--v2-success)"
        />
        <V2KpiCard
          icon={<FileText size={15} />}
          label="Cotizaciones"
          value={String(metrics.cotMes)}
          trend="neutral"
          trendLabel="Comercial"
          meta="Registradas este mes"
          indicatorColor="var(--v2-indigo)"
        />
      </div>

      {/* 3. Tendencia de facturación (Main) & 4. Estados de proyectos (Side) */}
      <div className={styles.rowFacturacionEstados}>
        <V2ChartCard
          title="Facturacion y cobranza"
          description="Ultimos 6 meses con las mismas reglas financieras del Dashboard V1."
          empty={!metrics.canSeeFacturas}
          emptyText="Informacion financiera restringida"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.chartFacturacion} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--v2-subtle)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--v2-subtle)" }} axisLine={false} tickFormatter={fmtAxis} tickLine={false} />
              <Tooltip formatter={tooltipCurrency} contentStyle={{ background: "var(--v2-surface)", border: "1px solid var(--v2-border)", borderRadius: 8, color: "var(--v2-text)" }} />
              <Line type="monotone" dataKey="facturado" name="Facturado" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cobrado" name="Cobrado" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </V2ChartCard>

        <V2SectionCard description="Distribucion del portafolio visible por alcance." title="Estados de proyectos">
          {data.chartEstados.length === 0 ? (
            <V2EmptyState title="Sin proyectos visibles" description="No hay portafolios en el alcance de su perfil." />
          ) : (
            <V2StatusBreakdown
              items={data.chartEstados.map((point) => ({
                name: point.name,
                value: point.value,
                color: point.color,
                percentage: Math.max((point.value / maxEstado) * 100, 8),
              }))}
            />
          )}
        </V2SectionCard>
      </div>

      {/* 5. Proyectos recientes Activity Timeline (Main) & 6. Panel Izango Intelligence (Side) */}
      <div className={styles.rowProyectosIntelligence}>
        <V2SectionCard
          action={
            <V2IconButton label="Abrir proyectos" onClick={() => router.push("/proyectos")}>
              <ArrowUpRight size={15} />
            </V2IconButton>
          }
          description="Línea de tiempo de los últimos registros de proyectos."
          title="Línea de Actividad"
        >
          <V2Toolbar
            primary={<V2Input compact icon={<Search size={14} />} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código o cliente..." value={query} />}
            secondary={
              <>
                <V2Button icon={<FolderKanban size={14} />} onClick={() => router.push("/proyectos")} size="compact" variant="secondary">
                  Proyectos
                </V2Button>
                <V2Button icon={<FileText size={14} />} onClick={() => router.push("/rq")} size="compact" variant="secondary">
                  RQ
                </V2Button>
              </>
            }
          />
          <V2ActivityTimeline
            items={filteredProjects.slice(0, 5).map((project) => {
              const dateStr = formatDate(project.fecha_inicio || project.created_at)
              const total = totalCotizacion(mejorCotizacion((data?.cotsProyState || []).filter((c) => String(c.proyecto_id) === String(project.id))))
              return {
                id: project.id || "",
                date: dateStr,
                title: project.codigo || "PROY",
                badge: <V2StatusBadge tone={badgeTone(project.estado)}>{estadoLabels[project.estado || ""] || project.estado}</V2StatusBadge>,
                subtitle: project.nombre,
                meta: (
                  <>
                    <span className={styles.timelineClient}>Cliente: {project.cliente?.razon_social || "-"}</span>
                    {metrics.canSeePrecioCliente && total > 0 && (
                      <span className={styles.timelineValue}>{fmtCurrency(total)}</span>
                    )}
                  </>
                ),
              }
            })}
            emptyState={<V2EmptyState title="Sin actividad reciente" description="No hay eventos de proyectos en el alcance actual." />}
          />
        </V2SectionCard>

        <V2SectionCard description="Analitica estratégica consolidada de la cartera." title="Izango Intelligence">
          <V2IntelligencePanel
            summary={intel.resumen}
            items={[
              { type: "risk", label: "Riesgo operativo", content: intel.riesgo },
              { type: "opportunity", label: "Oportunidad comercial", content: intel.oportunidad },
              { type: "recommendation", label: "Recomendacion estratégica", content: intel.recomendacion },
            ]}
          />
        </V2SectionCard>
      </div>

      {/* 7. Alertas del negocio (Main) & 8. Resumen financiero (Side) */}
      <div className={styles.rowAlertasFinanzas}>
        <V2SectionCard description="Alertas criticas y notificaciones que requieren gestion inmediata." title="Alertas del negocio">
          {data.alertas.length === 0 ? (
            <V2EmptyState title="Cartera al día" description="Sin alertas vigentes." />
          ) : (
            <div className={styles.alertsBottomList}>
              {data.alertas.map((alert) => (
                <div className={styles.alertBottomItem} key={`${alert.tipo}-${alert.msg}`}>
                  <V2AlertCard
                    tipo={alert.tipo}
                    message={alert.msg}
                    href={alert.link}
                    actionLabel="Atender"
                  />
                </div>
              ))}
            </div>
          )}
        </V2SectionCard>

        <V2SectionCard description="Cobranza y flujos liquidados de facturacion." title="Resumen financiero comparativo">
          <V2FinancialSummary
            items={[
              {
                label: "Efectivo cobrado (Inflows)",
                value: metrics.canSeeCobranza ? fmtCurrencyShort(metrics.totalCobrado) : FINANCIAL_LOCK_LABEL,
                percentage: metrics.canSeeCobranza ? inflowsPct : 0,
                type: "inflows",
              },
              {
                label: "Cuentas por cobrar (Receivables)",
                value: metrics.canSeeCobranza ? fmtCurrencyShort(metrics.porCobrar) : FINANCIAL_LOCK_LABEL,
                percentage: metrics.canSeeCobranza ? receivablesPct : 0,
                type: "receivables",
              },
              {
                label: "Facturacion total emitida",
                value: metrics.canSeeFacturas ? fmtCurrencyShort(metrics.totalFacturado) : FINANCIAL_LOCK_LABEL,
                percentage: 100,
                type: "total",
              },
            ]}
          />
        </V2SectionCard>
      </div>

      {/* Quick Actions Panel */}
      <V2QuickActions cols={4}>
        <V2Button icon={<Plus size={14} />} onClick={() => router.push("/proyectos/nuevo")}>Nuevo proyecto</V2Button>
        <V2Button icon={<BarChart3 size={14} />} onClick={() => router.push("/gestor")} variant="secondary">Gestor</V2Button>
        <V2Button icon={<Clock3 size={14} />} onClick={() => router.push("/tareas")} variant="secondary">Mi trabajo</V2Button>
        <V2Button icon={<FileText size={14} />} onClick={() => router.push("/rq")} variant="secondary">RQ</V2Button>
      </V2QuickActions>

      {/* 9. Pie ejecutivo */}
      <footer className={styles.executiveFooter}>
        <div className={styles.footerMainRow}>
          <div>
            <span className={styles.footerBrand}>Izango 360</span>
            <span className={styles.footerCopyright}> — © 2026 Izango 360 SAC. Todos los derechos reservados.</span>
          </div>
          <div className={styles.footerLinks}>
            <span className={styles.footerStatus}>
              <span className={styles.statusIndicator}></span>
              Servidores Operacionales
            </span>
            <a className={styles.footerLink} href="#soporte">Soporte Tecnológico</a>
            <a className={styles.footerLink} href="#api-docs">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
