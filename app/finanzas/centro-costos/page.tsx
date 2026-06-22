"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import FinanceNav from "@/components/finanzas/FinanceNav"
import FinanceDataError from "@/components/finanzas/FinanceDataError"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import {
  FACTURAS_ANULADAS,
  FACTURAS_COBRADAS,
  RQS_POR_PAGAR,
  financeMoney,
  financeNumber,
} from "@/lib/finance"

type TrafficLight = "Verde" | "Amarillo" | "Rojo"

type CostCenterRow = {
  id: string
  codigo: string
  proyecto: string
  cliente: string
  totalFacturado: number
  totalCobrado: number
  rqPagado: number
  rqPendiente: number
  cajaChica: number
  costoReal: number
  utilidad: number
  margen: number
  semaforo: TrafficLight
}

const TRAFFIC_LIGHT: Record<TrafficLight, { type: string; color: string }> = {
  Verde: { type: "completado", color: "#15803D" },
  Amarillo: { type: "pendiente", color: "#B45309" },
  Rojo: { type: "cancelado", color: "#B91C1C" },
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function trafficLight(margin: number): TrafficLight {
  if (margin >= 20) return "Verde"
  if (margin >= 10) return "Amarillo"
  return "Rojo"
}

export default function CentroCostosFinancieroPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [projects, setProjects] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [pettyCash, setPettyCash] = useState<any[]>([])
  const [clientFilter, setClientFilter] = useState("")
  const [trafficFilter, setTrafficFilter] = useState("")
  const [sortBy, setSortBy] = useState("mayor_facturacion")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError("")

      try {
        const results = await Promise.all([
          supabase
            .from("proyectos")
            .select("id,codigo,nombre,deleted_at,cliente_id,cliente:clientes(id,razon_social)")
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabase
            .from("facturas")
            .select("id,proyecto_id,subtotal,igv,monto_final_abonado,estado"),
          supabase
            .from("requerimientos_pago")
            .select("id,proyecto_id,monto_solicitado,estado"),
          supabase
            .from("caja_chica")
            .select("id,proyecto_id,monto_debe,estado"),
        ])

        const errors = results.map(result => result.error?.message).filter(Boolean)
        if (errors.length) setError(errors.join(" · "))
        setProjects(results[0].data || [])
        setInvoices(results[1].data || [])
        setPaymentRequests(results[2].data || [])
        setPettyCash(results[3].data || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error inesperado al cargar el centro de costos")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authorized, loadingAccess, supabase])

  const rows = useMemo<CostCenterRow[]>(() => {
    const invoicesByProject = new Map<string, any[]>()
    const requestsByProject = new Map<string, any[]>()
    const cashByProject = new Map<string, any[]>()

    invoices.forEach(invoice => {
      if (!invoice.proyecto_id) return
      invoicesByProject.set(invoice.proyecto_id, [...(invoicesByProject.get(invoice.proyecto_id) || []), invoice])
    })
    paymentRequests.forEach(request => {
      if (!request.proyecto_id) return
      requestsByProject.set(request.proyecto_id, [...(requestsByProject.get(request.proyecto_id) || []), request])
    })
    pettyCash.forEach(entry => {
      if (!entry.proyecto_id) return
      cashByProject.set(entry.proyecto_id, [...(cashByProject.get(entry.proyecto_id) || []), entry])
    })

    return projects.map(project => {
      const client = relationOne<any>(project.cliente)
      const projectInvoices = invoicesByProject.get(project.id) || []
      const projectRequests = requestsByProject.get(project.id) || []
      const projectCash = cashByProject.get(project.id) || []

      const totalFacturado = projectInvoices
        .filter(invoice => !FACTURAS_ANULADAS.includes(invoice.estado))
        .reduce((sum, invoice) => sum + financeNumber(invoice.subtotal) + financeNumber(invoice.igv), 0)
      const totalCobrado = projectInvoices
        .filter(invoice => FACTURAS_COBRADAS.includes(invoice.estado))
        .reduce((sum, invoice) => sum + financeNumber(invoice.monto_final_abonado), 0)
      const rqPagado = projectRequests
        .filter(request => request.estado === "pagado")
        .reduce((sum, request) => sum + financeNumber(request.monto_solicitado), 0)
      const rqPendiente = projectRequests
        .filter(request => RQS_POR_PAGAR.includes(request.estado))
        .reduce((sum, request) => sum + financeNumber(request.monto_solicitado), 0)
      const cajaChica = projectCash
        .filter(entry => entry.estado === "aprobado")
        .reduce((sum, entry) => sum + financeNumber(entry.monto_debe), 0)
      const costoReal = rqPagado + cajaChica
      const utilidad = totalFacturado - costoReal
      const margen = totalFacturado > 0 ? (utilidad / totalFacturado) * 100 : 0

      return {
        id: project.id,
        codigo: project.codigo || "—",
        proyecto: project.nombre || "Sin nombre",
        cliente: client?.razon_social || "Sin cliente",
        totalFacturado,
        totalCobrado,
        rqPagado,
        rqPendiente,
        cajaChica,
        costoReal,
        utilidad,
        margen,
        semaforo: trafficLight(margen),
      }
    })
  }, [invoices, paymentRequests, pettyCash, projects])

  const clients = useMemo(
    () => [...new Set(rows.map(row => row.cliente))].sort((a, b) => a.localeCompare(b, "es")),
    [rows]
  )

  const filteredRows = useMemo(() => {
    const filtered = rows.filter(row => {
      if (clientFilter && row.cliente !== clientFilter) return false
      if (trafficFilter && row.semaforo !== trafficFilter) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === "mayor_costo") return b.costoReal - a.costoReal
      if (sortBy === "mayor_utilidad") return b.utilidad - a.utilidad
      if (sortBy === "menor_margen") return a.margen - b.margen
      if (sortBy === "mayor_rq_pendiente") return b.rqPendiente - a.rqPendiente
      return b.totalFacturado - a.totalFacturado
    })
  }, [clientFilter, rows, sortBy, trafficFilter])

  const metrics = useMemo(() => {
    const facturacion = filteredRows.reduce((sum, row) => sum + row.totalFacturado, 0)
    const costos = filteredRows.reduce((sum, row) => sum + row.costoReal, 0)
    const utilidad = filteredRows.reduce((sum, row) => sum + row.utilidad, 0)
    const rowsWithBilling = filteredRows.filter(row => row.totalFacturado > 0)
    const margenPromedio = rowsWithBilling.length
      ? rowsWithBilling.reduce((sum, row) => sum + row.margen, 0) / rowsWithBilling.length
      : 0
    return { facturacion, costos, utilidad, margenPromedio }
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
    minWidth: 180,
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#0F172A" }}>Rentabilidad por Proyecto</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Rentabilidad real por proyecto basada en facturación, RQ pagados y caja chica.</p>
      </div>
      <FinanceNav />
      <FinanceDataError detail={error} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="FACTURACIÓN TOTAL" value={financeMoney(metrics.facturacion)} sub={`${filteredRows.length} proyectos visibles`} borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="wallet" label="COSTOS TOTALES" value={financeMoney(metrics.costos)} sub="RQ pagados y caja chica" borderColor="#F97316" valueColor="#C2410C" />
        <KpiCard icon="chart" label="UTILIDAD TOTAL" value={financeMoney(metrics.utilidad)} sub="Facturación menos costos reales" borderColor={metrics.utilidad >= 0 ? "#16A34A" : "#DC2626"} valueColor={metrics.utilidad >= 0 ? "#15803D" : "#B91C1C"} />
        <KpiCard icon="shield" label="MARGEN PROMEDIO" value={`${metrics.margenPromedio.toFixed(1)}%`} sub="Promedio de proyectos facturados" borderColor={metrics.margenPromedio >= 20 ? "#16A34A" : metrics.margenPromedio >= 10 ? "#F59E0B" : "#DC2626"} valueColor={metrics.margenPromedio >= 20 ? "#15803D" : metrics.margenPromedio >= 10 ? "#B45309" : "#B91C1C"} />
      </div>

      <SectionCard
        title="Consolidado financiero por proyecto"
        action={<span style={{ fontSize: 12, color: "#64748B" }}>{filteredRows.length} de {rows.length} proyectos</span>}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los clientes</option>
            {clients.map(client => <option key={client} value={client}>{client}</option>)}
          </select>
          <select value={trafficFilter} onChange={event => setTrafficFilter(event.target.value)} style={selectStyle}>
            <option value="">Todos los semáforos</option>
            <option value="Verde">Verde: margen ≥ 20%</option>
            <option value="Amarillo">Amarillo: margen 10%–19.9%</option>
            <option value="Rojo">Rojo: margen &lt; 10%</option>
          </select>
          <select value={sortBy} onChange={event => setSortBy(event.target.value)} style={{ ...selectStyle, marginLeft: "auto" }}>
            <option value="mayor_facturacion">Mayor facturación</option>
            <option value="mayor_costo">Mayor costo real</option>
            <option value="mayor_utilidad">Mayor utilidad</option>
            <option value="menor_margen">Menor margen</option>
            <option value="mayor_rq_pendiente">Mayor RQ pendiente</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1500, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["CÓDIGO","PROYECTO","CLIENTE","TOTAL FACTURADO","TOTAL COBRADO","RQ PAGADO","RQ PENDIENTE","CAJA CHICA","COSTO REAL TOTAL","UTILIDAD","MARGEN","SEMÁFORO"].map(header => (
                  <th key={header} style={{ padding: "10px 12px", textAlign: ["TOTAL FACTURADO","TOTAL COBRADO","RQ PAGADO","RQ PENDIENTE","CAJA CHICA","COSTO REAL TOTAL","UTILIDAD","MARGEN"].includes(header) ? "right" : "left", fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const signal = TRAFFIC_LIGHT[row.semaforo]
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={{ padding: 12 }}>
                      <a href={`/proyectos/${row.id}`} style={{ color: "#0F6E56", fontWeight: 800, textDecoration: "none" }}>{row.codigo}</a>
                    </td>
                    <td style={{ padding: 12, minWidth: 210 }}>
                      <a href={`/proyectos/${row.id}`} style={{ color: "#0F172A", fontWeight: 700, textDecoration: "none" }}>{row.proyecto}</a>
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <a href={`/liquidaciones?proyecto_id=${row.id}`} style={{ color: "#2563EB", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Liquidación</a>
                        <a href={`/facturacion?proyecto_id=${row.id}`} style={{ color: "#2563EB", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Facturación</a>
                      </div>
                    </td>
                    <td style={{ padding: 12, minWidth: 170 }}>{row.cliente}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>{financeMoney(row.totalFacturado)}</td>
                    <td style={{ padding: 12, textAlign: "right", color: "#15803D" }}>{financeMoney(row.totalCobrado)}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.rqPagado)}</td>
                    <td style={{ padding: 12, textAlign: "right", color: "#B45309" }}>{financeMoney(row.rqPendiente)}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.cajaChica)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>{financeMoney(row.costoReal)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: row.utilidad >= 0 ? "#15803D" : "#B91C1C" }}>{financeMoney(row.utilidad)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: signal.color }}>{row.margen.toFixed(1)}%</td>
                    <td style={{ padding: 12 }}><StatusBadge label={row.semaforo} type={signal.type} /></td>
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

