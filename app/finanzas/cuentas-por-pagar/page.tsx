"use client"
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type CxpItem = {
  id: string
  codigo_rq?: string | null
  numero_rq?: string | null
  proveedor_nombre?: string | null
  monto_solicitado?: number | null
  fecha_necesidad_pago?: string | null
  fecha_programada_pago?: string | null
  fecha_pago?: string | null
  condicion_comercial?: string | null
  medio_pago?: string | null
  estado?: string | null
  proyecto_id?: string | null
  proyecto_nombre?: string | null
  proyecto_codigo?: string | null
  proyecto?: { codigo?: string | null; nombre?: string | null; deleted_at?: string | null } | null
}

const PAGE_SIZE = 15

function ymd(value?: string | null) {
  return value ? String(value).slice(0, 10) : ""
}

function money(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function estadoPago(item: CxpItem) {
  if (["cancelado", "rechazado"].includes(String(item.estado || ""))) return "Anulado"
  if (ymd(item.fecha_pago)) return "Pagado"

  const fecha = ymd(item.fecha_programada_pago) || ymd(item.fecha_necesidad_pago)
  if (!fecha) return "Sin programar"

  const hoy = new Date().toISOString().slice(0, 10)
  if (fecha < hoy) return "Vencido"
  if (fecha === hoy) return "Vence hoy"

  return "Programado"
}

export default function CuentasPorPagarPage() {
  const supabase = createClient()
  const [items, setItems] = useState<CxpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("pendientes")
  const [page, setPage] = useState(1)

  async function load() {
    setLoading(true)
    setErrorMsg("")

    const { data, error } = await supabase
      .from("requerimientos_pago")
      .select(`
        id,
        codigo_rq,
        numero_rq,
        proveedor_nombre,
        monto_solicitado,
        fecha_necesidad_pago,
        fecha_programada_pago,
        fecha_pago,
        condicion_comercial,
        medio_pago,
        estado,
        proyecto_id,
        proyecto:proyectos(codigo,nombre,deleted_at)
      `)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      setErrorMsg(error.message)
      setItems([])
      setLoading(false)
      return
    }

    setItems(((data || []) as CxpItem[]).filter(item => !item.proyecto?.deleted_at))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()

    return items.filter(item => {
      const estado = estadoPago(item).toLowerCase()
      const matchEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "pendientes" && !["pagado", "anulado"].includes(estado)) ||
        estado === filtroEstado

      const texto = [
        item.codigo_rq,
        item.numero_rq,
        item.proveedor_nombre,
        item.proyecto_nombre,
        item.proyecto_codigo,
        item.condicion_comercial,
        item.medio_pago,
        item.estado,
      ].join(" ").toLowerCase()

      return matchEstado && (!q || texto.includes(q))
    })
  }, [items, busqueda, filtroEstado])

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginados = filtrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const desde = filtrados.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const hasta = Math.min(currentPage * PAGE_SIZE, filtrados.length)

  const resumen = useMemo(() => {
    const pendientes = filtrados.filter(i => !["Pagado", "Anulado"].includes(estadoPago(i)))
    const vencidos = filtrados.filter(i => estadoPago(i) === "Vencido")

    return {
      total: filtrados.length,
      pendientes: pendientes.length,
      vencidos: vencidos.length,
      montoPendiente: pendientes.reduce((sum, i) => sum + Number(i.monto_solicitado || 0), 0),
      montoVencido: vencidos.reduce((sum, i) => sum + Number(i.monto_solicitado || 0), 0),
    }
  }, [filtrados])

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div>
          <Link href="/finanzas/dashboard" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
            ← Dashboard Financiero
          </Link>
          <h1 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
            Cuentas por Pagar Comercial
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: 860 }}>
            Vista comercial de pagos originados por RQP. Muestra proveedor, proyecto, fechas críticas, estado y monto.
          </p>
        </div>

        <button onClick={load} disabled={loading} style={button}>
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
          Error cargando CxP Comercial: {errorMsg}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <div style={card}><strong>{resumen.total}</strong><span>Total registros</span></div>
        <div style={card}><strong>{resumen.pendientes}</strong><span>Pendientes</span></div>
        <div style={card}><strong>{resumen.vencidos}</strong><span>Vencidos</span></div>
        <div style={card}><strong>{money(resumen.montoPendiente)}</strong><span>Monto pendiente</span></div>
        <div style={card}><strong>{money(resumen.montoVencido)}</strong><span>Monto vencido</span></div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 190px", gap: 10 }}>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(1) }}
              placeholder="Buscar RQP, proveedor o proyecto..."
              style={input}
            />

            <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1) }} style={input}>
              <option value="pendientes">Pendientes</option>
              <option value="todos">Todos</option>
              <option value="sin programar">Sin programar</option>
              <option value="programado">Programado</option>
              <option value="vence hoy">Vence hoy</option>
              <option value="vencido">Vencido</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f9fafb", color: "#6b7280" }}>
              <tr>
                <th style={th}>RQP</th>
                <th style={th}>Proveedor</th>
                <th style={th}>Proyecto</th>
                <th style={th}>Condición</th>
                <th style={th}>Medio</th>
                <th style={th}>F. Necesidad</th>
                <th style={th}>F. Programada</th>
                <th style={th}>F. Pago</th>
                <th style={th}>Estado</th>
                <th style={thRight}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(item => (
                <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>{item.codigo_rq || item.numero_rq || item.id}</td>
                  <td style={td}>{item.proveedor_nombre || "—"}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{item.proyecto?.codigo || item.proyecto_codigo || "—"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{item.proyecto?.nombre || item.proyecto_nombre || (item.proyecto_id ? "Proyecto sin relación visible" : "Sin proyecto")}</div>
                  </td>
                  <td style={td}>{item.condicion_comercial || "—"}</td>
                  <td style={td}>{item.medio_pago || "—"}</td>
                  <td style={td}>{ymd(item.fecha_necesidad_pago) || "—"}</td>
                  <td style={td}>{ymd(item.fecha_programada_pago) || "—"}</td>
                  <td style={td}>{ymd(item.fecha_pago) || "—"}</td>
                  <td style={td}>{estadoPago(item)}</td>
                  <td style={tdRight}>{money(Number(item.monto_solicitado || 0))}</td>
                </tr>
              ))}

              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    No hay cuentas por pagar para mostrar.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={10} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    Cargando cuentas por pagar...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 14, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12, color: "#6b7280" }}>
          <span>Mostrando {desde}-{hasta} de {filtrados.length} registros</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} style={button}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} style={button}>Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  )
}

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "white",
  display: "grid",
  gap: 4,
}

const input: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: 13,
  outline: "none",
}

const button: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "white",
  borderRadius: 8,
  padding: "8px 11px",
  cursor: "pointer",
  fontSize: 13,
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 11,
  whiteSpace: "nowrap",
}

const thRight: CSSProperties = {
  ...th,
  textAlign: "right",
}

const td: CSSProperties = {
  padding: "11px 12px",
  color: "#374151",
  whiteSpace: "nowrap",
}

const tdRight: CSSProperties = {
  ...td,
  textAlign: "right",
  fontWeight: 700,
}

