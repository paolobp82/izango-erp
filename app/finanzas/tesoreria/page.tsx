"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { calculateTreasuryKpis, loadTreasuryPaymentItems } from "@/lib/services/treasury"
import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import { nextSortState, sortIndicator, sortRows, type SortState } from "@/lib/table-sort"

const estadoLabel: Record<string, string> = {
  todos: "Todos",
  sin_programar: "Sin programar",
  programado: "Programado",
  vence_hoy: "Vence hoy",
  vencido: "Vencido",
  pagado: "Pagado",
  anulado: "Anulado",
}

const origenLabel: Record<string, string> = {
  todos: "Todos los orígenes",
  rqp: "RQP",
  administracion: "Administración / RPA",
  caja_chica: "Caja Chica",
  obligacion_financiera: "Obligaciones Financieras",
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  return String(value).slice(0, 10)
}

function fechaFiltro(item: TreasuryPaymentItem) {
  return fmtDate(item.fecha_programada_pago) !== "—"
    ? fmtDate(item.fecha_programada_pago)
    : fmtDate(item.fecha_necesidad_pago) !== "—"
      ? fmtDate(item.fecha_necesidad_pago)
      : fmtDate(item.fecha_pago) !== "—"
        ? fmtDate(item.fecha_pago)
        : ""
}

function paymentPriority(item: TreasuryPaymentItem) {
  if (item.es_excepcion) return { label: "Alta", color: "#dc2626" }
  if (item.estado_pago === "vencido") return { label: "Alta", color: "#dc2626" }
  if (item.estado_pago === "vence_hoy") return { label: "Hoy", color: "#c2410c" }
  if (item.estado_pago === "programado") return { label: "Media", color: "#92400e" }
  return { label: "Normal", color: "#6b7280" }
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#f9fafb", display: "grid", gap: 8 }}>
      <div style={{ fontSize: 11, color: "#374151", fontWeight: 800, textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong style={{ color: "#111827", textAlign: "right" }}>{value}</strong>
    </div>
  )
}

function SortTh({ label, sortKey, sort, onSort, right }: { label: string; sortKey: string; sort: SortState; onSort: (key: string) => void; right?: boolean }) {
  return (
    <th style={right ? thRight : th}>
      <button onClick={() => onSort(sortKey)} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", color: "inherit", font: "inherit", fontWeight: 700 }}>
        {label} <span style={{ color: sort.key === sortKey ? "#0F6E56" : "#9ca3af" }}>{sortIndicator(sort, sortKey)}</span>
      </button>
    </th>
  )
}

export default function TesoreriaPage() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<TreasuryPaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroOrigen, setFiltroOrigen] = useState("todos")
  const [filtroEmpresa, setFiltroEmpresa] = useState("todos")
  const [filtroExcepcion, setFiltroExcepcion] = useState("todos")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [selected, setSelected] = useState<TreasuryPaymentItem | null>(null)
  const [pagina, setPagina] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: "fecha", direction: "asc" })
  const pageSize = 25

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg("")

    try {
      setItems(await loadTreasuryPaymentItems(supabase))
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Error cargando Tesorería")
      setItems([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()

    return items.filter(item => {
      const matchEstado = filtroEstado === "todos" || item.estado_pago === filtroEstado
      const matchOrigen = filtroOrigen === "todos" || item.origen === filtroOrigen
      const matchEmpresa = filtroEmpresa === "todos" || item.empresa === filtroEmpresa
      const matchExcepcion = filtroExcepcion === "todos" || (filtroExcepcion === "solo" ? Boolean(item.es_excepcion) : !item.es_excepcion)
      const fecha = fechaFiltro(item)
      const matchFechaDesde = !fechaDesde || (fecha && fecha >= fechaDesde)
      const matchFechaHasta = !fechaHasta || (fecha && fecha <= fechaHasta)
      const texto = [
        item.documento,
        item.beneficiario,
        item.proyecto,
        item.empresa,
        item.origen,
        item.estado_pago,
        item.motivo_excepcion,
      ].join(" ").toLowerCase()

      return matchEstado && matchOrigen && matchEmpresa && matchExcepcion && matchFechaDesde && matchFechaHasta && (!q || texto.includes(q))
    })
  }, [items, filtroEstado, filtroOrigen, filtroEmpresa, filtroExcepcion, fechaDesde, fechaHasta, busqueda])

  const empresasDisponibles = useMemo(() => {
    return Array.from(new Set(items.map(item => item.empresa).filter(Boolean) as string[])).sort()
  }, [items])

  const resumen = useMemo(() => calculateTreasuryKpis(itemsFiltrados), [itemsFiltrados])
  const itemsOrdenados = useMemo(() => sortRows(itemsFiltrados, sort, (item, key) => {
    if (key === "prioridad") return paymentPriority(item).label
    if (key === "fecha") return fechaFiltro(item)
    return (item as unknown as Record<string, unknown>)[key]
  }), [itemsFiltrados, sort])
  const totalPaginas = Math.max(1, Math.ceil(itemsOrdenados.length / pageSize))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const inicio = (paginaSegura - 1) * pageSize
  const itemsPaginados = itemsOrdenados.slice(inicio, inicio + pageSize)
  const desde = itemsOrdenados.length === 0 ? 0 : inicio + 1
  const hasta = Math.min(inicio + pageSize, itemsOrdenados.length)

  useEffect(() => {
    setPagina(1)
  }, [filtroEstado, filtroOrigen, filtroEmpresa, filtroExcepcion, fechaDesde, fechaHasta, busqueda, sort])

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        <Link href="/finanzas" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
          ← Finanzas
        </Link>
        <h1 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
          Tesorería
        </h1>
        <p style={{ margin: 0, color: "#6b7280", maxWidth: 820 }}>
          Bandeja operativa de pagos consolidada: RQP, Caja Chica, Administración/RPA y Obligaciones Financieras.
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={cardStyle}><strong>{fmtMoney(resumen.totalPendiente)}</strong><span>Total pendiente</span></div>
        <div style={cardStyle}><strong>{fmtMoney(resumen.totalVencido)}</strong><span>Total vencido</span></div>
        <div style={cardStyle}><strong>{fmtMoney(resumen.pagosHoy)}</strong><span>Pagos de hoy</span></div>
        <div style={cardStyle}><strong>{fmtMoney(resumen.proximos7Dias)}</strong><span>Próximos 7 días</span></div>
        <div style={cardStyle}><strong>{resumen.totalExcepciones}</strong><span>Total excepciones</span></div>
        <div style={cardStyle}><strong>{resumen.obligacionesPendientes}</strong><span>Obligaciones pendientes</span></div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Bandeja de Pagos</h2>
            <button onClick={load} disabled={loading} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}>
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) repeat(auto-fit, minmax(150px, 180px))", gap: 10 }}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar documento, beneficiario, proyecto o empresa..."
              style={inputStyle}
            />

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={inputStyle}>
              {Object.entries(estadoLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)} style={inputStyle}>
              {Object.entries(origenLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} style={inputStyle}>
              <option value="todos">Todas las empresas</option>
              {empresasDisponibles.map(empresa => (
                <option key={empresa} value={empresa}>{empresa}</option>
              ))}
            </select>

            <select value={filtroExcepcion} onChange={e => setFiltroExcepcion(e.target.value)} style={inputStyle}>
              <option value="todos">Todas las excepciones</option>
              <option value="solo">Solo excepciones</option>
              <option value="sin">Sin excepción</option>
            </select>

            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: 14, color: "#991b1b", background: "#fef2f2", fontSize: 13 }}>
            Error cargando Tesorería: {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0, 1fr) 360px" : "1fr", gap: 0 }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1320, borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f9fafb", color: "#6b7280" }}>
              <tr>
                <SortTh label="Prioridad" sortKey="prioridad" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Origen" sortKey="origen" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Documento" sortKey="documento" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Empresa" sortKey="empresa" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Proyecto" sortKey="proyecto" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Beneficiario" sortKey="beneficiario" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="F. Necesidad" sortKey="fecha_necesidad_pago" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="F. Programada" sortKey="fecha_programada_pago" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="F. Pago" sortKey="fecha_pago" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Condición" sortKey="condicion_comercial" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Excepción" sortKey="es_excepcion" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Medio" sortKey="medio_pago" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Estado" sortKey="estado_pago" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} />
                <SortTh label="Monto" sortKey="monto" sort={sort} onSort={(key) => setSort(prev => nextSortState(prev, key))} right />
              </tr>
            </thead>
            <tbody>
              {itemsPaginados.map(item => {
                const priority = paymentPriority(item)
                return (
                <tr key={`${item.origen}-${item.id}`} onClick={() => setSelected(item)} style={{ borderTop: "1px solid #f3f4f6", cursor: "pointer", background: selected?.id === item.id && selected?.origen === item.origen ? "#f0fdf4" : "#fff" }}>
                  <td style={td}><span style={{ color: priority.color, fontWeight: 800 }}>{priority.label}</span></td>
                  <td style={td}>{origenLabel[item.origen] || item.origen.toUpperCase()}</td>
                  <td style={td}>{item.documento}</td>
                  <td style={td}>{item.empresa || "—"}</td>
                  <td style={td}>{item.proyecto || "—"}</td>
                  <td style={td}>{item.beneficiario || "—"}</td>
                  <td style={td}>{fmtDate(item.fecha_necesidad_pago)}</td>
                  <td style={td}>{fmtDate(item.fecha_programada_pago)}</td>
                  <td style={td}>{fmtDate(item.fecha_pago)}</td>
                  <td style={td}>{item.condicion_comercial || "—"}</td>
                  <td style={td}>{item.es_excepcion ? <span title={item.motivo_excepcion || "Excepción de pago"} style={{ color: "#dc2626", fontWeight: 800 }}>🚩 Sí</span> : "—"}</td>
                  <td style={td}>{item.medio_pago || "—"}</td>
                  <td style={td}>
                    <span style={{ border: "1px solid #d1d5db", borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
                      {estadoLabel[item.estado_pago] || item.estado_pago}
                    </span>
                  </td>
                  <td style={tdRight}>{fmtMoney(item.monto)}</td>
                </tr>
              )})}

              {!loading && itemsOrdenados.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    No hay pagos para mostrar.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={14} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    Cargando pagos...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {!loading && itemsOrdenados.length > 0 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                Mostrando <strong>{desde}</strong> a <strong>{hasta}</strong> de <strong>{itemsOrdenados.length}</strong> pagos
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-secondary" style={{ fontSize: 12 }} disabled={paginaSegura <= 1} onClick={() => setPagina(prev => Math.max(1, prev - 1))}>← Anterior</button>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Página {paginaSegura} de {totalPaginas}</span>
                <button className="btn-secondary" style={{ fontSize: 12 }} disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}>Siguiente →</button>
              </div>
            </div>
          )}
          </div>

          {selected && (
            <aside style={{ borderLeft: "1px solid #e5e7eb", padding: 16, background: "#fff", display: "grid", alignContent: "start", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 800, textTransform: "uppercase" }}>{origenLabel[selected.origen] || selected.origen}</div>
                  <h3 style={{ margin: "4px 0 0", fontSize: 16, color: "#111827" }}>{selected.documento}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>x</button>
              </div>

              <DetailSection title="General">
                <DetailRow label="Empresa" value={selected.empresa || "—"} />
                <DetailRow label="Proyecto" value={selected.proyecto || "—"} />
                <DetailRow label="Beneficiario" value={selected.beneficiario || "—"} />
              </DetailSection>

              <DetailSection title="Fechas y pago">
                <DetailRow label="Fecha necesidad" value={fmtDate(selected.fecha_necesidad_pago)} />
                <DetailRow label="Fecha programada" value={fmtDate(selected.fecha_programada_pago)} />
                <DetailRow label="Fecha pago" value={fmtDate(selected.fecha_pago)} />
                <DetailRow label="Condición" value={selected.condicion_comercial || "—"} />
                <DetailRow label="Medio" value={selected.medio_pago || "—"} />
                <DetailRow label="Estado" value={estadoLabel[selected.estado_pago] || selected.estado_pago} />
                <DetailRow label="Monto" value={fmtMoney(selected.monto)} />
              </DetailSection>

              {selected.es_excepcion && (
                <div style={{ border: "1px solid #fecaca", borderRadius: 10, padding: 12, background: "#fef2f2" }}>
                  <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Excepción</div>
                  <div style={{ fontSize: 13, color: "#991b1b" }}>{selected.motivo_excepcion || "Sin motivo registrado"}</div>
                </div>
              )}

              <div style={{ border: "1px dashed #d1d5db", borderRadius: 10, padding: 12, color: "#6b7280", fontSize: 12 }}>
                Acciones bancarias avanzadas no disponibles sin soporte de base de datos.
              </div>
            </aside>
          )}
        </div>
      </section>
    </main>
  )
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "white",
  display: "grid",
  gap: 4,
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: 13,
  outline: "none",
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 11,
}

const thRight: React.CSSProperties = {
  ...th,
  textAlign: "right",
}

const td: React.CSSProperties = {
  padding: "11px 12px",
  color: "#374151",
}

const tdRight: React.CSSProperties = {
  ...td,
  textAlign: "right",
  fontWeight: 700,
}




