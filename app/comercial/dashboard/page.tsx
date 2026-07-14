"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/purity, react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */

import type { CSSProperties, ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { getCRMEstadosPipeline, getCRMEstadosVisuales, getCRMTemperaturasVisuales } from "@/lib/core/configuration/crm"
import { EmptyState, ExecutiveSummary, FiltersBar, MasterPage } from "@/components/design-system"
import StatusBadge from "@/components/ui/StatusBadge"
import SectionCard from "@/components/ui/SectionCard"

const PERFILES_AUTORIZADOS = ["superadmin", "gerente_general", "gerente_produccion", "comercial"]
const ESTADOS_CERRADOS = ["ganado", "perdido"]
const ESTADOS_COT_APROBADAS = ["aprobada_cliente", "aprobado_cliente"]
const ESTADOS_COT_RECHAZADAS = ["rechazada", "rechazado", "anulada", "anulado", "cancelada", "cancelado"]
const ESTADOS_PRODUCCION = ["en_curso", "aprobado_cliente"]
const ESTADOS_TERMINADOS = ["terminado", "liquidado", "pendiente_facturacion", "facturado", "cerrado_financiero"]
const ESTADOS_FACTURADOS = ["facturado", "cerrado_financiero"]
const FACTURAS_COBRADAS = ["cobrada", "pagada"]

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart(offset = 0) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + offset, 1).toISOString().slice(0, 10)
}

function monthEnd(offset = 0) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).toISOString().slice(0, 10)
}

function yearStart() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
}

function periodRange(periodo: string, desde: string, hasta: string) {
  if (periodo === "mes_anterior") return { desde: monthStart(-1), hasta: monthEnd(-1) }
  if (periodo === "ultimos_3_meses") {
    const now = new Date()
    return { desde: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10), hasta: monthEnd(0) }
  }
  if (periodo === "anio_actual") return { desde: yearStart(), hasta: todayYmd() }
  if (periodo === "personalizado") return { desde: desde || monthStart(0), hasta: hasta || todayYmd() }
  return { desde: monthStart(0), hasta: monthEnd(0) }
}

function inRange(value: string | null | undefined, desde: string, hasta: string) {
  const date = String(value || "").slice(0, 10)
  if (!date) return false
  return date >= desde && date <= hasta
}

function money(value: number) {
  return "S/ " + Number(value || 0).toLocaleString("es-PE", { maximumFractionDigits: 0 })
}

function num(value: any) {
  return Number(value || 0)
}

function diasDesde(value: string | null | undefined) {
  if (!value) return 0
  const diff = Date.now() - new Date(`${String(value).slice(0, 10)}T00:00:00`).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

function diasEntre(desde: string | null | undefined, hasta: string | null | undefined) {
  if (!desde || !hasta) return null
  const diff = new Date(`${String(hasta).slice(0, 10)}T00:00:00`).getTime() - new Date(`${String(desde).slice(0, 10)}T00:00:00`).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

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

function nombrePersona(persona: any) {
  return `${persona?.nombre || ""} ${persona?.apellido || ""}`.trim() || "Sin responsable"
}

function referencias(value: string | null | undefined) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean)
}

function taskSort(a: any, b: any) {
  const prio: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }
  const vencidaA = a.fecha_limite && a.fecha_limite < todayYmd() ? 0 : 1
  const vencidaB = b.fecha_limite && b.fecha_limite < todayYmd() ? 0 : 1
  if (vencidaA !== vencidaB) return vencidaA - vencidaB
  const p = (prio[a.prioridad] ?? 9) - (prio[b.prioridad] ?? 9)
  if (p !== 0) return p
  return String(a.fecha_limite || "9999-12-31").localeCompare(String(b.fecha_limite || "9999-12-31"))
}

export default function DashboardComercialPage() {
  const supabase = createClient()
  const estadosCRM = getCRMEstadosVisuales()
  const estadosPipeline = getCRMEstadosPipeline()
  const temperaturas = getCRMTemperaturasVisuales()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [tareas, setTareas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [periodo, setPeriodo] = useState("mes_actual")
  const [desde, setDesde] = useState(monthStart(0))
  const [hasta, setHasta] = useState(monthEnd(0))
  const [clienteId, setClienteId] = useState("")
  const [estadoCRM, setEstadoCRM] = useState("")
  const [temperatura, setTemperatura] = useState("")
  const [estadoProyecto, setEstadoProyecto] = useState("")

  async function load() {
    setLoading(true)
    const nextErrors: string[] = []
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPerfil(null)
      setLoading(false)
      return
    }

    const { data: userProfile, error: perfilError } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    if (perfilError) console.error("Dashboard Comercial perfiles", perfilError)
    setPerfil(userProfile)

    if (!PERFILES_AUTORIZADOS.includes(userProfile?.perfil)) {
      setLoading(false)
      return
    }

    const [leadsRes, cotRes, proyRes, tareasRes, clientesRes, perfilesRes, facturasRes] = await Promise.all([
      supabase.from("crm_leads").select("id, razon_social, estado, temperatura, presupuesto_estimado, probabilidad_cierre, fecha_proxima_accion, fecha_proximo_contacto, responsable_id, cliente_id, referencias_cotizacion, periodo_pipeline, archivado, created_at, updated_at, cliente:clientes(id,razon_social,ruc)"),
      supabase.from("cotizaciones").select("id,proyecto_id,version,estado,created_at,updated_at,total_cliente,subtotal_precio_cliente,subtotal_con_fee,igv_monto,fee_agencia_pct,fee_activo,igv_pct,descuento_pct,items:cotizacion_items(precio_cliente,incluir_en_total),proyecto:proyectos(id,nombre,codigo,estado,cliente_id,deleted_at,cliente:clientes(id,razon_social),comercial_id,productor_id)"),
      supabase.from("proyectos").select("id,nombre,codigo,estado,cliente_id,created_at,updated_at,deleted_at,cotizacion_aprobada_id,comercial_id,productor_id,cliente:clientes(id,razon_social)").is("deleted_at", null),
      supabase.from("tareas").select("id,titulo,estado,prioridad,fecha_limite,cliente_id,proyecto_id,asignado_a,creado_por,created_at,updated_at,cliente:clientes(id,razon_social),proyecto:proyectos(id,nombre,codigo,deleted_at),asignado:perfiles!asignado_a(id,nombre,apellido,perfil),creador:perfiles!creado_por(id,nombre,apellido,perfil)").order("created_at", { ascending: false }).limit(500),
      supabase.from("clientes").select("id,razon_social,created_at").order("razon_social"),
      supabase.from("perfiles").select("id,nombre,apellido,perfil").eq("activo", true),
      supabase.from("facturas").select("id,proyecto_id,estado,fecha_emision,fecha_abono,subtotal,igv,monto_final_abonado"),
    ])

    const results = [
      ["CRM", leadsRes],
      ["Cotizaciones", cotRes],
      ["Proyectos", proyRes],
      ["Tareas", tareasRes],
      ["Clientes", clientesRes],
      ["Perfiles", perfilesRes],
      ["Facturación", facturasRes],
    ] as const
    results.forEach(([label, result]) => {
      if (result.error) {
        console.error(`Dashboard Comercial ${label}`, result.error)
        nextErrors.push(`No se pudo cargar ${label}.`)
      }
    })

    setLeads((leadsRes.data || []).map((lead: any) => ({
      ...lead,
      fecha_proxima_accion: lead.fecha_proxima_accion || lead.fecha_proximo_contacto || "",
      presupuesto_estimado: num(lead.presupuesto_estimado),
      probabilidad_cierre: num(lead.probabilidad_cierre),
      archivado: Boolean(lead.archivado),
    })))
    setCotizaciones((cotRes.data || []).filter((cot: any) => !cot.proyecto?.deleted_at))
    setProyectos(proyRes.data || [])
    setTareas((tareasRes.data || []).filter((tarea: any) => tarea.creador?.perfil === "comercial" && !tarea.proyecto?.deleted_at))
    setClientes(clientesRes.data || [])
    setPerfiles(perfilesRes.data || [])
    setFacturas(facturasRes.data || [])
    setErrors(nextErrors)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const range = useMemo(() => periodRange(periodo, desde, hasta), [periodo, desde, hasta])

  const filteredLeads = useMemo(() => leads.filter(lead => {
    if (lead.archivado) return false
    if (!inRange(lead.created_at, range.desde, range.hasta)) return false
    if (clienteId && lead.cliente_id !== clienteId) return false
    if (estadoCRM && lead.estado !== estadoCRM) return false
    if (temperatura && lead.temperatura !== temperatura) return false
    return true
  }), [leads, range, clienteId, estadoCRM, temperatura])

  const filteredProjects = useMemo(() => proyectos.filter(proyecto => {
    if (clienteId && proyecto.cliente_id !== clienteId) return false
    if (estadoProyecto && proyecto.estado !== estadoProyecto) return false
    return true
  }), [proyectos, clienteId, estadoProyecto])

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(proyecto => proyecto.id)), [filteredProjects])

  const filteredQuotes = useMemo(() => cotizaciones.filter(cot => {
    if (!inRange(cot.created_at, range.desde, range.hasta)) return false
    if (clienteId && cot.proyecto?.cliente_id !== clienteId) return false
    if (estadoProyecto && cot.proyecto?.estado !== estadoProyecto) return false
    return true
  }), [cotizaciones, range, clienteId, estadoProyecto])

  const filteredTasks = useMemo(() => tareas.filter(tarea => {
    const fecha = tarea.fecha_limite || tarea.created_at
    if (!inRange(fecha, range.desde, range.hasta) && tarea.estado !== "pendiente" && tarea.estado !== "en_progreso") return false
    if (clienteId && tarea.cliente_id !== clienteId && tarea.proyecto?.cliente_id !== clienteId) return false
    if (estadoProyecto && tarea.proyecto_id && !filteredProjectIds.has(tarea.proyecto_id)) return false
    return true
  }), [tareas, range, clienteId, estadoProyecto, filteredProjectIds])

  const activeLeads = filteredLeads.filter(lead => !ESTADOS_CERRADOS.includes(lead.estado))
  const wonLeads = filteredLeads.filter(lead => lead.estado === "ganado")
  const closedLeads = filteredLeads.filter(lead => ESTADOS_CERRADOS.includes(lead.estado))
  const pipeline = activeLeads.reduce((sum, lead) => sum + lead.presupuesto_estimado, 0)
  const pipelinePonderado = activeLeads.reduce((sum, lead) => sum + lead.presupuesto_estimado * (lead.probabilidad_cierre / 100), 0)
  const ganado = wonLeads.reduce((sum, lead) => sum + lead.presupuesto_estimado, 0)
  const conversion = closedLeads.length > 0 ? Math.round((wonLeads.length / closedLeads.length) * 100) : 0
  const ticketPromedio = wonLeads.length > 0 ? ganado / wonLeads.length : 0
  const cotPendientes = filteredQuotes.filter(cot => !ESTADOS_COT_APROBADAS.includes(cot.estado) && !ESTADOS_COT_RECHAZADAS.includes(cot.estado))

  const funnel = estadosPipeline.map((estado, index) => {
    const stageLeads = filteredLeads.filter(lead => lead.estado === estado)
    const previousCount = index === 0 ? stageLeads.length : filteredLeads.filter(lead => lead.estado === estadosPipeline[index - 1]).length
    return {
      estado,
      label: estadosCRM[estado]?.label || estado,
      color: estadosCRM[estado]?.color || "#0F6E56",
      count: stageLeads.length,
      amount: stageLeads.reduce((sum, lead) => sum + lead.presupuesto_estimado, 0),
      conversion: index === 0 ? 100 : previousCount > 0 ? Math.round((stageLeads.length / previousCount) * 100) : 0,
    }
  })
  const maxFunnel = Math.max(...funnel.map(item => item.amount), 1)

  const highProb = activeLeads.filter(lead => lead.probabilidad_cierre >= 70).reduce((s, l) => s + l.presupuesto_estimado, 0)
  const midProb = activeLeads.filter(lead => lead.probabilidad_cierre >= 40 && lead.probabilidad_cierre < 70).reduce((s, l) => s + l.presupuesto_estimado, 0)
  const lowProb = activeLeads.filter(lead => lead.probabilidad_cierre < 40).reduce((s, l) => s + l.presupuesto_estimado, 0)
  const maxForecast = Math.max(pipeline, pipelinePonderado, ganado, 1)

  const cotAprobadas = filteredQuotes.filter(cot => ESTADOS_COT_APROBADAS.includes(cot.estado))
  const cotRechazadas = filteredQuotes.filter(cot => ESTADOS_COT_RECHAZADAS.includes(cot.estado))
  const tiempoPromedioAprobacion = cotAprobadas
    .map(cot => diasEntre(cot.created_at, cot.updated_at))
    .filter((value): value is number => value !== null)
  const diasPromedioAprobacion = tiempoPromedioAprobacion.length ? Math.round(tiempoPromedioAprobacion.reduce((s, v) => s + v, 0) / tiempoPromedioAprobacion.length) : null

  const cotizacionesTabla = [...cotPendientes]
    .sort((a, b) => {
      const dateDiff = String(a.created_at || "").localeCompare(String(b.created_at || ""))
      if (dateDiff !== 0) return dateDiff
      return totalCotizacion(b) - totalCotizacion(a)
    })
    .slice(0, 10)

  const facturadosProjectIds = new Set(facturas.map(factura => factura.proyecto_id).filter(Boolean))
  const cobradosProjectIds = new Set(facturas.filter(factura => FACTURAS_COBRADAS.includes(factura.estado)).map(factura => factura.proyecto_id).filter(Boolean))
  const linkedClienteIds = new Set(wonLeads.map(lead => lead.cliente_id).filter(Boolean))
  const proyectosDeClientesGanados = filteredProjects.filter(proyecto => linkedClienteIds.has(proyecto.cliente_id))
  const radar = [
    { label: "Leads registrados", value: filteredLeads.length },
    { label: "Leads ganados", value: wonLeads.length },
    { label: "Clientes vinculados", value: linkedClienteIds.size },
    { label: "Proyectos creados", value: proyectosDeClientesGanados.length, approx: true },
    { label: "En producción", value: proyectosDeClientesGanados.filter(p => ESTADOS_PRODUCCION.includes(p.estado)).length, approx: true },
    { label: "Terminados", value: proyectosDeClientesGanados.filter(p => ESTADOS_TERMINADOS.includes(p.estado)).length, approx: true },
    { label: "Facturados", value: proyectosDeClientesGanados.filter(p => ESTADOS_FACTURADOS.includes(p.estado) || facturadosProjectIds.has(p.id)).length, approx: true },
    { label: "Cobrados", value: proyectosDeClientesGanados.filter(p => cobradosProjectIds.has(p.id)).length, approx: true },
  ]

  const clienteRows = useMemo(() => clientes.map(cliente => {
    const clienteLeads = filteredLeads.filter(lead => lead.cliente_id === cliente.id)
    const clienteProjects = filteredProjects.filter(proyecto => proyecto.cliente_id === cliente.id)
    const clienteQuotes = filteredQuotes.filter(cot => cot.proyecto?.cliente_id === cliente.id)
    const lastDates = [...clienteLeads.map(l => l.updated_at || l.created_at), ...clienteQuotes.map(c => c.updated_at || c.created_at), ...clienteProjects.map(p => p.updated_at || p.created_at)].filter(Boolean).sort().reverse()
    return {
      cliente,
      active: clienteLeads.filter(lead => !ESTADOS_CERRADOS.includes(lead.estado)).length,
      pipeline: clienteLeads.filter(lead => !ESTADOS_CERRADOS.includes(lead.estado)).reduce((s, l) => s + l.presupuesto_estimado, 0),
      quotes: clienteQuotes.length,
      projects: clienteProjects.length,
      won: clienteLeads.filter(lead => lead.estado === "ganado").reduce((s, l) => s + l.presupuesto_estimado, 0),
      last: lastDates[0] || "",
    }
  }).filter(row => row.active || row.quotes || row.projects || row.won).sort((a, b) => (b.pipeline + b.won) - (a.pipeline + a.won)).slice(0, 8), [clientes, filteredLeads, filteredProjects, filteredQuotes])

  const alerts = useMemo(() => {
    const list: any[] = []
    activeLeads.forEach(lead => {
      const name = lead.razon_social || lead.cliente?.razon_social || "Lead sin nombre"
      if (!lead.responsable_id) list.push({ level: "warning", msg: "Lead sin responsable", subject: name, days: diasDesde(lead.created_at), href: "/crm" })
      if (!lead.fecha_proxima_accion) list.push({ level: "warning", msg: "Lead sin próxima acción", subject: name, days: diasDesde(lead.updated_at || lead.created_at), href: "/crm" })
      if (lead.temperatura === "caliente" && !lead.fecha_proxima_accion) list.push({ level: "critical", msg: "Lead caliente sin seguimiento", subject: name, days: diasDesde(lead.updated_at || lead.created_at), href: "/crm" })
      if (lead.fecha_proxima_accion && lead.fecha_proxima_accion < todayYmd()) list.push({ level: "critical", msg: "Próxima acción vencida", subject: name, days: diasDesde(lead.fecha_proxima_accion), href: "/crm" })
      if (lead.estado === "ganado" && !lead.cliente_id) list.push({ level: "critical", msg: "Ganado sin cliente vinculado", subject: name, days: diasDesde(lead.updated_at || lead.created_at), href: "/crm" })
    })
    cotPendientes.forEach(cot => {
      const days = diasDesde(cot.created_at)
      if (days > 7) list.push({ level: "warning", msg: "Cotización pendiente por más de 7 días", subject: cot.proyecto?.codigo || cot.id, days, href: `/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}` })
    })
    proyectosDeClientesGanados.forEach(proyecto => {
      if (ESTADOS_TERMINADOS.includes(proyecto.estado) && !facturadosProjectIds.has(proyecto.id)) {
        list.push({ level: "critical", msg: "Proyecto terminado sin factura", subject: proyecto.codigo || proyecto.nombre, days: diasDesde(proyecto.updated_at || proyecto.created_at), href: `/proyectos/${proyecto.id}` })
      }
    })
    return list.sort((a, b) => (a.level === "critical" ? -1 : 1) - (b.level === "critical" ? -1 : 1) || b.days - a.days).slice(0, 12)
  }, [activeLeads, cotPendientes, proyectosDeClientesGanados, facturadosProjectIds])

  const tareasPendientes = filteredTasks.filter(t => ["pendiente", "en_progreso"].includes(t.estado))
  const tareasVencidas = tareasPendientes.filter(t => t.fecha_limite && t.fecha_limite < todayYmd())
  const tareasCompletadasPeriodo = filteredTasks.filter(t => t.estado === "completada" && inRange(t.updated_at || t.created_at, range.desde, range.hasta))
  const tareasHoy = filteredTasks.filter(t => t.fecha_limite === todayYmd())
  const agendaHoy = filteredTasks.filter(t => t.fecha_limite === todayYmd()).sort(taskSort)
  const agenda7 = filteredTasks.filter(t => t.fecha_limite > todayYmd() && t.fecha_limite <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).sort(taskSort)

  const seguimiento = [...filteredLeads].sort((a, b) => {
    const overdueA = a.fecha_proxima_accion && a.fecha_proxima_accion < todayYmd() ? 0 : 1
    const overdueB = b.fecha_proxima_accion && b.fecha_proxima_accion < todayYmd() ? 0 : 1
    if (overdueA !== overdueB) return overdueA - overdueB
    const temp = (b.temperatura === "caliente" ? 1 : 0) - (a.temperatura === "caliente" ? 1 : 0)
    if (temp !== 0) return temp
    return (b.presupuesto_estimado * b.probabilidad_cierre) - (a.presupuesto_estimado * a.probabilidad_cierre)
  }).slice(0, 12)

  const projectByClient = new Map(filteredProjects.map(project => [project.cliente_id, project]))
  const responsableById = new Map(perfiles.map(persona => [persona.id, persona]))
  const projectStates = Array.from(new Set(proyectos.map(proyecto => proyecto.estado).filter(Boolean))).sort()

  function clearFilters() {
    setPeriodo("mes_actual")
    setDesde(monthStart(0))
    setHasta(monthEnd(0))
    setClienteId("")
    setEstadoCRM("")
    setTemperatura("")
    setEstadoProyecto("")
  }

  if (loading) return <MasterPage title="Dashboard Comercial" subtitle="Pipeline, cotizaciones, proyectos y seguimiento comercial."><EmptyState title="Cargando..." /></MasterPage>
  if (!PERFILES_AUTORIZADOS.includes(perfil?.perfil)) return <MasterPage title="Dashboard Comercial"><EmptyState title="Acceso restringido" description="No tienes permiso para ver este dashboard." /></MasterPage>

  return (
    <MasterPage title="Dashboard Comercial" subtitle="Pipeline, cotizaciones, proyectos y seguimiento comercial." maxWidth={1440}>
      {errors.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13 }}>
          {errors.join(" ")}
        </div>
      )}

      <FiltersBar actions={<button onClick={clearFilters} className="btn-secondary" style={{ fontSize: 13 }}>Limpiar filtros</button>}>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={inputStyle}>
          <option value="mes_actual">Mes actual</option>
          <option value="mes_anterior">Mes anterior</option>
          <option value="ultimos_3_meses">Últimos 3 meses</option>
          <option value="anio_actual">Año actual</option>
          <option value="personalizado">Rango personalizado</option>
        </select>
        {periodo === "personalizado" && (
          <>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
          </>
        )}
        <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
          <option value="">Todos los clientes</option>
          {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.razon_social}</option>)}
        </select>
        <select value={estadoCRM} onChange={e => setEstadoCRM(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados CRM</option>
          {estadosPipeline.map(estado => <option key={estado} value={estado}>{estadosCRM[estado]?.label || estado}</option>)}
        </select>
        <select value={temperatura} onChange={e => setTemperatura(e.target.value)} style={inputStyle}>
          <option value="">Todas las temperaturas</option>
          {Object.entries(temperaturas).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select>
        <select value={estadoProyecto} onChange={e => setEstadoProyecto(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados proyecto</option>
          {projectStates.map(estado => <option key={estado} value={estado}>{estado}</option>)}
        </select>
      </FiltersBar>

      <div style={{ marginTop: 18 }}>
        <ExecutiveSummary columns={6} items={[
          { label: "Pipeline comercial", value: money(pipeline), subtitle: `${activeLeads.length} oportunidades activas`, tone: "success" },
          { label: "Pipeline ponderado", value: money(pipelinePonderado), subtitle: "Presupuesto x probabilidad", tone: "info" },
          { label: "Negocios ganados", value: money(ganado), subtitle: `${wonLeads.length} leads ganados`, tone: "success" },
          { label: "Tasa de conversión", value: `${conversion}%`, subtitle: "Ganados / cerrados", tone: "warning" },
          { label: "Ticket promedio ganado", value: money(ticketPromedio), subtitle: wonLeads.length ? `${wonLeads.length} negocios` : "Sin ganados", tone: "default" },
          { label: "Cotizaciones pendientes", value: String(cotPendientes.length), subtitle: "Pendientes de aprobación", tone: "danger" },
        ]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 18, marginTop: 18 }}>
        <div style={{ gridColumn: "span 7" }}>
          <SectionCard title="Embudo comercial">
            {funnel.every(stage => stage.count === 0) ? <EmptyState title="No hay oportunidades en este periodo." /> : (
              <div style={{ display: "grid", gap: 10 }}>
                {funnel.map(stage => (
                  <div key={stage.estado}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 5 }}>
                      <strong>{stage.label}</strong>
                      <span style={{ color: "#64748b" }}>{stage.count} · {money(stage.amount)} · {stage.conversion}%</span>
                    </div>
                    <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(4, (stage.amount / maxFunnel) * 100)}%`, height: "100%", background: stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
        <div style={{ gridColumn: "span 5" }}>
          <SectionCard title="Forecast del periodo">
            <ForecastRow label="Monto ganado" value={ganado} max={maxForecast} color="#03E373" />
            <ForecastRow label="Forecast ponderado" value={pipelinePonderado} max={maxForecast} color="#3b82f6" />
            <ForecastRow label="Pipeline bruto" value={pipeline} max={maxForecast} color="#94a3b8" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
              <MiniMetric label="Alta" value={money(highProb)} />
              <MiniMetric label="Media" value={money(midProb)} />
              <MiniMetric label="Baja" value={money(lowProb)} />
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 7" }}>
          <SectionCard title="Cotizaciones">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
              <MiniMetric label="Emitidas" value={String(filteredQuotes.length)} />
              <MiniMetric label="Pendientes" value={String(cotPendientes.length)} />
              <MiniMetric label="Aprobadas" value={String(cotAprobadas.length)} />
              <MiniMetric label="Rechazadas/anuladas" value={String(cotRechazadas.length)} />
              <MiniMetric label="Monto cotizado" value={money(filteredQuotes.reduce((s, c) => s + totalCotizacion(c), 0))} />
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              Tiempo promedio de aprobación: {diasPromedioAprobacion == null ? "sin datos confiables" : `${diasPromedioAprobacion} días`}
            </div>
            {cotizacionesTabla.length === 0 ? <EmptyState title="No hay cotizaciones pendientes." /> : (
              <Table>
                <thead><tr>{["Referencia", "Cliente", "Proyecto", "V", "Monto", "Estado", "Creación", "Días", "Responsable"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {cotizacionesTabla.map(cot => (
                    <tr key={cot.id}>
                      <Td><a href={`/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}`}>Cotización</a></Td>
                      <Td>{cot.proyecto?.cliente?.razon_social || "Sin cliente"}</Td>
                      <Td><a href={`/proyectos/${cot.proyecto_id}`}>{cot.proyecto?.codigo || cot.proyecto?.nombre || "Proyecto"}</a></Td>
                      <Td>V{cot.version || "-"}</Td>
                      <Td>{money(totalCotizacion(cot))}</Td>
                      <Td><StatusBadge label={cot.estado || "Sin estado"} type={cot.estado || "pendiente"} /></Td>
                      <Td>{String(cot.created_at || "").slice(0, 10)}</Td>
                      <Td>{diasDesde(cot.created_at)}</Td>
                      <Td>{nombrePersona(responsableById.get(cot.proyecto?.comercial_id || cot.proyecto?.productor_id))}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 5" }}>
          <SectionCard title="Radar de conversión">
            <div style={{ display: "grid", gap: 9 }}>
              {radar.map((item, index) => (
                <div key={item.label} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, background: "#ecfdf5", color: "#0F6E56", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{index + 1}</span>
                  <span style={{ fontSize: 13 }}>{item.label}{item.approx ? <span style={{ color: "#94a3b8" }}> aprox.</span> : null}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Clientes con mayor actividad comercial">
            {clienteRows.length === 0 ? <EmptyState title="No hay actividad comercial en este periodo." /> : (
              <div style={{ display: "grid", gap: 10 }}>
                {clienteRows.map(row => (
                  <div key={row.cliente.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong style={{ fontSize: 13 }}>{row.cliente.razon_social}</strong>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{money(row.pipeline)}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                      {row.active} oportunidades · {row.quotes} cotizaciones · {row.projects} proyectos · Última: {row.last ? String(row.last).slice(0, 10) : "sin fecha"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Alertas comerciales">
            {alerts.length === 0 ? <EmptyState title="No hay alertas comerciales." /> : (
              <div style={{ display: "grid", gap: 8 }}>
                {alerts.map((alerta, idx) => (
                  <a key={`${alerta.msg}-${idx}`} href={alerta.href} style={{ textDecoration: "none", color: "inherit", border: "1px solid #e2e8f0", borderLeft: `4px solid ${alerta.level === "critical" ? "#ef4444" : "#f59e0b"}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{alerta.msg}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{alerta.subject} · {alerta.days} días</div>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 5" }}>
          <SectionCard title="Actividad comercial">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <MiniMetric label="Pendientes" value={String(tareasPendientes.length)} />
              <MiniMetric label="Vencidas" value={String(tareasVencidas.length)} />
              <MiniMetric label="Completadas" value={String(tareasCompletadasPeriodo.length)} />
              <MiniMetric label="Tareas de hoy" value={String(tareasHoy.length)} />
            </div>
            <p style={{ fontSize: 12, color: "#64748b", margin: "12px 0 0" }}>
              Solo se incluyen tareas cuyo creador tiene perfil comercial.
            </p>
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 7" }}>
          <SectionCard title="Agenda comercial">
            <AgendaGroup title="Vencidas" items={tareasVencidas.sort(taskSort)} />
            <AgendaGroup title="Hoy" items={agendaHoy} />
            <AgendaGroup title="Próximos 7 días" items={agenda7} />
          </SectionCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <SectionCard title="Tabla de seguimiento comercial">
            {seguimiento.length === 0 ? <EmptyState title="No hay oportunidades en este periodo." /> : (
              <Table>
                <thead><tr>{["Cliente/lead", "Estado", "Temp.", "Referencias", "Presupuesto", "Prob.", "Ponderado", "Responsable", "Próxima acción", "Sin seg.", "Proyecto", "Alerta"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {seguimiento.map(lead => {
                    const proyecto = lead.cliente_id ? projectByClient.get(lead.cliente_id) : null
                    const overdue = lead.fecha_proxima_accion && lead.fecha_proxima_accion < todayYmd()
                    return (
                      <tr key={lead.id}>
                        <Td><a href="/crm">{lead.razon_social || lead.cliente?.razon_social || "Lead"}</a></Td>
                        <Td><StatusBadge label={estadosCRM[lead.estado]?.label || lead.estado} type={lead.estado} /></Td>
                        <Td>{temperaturas[lead.temperatura]?.label || lead.temperatura}</Td>
                        <Td>{referencias(lead.referencias_cotizacion).join(", ") || "—"}</Td>
                        <Td>{money(lead.presupuesto_estimado)}</Td>
                        <Td>{lead.probabilidad_cierre}%</Td>
                        <Td>{money(lead.presupuesto_estimado * lead.probabilidad_cierre / 100)}</Td>
                        <Td>{nombrePersona(responsableById.get(lead.responsable_id))}</Td>
                        <Td>{lead.fecha_proxima_accion || "—"}</Td>
                        <Td>{diasDesde(lead.updated_at || lead.created_at)}</Td>
                        <Td>{proyecto ? <a href={`/proyectos/${proyecto.id}`}>{proyecto.codigo || proyecto.nombre}</a> : "—"}</Td>
                        <Td>{overdue ? "Vencida" : lead.temperatura === "caliente" ? "Prioridad" : "—"}</Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </SectionCard>
        </div>
      </div>
    </MasterPage>
  )
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  background: "#fff",
  color: "#0f172a",
}

function ForecastRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(3, (value / max) * 100)}%`, height: "100%", background: color }} />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Table({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>{children}</table></div>
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "9px 10px", fontSize: 11, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "10px", fontSize: 12, borderBottom: "1px solid #f1f5f9", color: "#334155" }}>{children}</td>
}

function AgendaGroup({ title, items }: { title: string; items: any[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8" }}>Sin tareas.</div> : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.slice(0, 6).map(item => (
            <a key={item.id} href={`/tareas?tarea_id=${item.id}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: 13 }}>{item.titulo}</strong>
                <span style={{ fontSize: 11, color: item.fecha_limite && item.fecha_limite < todayYmd() ? "#dc2626" : "#64748b" }}>{item.fecha_limite || "Sin fecha"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {item.cliente?.razon_social || item.proyecto?.codigo || "Sin cliente/proyecto"} · Asignado a {nombrePersona(item.asignado)} · {item.prioridad || "media"} · {item.estado}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
