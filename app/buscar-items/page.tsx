"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { buscarItemsCotizados } from "@/lib/quote-item-search"

const ESTADOS: Record<string, { label: string; bg: string; color: string }> = {
  borrador: { label: "Borrador", bg: "#f3f4f6", color: "#374151" },
  enviada_cliente: { label: "Enviada", bg: "#dbeafe", color: "#1e40af" },
  aprobada_cliente: { label: "Aprobada", bg: "#dcfce7", color: "#15803d" },
  rechazada: { label: "Rechazada", bg: "#fee2e2", color: "#991b1b" },
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
}

export default function BuscarItemsCotizadosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [loadError, setLoadError] = useState("")
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 50

  useEffect(() => { load() }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroProyecto, filtroCliente, filtroEstado])

  async function load() {
    setLoading(true)
    setLoadError("")
    const { data, error } = await buscarItemsCotizados(supabase, { limit: 500 })
    if (error) {
      console.error("Error cargando items de cotizacion:", error.message)
      setLoadError(error.message || "No se pudieron cargar los ítems cotizados.")
    }
    setItems(data || [])
    setLoading(false)
  }

  const proyectos = useMemo(() => {
    const map = new Map<string, any>()
    items.forEach(item => {
      const proy = item.cotizacion?.proyecto
      if (proy?.id) map.set(proy.id, proy)
    })
    return Array.from(map.values()).sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || "")))
  }, [items])

  const clientes = useMemo(() => {
    const map = new Map<string, any>()
    items.forEach(item => {
      const cliente = item.cotizacion?.proyecto?.cliente
      if (cliente?.id) map.set(cliente.id, cliente)
    })
    return Array.from(map.values()).sort((a, b) => String(a.razon_social || "").localeCompare(String(b.razon_social || "")))
  }, [items])

  const filtrados = items.filter(item => {
    const cot = item.cotizacion
    const proy = cot?.proyecto
    const cliente = proy?.cliente
    if (filtroProyecto && proy?.id !== filtroProyecto) return false
    if (filtroCliente && cliente?.id !== filtroCliente) return false
    if (filtroEstado && cot?.estado !== filtroEstado) return false
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      const coincide = [
        item.descripcion,
        proy?.codigo,
        proy?.nombre,
        cliente?.razon_social,
        cot?.version ? `v${cot.version}` : "",
      ].some(valor => String(valor || "").toLowerCase().includes(q))
      if (!coincide) return false
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itemsPorPagina))
  const paginaSegura = Math.min(paginaActual, totalPaginas)
  const indiceInicio = (paginaSegura - 1) * itemsPorPagina
  const indiceFin = indiceInicio + itemsPorPagina
  const itemsPaginados = filtrados.slice(indiceInicio, indiceFin)
  const desde = filtrados.length === 0 ? 0 : indiceInicio + 1
  const hasta = Math.min(indiceFin, filtrados.length)

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando búsqueda de ítems...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Buscar ítems cotizados</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{filtrados.length} resultados · Mostrando {desde}-{hasta} · {items.length} ítems revisados</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <input style={inp} placeholder="Buscar por ítem, proyecto, cliente o versión..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={inp} value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {proyectos.map(proy => <option key={proy.id} value={proy.id}>{proy.codigo} - {proy.nombre}</option>)}
          </select>
          <select style={inp} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.razon_social}</option>)}
          </select>
          <select style={inp} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, estado]) => <option key={key} value={key}>{estado.label}</option>)}
          </select>
          {(busqueda || filtroProyecto || filtroCliente || filtroEstado) && (
            <button onClick={() => { setBusqueda(""); setFiltroProyecto(""); setFiltroCliente(""); setFiltroEstado("") }} className="btn-secondary" style={{ fontSize: 12 }}>Limpiar</button>
          )}
        </div>
      </div>

      {loadError && (
        <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          No se pudo cargar la búsqueda de ítems: {loadError}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>ÍTEM</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>PROYECTO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>CLIENTE</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>PROFORMA</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>PRECIO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>FECHA</th>
              <th style={{ padding: "10px 20px", width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No se encontraron ítems cotizados</td></tr>
            ) : itemsPaginados.map((item, idx) => {
              const cot = item.cotizacion
              const proy = cot?.proyecto
              const cliente = proy?.cliente
              const estado = ESTADOS[cot?.estado] || { label: cot?.estado || "Sin estado", bg: "#f3f4f6", color: "#6b7280" }
              const href = cot?.proyecto_id && cot?.id ? `/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}` : ""
              return (
                <tr key={item.id} onClick={() => href && router.push(href)} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa", cursor: href ? "pointer" : "default" }}>
                  <td style={{ padding: "12px 20px", fontSize: 13, color: "#111827", fontWeight: 600 }}>{item.descripcion || "Sin descripción"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>
                    <div style={{ fontWeight: 700 }}>{proy?.codigo || "—"}</div>
                    <div style={{ color: "#6b7280" }}>{proy?.nombre || "Sin proyecto"}</div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>{cliente?.razon_social || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>V{cot?.version || "?"}</div>
                    <span style={{ background: estado.bg, color: estado.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{estado.label}</span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 13, color: "#0F6E56", fontWeight: 700 }}>{fmt(item.precio_cliente)}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{cot?.created_at ? new Date(cot.created_at).toLocaleDateString("es-PE") : item.created_at ? new Date(item.created_at).toLocaleDateString("es-PE") : "—"}</td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    {href && <button onClick={e => { e.stopPropagation(); router.push(href) }} className="btn-secondary" style={{ fontSize: 12 }}>Abrir</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtrados.length > itemsPorPagina && (
        <div className="card" style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Mostrando <strong>{desde}</strong> a <strong>{hasta}</strong> de <strong>{filtrados.length}</strong> ítems
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn-secondary"
              style={{ fontSize: 12 }}
              disabled={paginaSegura <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>

            <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>
              Página {paginaSegura} de {totalPaginas}
            </span>

            <button
              className="btn-secondary"
              style={{ fontSize: 12 }}
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

