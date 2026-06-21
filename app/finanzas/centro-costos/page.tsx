"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import FinanceNav from "@/components/finanzas/FinanceNav"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import { FACTURAS_ANULADAS, FACTURAS_PENDIENTES, financeMoney, financeNumber } from "@/lib/finance"

type FinancialStatus = "Saludable" | "Atención" | "Crítico" | "Pérdida"

type CostCenterRow = {
  id: string
  codigo: string
  nombre: string
  cliente: string
  clienteId: string
  estadoProyecto: string
  ventaPresupuestada: number
  ventaFacturada: number
  cobrado: number
  pendiente: number
  costoPresupuestado: number
  costoReal: number
  utilidad: number
  margen: number
  desviacion: number
  estadoFinanciero: FinancialStatus
  invoiceMonths: string[]
}

const FINANCIAL_STATUS: Record<FinancialStatus, { type: string; color: string }> = {
  Saludable: { type: "completado", color: "#15803D" },
  Atención: { type: "pendiente", color: "#B45309" },
  Crítico: { type: "revision", color: "#6D28D9" },
  Pérdida: { type: "cancelado", color: "#B91C1C" },
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function financialStatus(margin: number): FinancialStatus {
  if (margin >= 20) return "Saludable"
  if (margin >= 10) return "Atención"
  if (margin >= 0) return "Crítico"
  return "Pérdida"
}

function projectStateLabel(value: string) {
  return value ? value.replaceAll("_", " ") : "Sin estado"
}

function invoiceMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" })
}

export default function CentroCostosFinancieroPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [projects, setProjects] = useState<any[]>([])
  const [liquidations, setLiquidations] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [clientFilter, setClientFilter] = useState("")
  const [financialFilter, setFinancialFilter] = useState("")
  const [projectStateFilter, setProjectStateFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")
  const [sortBy, setSortBy] = useState("mayor_utilidad")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError("")

      const results = await Promise.all([
        supabase
          .from("proyectos")
          .select("id,codigo,nombre,estado,deleted_at,cliente_id,cliente:clientes(id,razon_social)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("liquidaciones")
          .select("id,proyecto_id,precio_cliente_presupuestado,costo_presupuestado,costo_real,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("facturas")
          .select("id,proyecto_id,subtotal,igv,monto_final_abonado,estado,fecha_emision"),
      ])

      const errors = results.map(result => result.error?.message).filter(Boolean)
      if (errors.length) setError(errors.join(" · "))
      setProjects(results[0].data || [])
      setLiquidations(results[1].data || [])
      setInvoices(results[2].data || [])
      setLoading(false)
    }

    load()
  }, [authorized, loadingAccess, supabase])

  const rows = useMemo<CostCenterRow[]>(() => {
    const liquidationByProject = new Map<string, any>()
    liquidations.forEach(liquidation => {
      if (liquidation.proyecto_id && !liquidationByProject.has(liquidation.proyecto_id)) {
        liquidationByProject.set(liquidation.proyecto_id, liquidation)
      }
    })

    const invoicesByProject = new Map<string, any[]>()
    invoices.forEach(invoice => {
      if (!invoice.proyecto_id) return
      const current = invoicesByProject.get(invoice.proyecto_id) || []
      current.push(invoice)
      invoicesByProject.set(invoice.proyecto_id, current)
    })

    return projects.map(project => {
      const client = relationOne<any>(project.cliente)
      const liquidation = liquidationByProject.get(project.id)
      const projectInvoices = invoicesByProject.get(project.id) || []
      const validInvoices = projectInvoices.filter(invoice => !FACTURAS_ANULADAS.includes(invoice.estado))
      const ventaPresupuestada = financeNumber(liquidation?.precio_cliente_presupuestado)
      const ventaFacturada = validInvoices.reduce((sum, invoice) => sum + financeNumber(invoice.subtotal) + financeNumber(invoice.igv), 0)
      const cobrado = projectInvoices
        .filter(invoice => invoice.estado === "cobrada")
        .reduce((sum, invoice) => sum + financeNumber(invoice.monto_final_abonado), 0)
      const pendiente = projectInvoices
        .filter(invoice => FACTURAS_PENDIENTES.includes(invoice.estado))
        .reduce((sum, invoice) => sum + financeNumber(invoice.monto_final_abonado), 0)
      const costoPresupuestado = financeNumber(liquidation?.costo_presupuestado)
      const costoReal = financeNumber(liquidation?.costo_real)
      const ventaBase = ventaFacturada > 0 ? ventaFacturada : ventaPresupuestada
      const utilidad = ventaBase - costoReal
      const margen = ventaBase > 0 ? (utilidad / ventaBase) * 100 : 0
      const estadoFinanciero = financialStatus(margen)

      return {
        id: project.id,
        codigo: project.codigo || "—",
        nombre: project.nombre || "Sin nombre",
        cliente: client?.razon_social || "Sin cliente",
        clienteId: project.cliente_id || client?.id || "",
        estadoProyecto: project.estado || "",
        ventaPresupuestada,
        ventaFacturada,
        cobrado,
        pendiente,
        costoPresupuestado,
        costoReal,
        utilidad,
        margen,
        desviacion: costoReal - costoPresupuestado,
        estadoFinanciero,
        invoiceMonths: [...new Set(projectInvoices.map(invoice => String(invoice.fecha_emision || "").slice(0, 7)).filter(Boolean))],
      }
    })
  }, [invoices, liquidations, projects])

  const clients = useMemo(
    () => [...new Map(rows.map(row => [row.clienteId || row.cliente, { id: row.clienteId || row.cliente, name: row.cliente }])).values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [rows]
  )
  const projectStates = useMemo(
    () => [...new Set(rows.map(row => row.estadoProyecto).filter(Boolean))].sort(),
    [rows]
  )
  const invoiceMonths = useMemo(
    () => [...new Set(rows.flatMap(row => row.invoiceMonths))].sort().reverse(),
    [rows]
  )

  const filteredRows = useMemo(() => {
    const filtered = rows.filter(row => {
      if (clientFilter && (row.clienteId || row.cliente) !== clientFilter) return false
      if (financialFilter && row.estadoFinanciero !== financialFilter) return false
      if (projectStateFilter && row.estadoProyecto !== projectStateFilter) return false
      if (monthFilter && !row.invoiceMonths.includes(monthFilter)) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === "menor_utilidad") return a.utilidad - b.utilidad
      if (sortBy === "mayor_venta") return b.ventaFacturada - a.ventaFacturada
      if (sortBy === "mayor_pendiente") return b.pendiente - a.pendiente
      if (sortBy === "mayor_desviacion") return b.desviacion - a.desviacion
      if (sortBy === "menor_margen") return a.margen - b.margen
      return b.utilidad - a.utilidad
    })
  }, [clientFilter, financialFilter, monthFilter, projectStateFilter, rows, sortBy])

  const metrics = useMemo(() => {
    const ventas = filteredRows.reduce((sum, row) => sum + row.ventaFacturada, 0)
    const utilidad = filteredRows.reduce((sum, row) => sum + row.utilidad, 0)
    const rowsWithSales = filteredRows.filter(row => row.ventaFacturada > 0 || row.ventaPresupuestada > 0)
    const margenPromedio = rowsWithSales.length
      ? rowsWithSales.reduce((sum, row) => sum + row.margen, 0) / rowsWithSales.length
      : 0
    const pendiente = filteredRows.reduce((sum, row) => sum + row.pendiente, 0)
    const lowMargin = rowsWithSales.filter(row => row.margen < 15).length
    return { ventas, utilidad, margenPromedio, pendiente, lowMargin }
  }, [filteredRows])

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando centro de costos financiero...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  const selectStyle = {
    padding: "8px 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 7,
    background: "#FFFFFF",
    color: "#334155",
    fontSize: 12,
    minWidth: 170,
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#0F172A" }}>Centro de Costos Financiero</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Ventas, costos, cobranza y margen consolidados por proyecto</p>
      </div>
      <FinanceNav />

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 8 }}>
          No se pudieron cargar todos los datos: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard icon="money" label="VENTAS FACTURADAS" value={financeMoney(metrics.ventas)} sub={`${filteredRows.length} proyectos visibles`} borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="chart" label="UTILIDAD TOTAL" value={financeMoney(metrics.utilidad)} sub="Venta base menos costo real" borderColor={metrics.utilidad >= 0 ? "#16A34A" : "#DC2626"} valueColor={metrics.utilidad >= 0 ? "#15803D" : "#B91C1C"} />
        <KpiCard icon="shield" label="MARGEN PROMEDIO" value={`${metrics.margenPromedio.toFixed(1)}%`} sub="Promedio de proyectos con venta" borderColor="#0D9488" valueColor="#0F766E" />
        <KpiCard icon="wallet" label="PENDIENTE POR COBRAR" value={financeMoney(metrics.pendiente)} sub="Facturas pendientes o emitidas" borderColor="#F59E0B" valueColor="#B45309" />
        <KpiCard icon="folder" label="MARGEN MENOR A 15%" value={String(metrics.lowMargin)} sub="Proyectos que requieren atención" borderColor="#DC2626" valueColor="#B91C1C" />
      </div>

      <SectionCard
        title="Detalle por proyecto"
        action={<span style={{ fontSize: 12, color: "#64748B" }}>{filteredRows.length} de {rows.length} proyectos</span>}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los clientes</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select value={financialFilter} onChange={event => setFinancialFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los estados financieros</option>
            {Object.keys(FINANCIAL_STATUS).map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={projectStateFilter} onChange={event => setProjectStateFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los estados de proyecto</option>
            {projectStates.map(status => <option key={status} value={status}>{projectStateLabel(status)}</option>)}
          </select>
          <select value={monthFilter} onChange={event => setMonthFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los meses de facturación</option>
            {invoiceMonths.map(month => <option key={month} value={month}>{invoiceMonthLabel(month)}</option>)}
          </select>
          <select value={sortBy} onChange={event => setSortBy(event.target.value)} style={{ ...selectStyle, marginLeft: "auto" }}>
            <option value="mayor_utilidad">Mayor utilidad</option>
            <option value="menor_utilidad">Menor utilidad</option>
            <option value="mayor_venta">Mayor venta facturada</option>
            <option value="mayor_pendiente">Mayor pendiente de cobro</option>
            <option value="mayor_desviacion">Mayor desviación de costo</option>
            <option value="menor_margen">Menor margen</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1720, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["PROYECTO","CLIENTE","ESTADO PROYECTO","VENTA PRESUP.","VENTA FACTURADA","COBRADO","PENDIENTE","COSTO PRESUP.","COSTO REAL","UTILIDAD","MARGEN","DESVIACIÓN","ESTADO FINANCIERO"].map(header => (
                  <th key={header} style={{ padding: "10px 12px", textAlign: ["VENTA PRESUP.","VENTA FACTURADA","COBRADO","PENDIENTE","COSTO PRESUP.","COSTO REAL","UTILIDAD","MARGEN","DESVIACIÓN"].includes(header) ? "right" : "left", fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const state = FINANCIAL_STATUS[row.estadoFinanciero]
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={{ padding: 12, minWidth: 220 }}>
                      <a href={`/proyectos/${row.id}`} style={{ color: "#0F6E56", fontWeight: 800, textDecoration: "none" }}>{row.codigo}</a>
                      <div style={{ color: "#64748B", fontSize: 11, marginTop: 3 }}>{row.nombre}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 7 }}>
                        <a href={`/liquidaciones?proyecto_id=${row.id}`} style={{ color: "#2563EB", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Liquidación</a>
                        <a href={`/facturacion?proyecto_id=${row.id}`} style={{ color: "#2563EB", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Facturación</a>
                      </div>
                    </td>
                    <td style={{ padding: 12, minWidth: 180 }}>{row.cliente}</td>
                    <td style={{ padding: 12 }}><StatusBadge label={projectStateLabel(row.estadoProyecto)} type={row.estadoProyecto} /></td>
                    <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.ventaPresupuestada)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>{financeMoney(row.ventaFacturada)}</td>
                    <td style={{ padding: 12, textAlign: "right", color: "#15803D" }}>{financeMoney(row.cobrado)}</td>
                    <td style={{ padding: 12, textAlign: "right", color: "#B45309" }}>{financeMoney(row.pendiente)}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.costoPresupuestado)}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.costoReal)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: row.utilidad >= 0 ? "#15803D" : "#B91C1C" }}>{financeMoney(row.utilidad)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: state.color }}>{row.margen.toFixed(1)}%</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: row.desviacion > 0 ? "#B91C1C" : "#15803D" }}>{financeMoney(row.desviacion)}</td>
                    <td style={{ padding: 12 }}><StatusBadge label={row.estadoFinanciero} type={state.type} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No hay proyectos que coincidan con los filtros seleccionados.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
