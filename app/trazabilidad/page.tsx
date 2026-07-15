"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import StatusBadge from "@/components/ui/StatusBadge"
import { puedeVerInformacionSensible } from "@/lib/permissions"
import { nextSortState, sortIndicator, sortRows, type SortState } from "@/lib/table-sort"

const MODULO_COLOR: Record<string, any> = {
  proyectos:    { bg: "#dbeafe", color: "#1e40af" },
  cotizaciones: { bg: "#f5f3ff", color: "#6d28d9" },
  rq:           { bg: "#fef9c3", color: "#92400e" },
  liquidaciones:{ bg: "#fed7aa", color: "#9a3412" },
  facturacion:  { bg: "#dcfce7", color: "#15803d" },
  clientes:     { bg: "#f0fdf4", color: "#166534" },
  proveedores:  { bg: "#fce7f3", color: "#9d174d" },
  crm:          { bg: "#e0f2fe", color: "#0369a1" },
  biblioteca:   { bg: "#fef3c7", color: "#d97706" },
  auth:         { bg: "#f3f4f6", color: "#6b7280" },
}

const ACCION_ICON: Record<string, string> = {
  crear: "✚",
  editar: "✎",
  eliminar: "✕",
  aprobar: "✓",
  rechazar: "✗",
  cambiar_estado: "⟳",
  login: "→",
  logout: "←",
  enviar: "↗",
  pagar: "💳",
}


export default function TrazabilidadPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [filtroModulo, setFiltroModulo] = useState("")
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroAccion, setFiltroAccion] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [selected, setSelected] = useState<any>(null)
  const [usuarios, setUsuarios] = useState<string[]>([])
  const [modulos, setModulos] = useState<string[]>([])
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [pagina, setPagina] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [sort, setSort] = useState<SortState>({ key: "created_at", direction: "desc" })
  const POR_PAGINA = 50

  useEffect(() => { load() }, [pagina, filtroModulo, filtroUsuario, filtroAccion, fechaDesde, fechaHasta])

  useEffect(() => { setPagina(0) }, [filtroModulo, filtroUsuario, filtroAccion, fechaDesde, fechaHasta, busqueda, sort])

  async function resolverEntidades(rows: any[]) {
    const idsPorTipo = new Map<string, Set<string>>()
    rows.forEach(row => {
      if (!row.entidad_tipo || !row.entidad_id) return
      const tipo = String(row.entidad_tipo)
      if (!idsPorTipo.has(tipo)) idsPorTipo.set(tipo, new Set())
      idsPorTipo.get(tipo)?.add(String(row.entidad_id))
    })

    const labels = new Map<string, string>()
    const put = (tipo: string, id: string, label: string) => labels.set(`${tipo}:${id}`, label)
    const ids = (tipo: string) => Array.from(idsPorTipo.get(tipo) || [])

    await Promise.all([
      ids("proyecto").length ? supabase.from("proyectos").select("id,codigo,nombre").in("id", ids("proyecto")).then(({ data, error }) => { if (error) console.error("Trazabilidad proyectos", error); (data || []).forEach((p: any) => put("proyecto", p.id, `${p.codigo || "Proyecto"} — ${p.nombre || "Sin nombre"}`)) }) : Promise.resolve(),
      ids("cliente").length ? supabase.from("clientes").select("id,razon_social,ruc").in("id", ids("cliente")).then(({ data, error }) => { if (error) console.error("Trazabilidad clientes", error); (data || []).forEach((c: any) => put("cliente", c.id, `${c.razon_social || "Cliente"}${c.ruc ? ` — ${c.ruc}` : ""}`)) }) : Promise.resolve(),
      ids("cotizacion").length ? supabase.from("cotizaciones").select("id,version,proyecto:proyectos!cotizaciones_proyecto_id_fkey(codigo,nombre)").in("id", ids("cotizacion")).then(({ data, error }) => { if (error) console.error("Trazabilidad cotizaciones", error); (data || []).forEach((c: any) => put("cotizacion", c.id, `${c.proyecto?.codigo || "Cotización"} — V${c.version || "-"}`)) }) : Promise.resolve(),
      ids("rq").length ? supabase.from("requerimientos_pago").select("id,codigo_rq,numero_rq,descripcion").in("id", ids("rq")).then(({ data, error }) => { if (error) console.error("Trazabilidad RQ", error); (data || []).forEach((rq: any) => put("rq", rq.id, `${rq.codigo_rq || rq.numero_rq || "RQ"} — ${rq.descripcion || "Sin descripción"}`)) }) : Promise.resolve(),
      ids("factura").length ? supabase.from("facturas").select("id,numero_factura").in("id", ids("factura")).then(({ data, error }) => { if (error) console.error("Trazabilidad facturas", error); (data || []).forEach((f: any) => put("factura", f.id, f.numero_factura || "Factura")) }) : Promise.resolve(),
      ids("liquidacion").length ? supabase.from("liquidaciones").select("id,proyecto:proyectos(codigo,nombre)").in("id", ids("liquidacion")).then(({ data, error }) => { if (error) console.error("Trazabilidad liquidaciones", error); (data || []).forEach((l: any) => put("liquidacion", l.id, `Liquidación — ${l.proyecto?.codigo || l.id.slice(0, 8)}`)) }) : Promise.resolve(),
      ids("trabajador").length ? supabase.from("rrhh_trabajadores").select("id,nombre,apellido,dni").in("id", ids("trabajador")).then(({ data, error }) => { if (error) console.error("Trazabilidad trabajadores", error); (data || []).forEach((t: any) => put("trabajador", t.id, `${t.nombre || ""} ${t.apellido || ""}`.trim() || t.dni || "Trabajador")) }) : Promise.resolve(),
      ids("perfil").length ? supabase.from("perfiles").select("id,nombre,apellido,perfil").in("id", ids("perfil")).then(({ data, error }) => { if (error) console.error("Trazabilidad perfiles", error); (data || []).forEach((p: any) => put("perfil", p.id, `${p.nombre || ""} ${p.apellido || ""}`.trim() || p.perfil || "Usuario")) }) : Promise.resolve(),
      ids("proveedor").length ? supabase.from("proveedores").select("id,nombre").in("id", ids("proveedor")).then(({ data, error }) => { if (error) console.error("Trazabilidad proveedores", error); (data || []).forEach((p: any) => put("proveedor", p.id, p.nombre || "Proveedor")) }) : Promise.resolve(),
      ids("lead").length ? supabase.from("crm_leads").select("id,razon_social").in("id", ids("lead")).then(({ data, error }) => { if (error) console.error("Trazabilidad CRM", error); (data || []).forEach((l: any) => put("lead", l.id, l.razon_social || "Lead CRM")) }) : Promise.resolve(),
      ids("tarea").length ? supabase.from("tareas").select("id,titulo").in("id", ids("tarea")).then(({ data, error }) => { if (error) console.error("Trazabilidad tareas", error); (data || []).forEach((t: any) => put("tarea", t.id, t.titulo || "Tarea")) }) : Promise.resolve(),
      ids("caja_chica").length ? supabase.from("caja_chica").select("id,concepto").in("id", ids("caja_chica")).then(({ data, error }) => { if (error) console.error("Trazabilidad caja chica", error); (data || []).forEach((c: any) => put("caja_chica", c.id, c.concepto || "Caja chica")) }) : Promise.resolve(),
      ids("gasto_oficina").length ? supabase.from("gastos_oficina").select("id,descripcion").in("id", ids("gasto_oficina")).then(({ data, error }) => { if (error) console.error("Trazabilidad gastos oficina", error); (data || []).forEach((g: any) => put("gasto_oficina", g.id, g.descripcion || "Gasto de oficina")) }) : Promise.resolve(),
    ])

    return rows.map(row => ({
      ...row,
      entidad_label: row.entidad_tipo && row.entidad_id ? labels.get(`${row.entidad_tipo}:${row.entidad_id}`) || null : null,
    }))
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeVerInformacionSensible(p?.perfil)
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    let query = supabase
      .from("trazabilidad")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
    if (filtroModulo) query = query.eq("modulo", filtroModulo)
    if (filtroUsuario) query = query.eq("usuario_nombre", filtroUsuario)
    if (filtroAccion) query = query.eq("accion", filtroAccion)
    if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`)
    if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`)
    const { data, count, error } = await query.range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (error) console.error("Error cargando trazabilidad:", error)
    const registrosLegibles = await resolverEntidades(data || [])
    setRegistros(registrosLegibles)
    setTotalRegistros(count || 0)
    const us = [...new Set((data || []).map((r: any) => r.usuario_nombre).filter(Boolean))]
    const ms = [...new Set((data || []).map((r: any) => r.modulo).filter(Boolean))]
    setUsuarios(us as string[])
    setModulos(ms as string[])
    setLoading(false)
  }
  const filtrados = registros.filter(r => {
    if (filtroModulo && r.modulo !== filtroModulo) return false
    if (filtroUsuario && r.usuario_nombre !== filtroUsuario) return false
    if (filtroAccion && r.accion !== filtroAccion) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!r.descripcion?.toLowerCase().includes(q) && !r.usuario_nombre?.toLowerCase().includes(q) && !r.modulo?.toLowerCase().includes(q)) return false
    }
    return true
  })
  const filtradosOrdenados = sortRows(filtrados, sort, (row, key) => key === "entidad" ? (row.entidad_label || row.entidad_id) : row[key])

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none" }
  const thSort = (label: string, key: string) => (
    <button onClick={() => setSort(prev => nextSortState(prev, key))} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", color: "inherit", font: "inherit", fontWeight: 600 }}>
      {label} <span style={{ color: sort.key === key ? "#0F6E56" : "#9ca3af" }}>{sortIndicator(sort, key)}</span>
    </button>
  )

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Trazabilidad</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Registro de acciones de usuarios en el sistema</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
  <KpiCard
    label="TOTAL REGISTROS"
    value={String(totalRegistros || registros.length)}
    sub="Acciones recientes"
    icon="file"
    borderColor="#0F6E56"
    valueColor="#0F6E56"
  />

  <KpiCard
    label="USUARIOS ACTIVOS"
    value={String(usuarios.length)}
    sub="Con actividad"
    icon="shield"
    borderColor="#2563EB"
    valueColor="#1E40AF"
  />

  <KpiCard
    label="MÓDULOS REGISTRADOS"
    value={String(modulos.length)}
    sub="Áreas auditadas"
    icon="folder"
    borderColor="#D97706"
    valueColor="#B45309"
  />
</div>

      <div className="card" style={{ marginBottom: 12, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, width: 220 }} placeholder="Buscar en registros..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={{ ...inp, width: "auto" }} value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}>
            <option value="">Todos los modulos</option>
            {modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {[...new Set(registros.map(r => r.accion))].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" style={inp} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          <input type="date" style={inp} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          {(filtroModulo || filtroUsuario || filtroAccion || busqueda || fechaDesde || fechaHasta) && (
            <button onClick={() => { setFiltroModulo(""); setFiltroUsuario(""); setFiltroAccion(""); setBusqueda(""); setFechaDesde(""); setFechaHasta("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Limpiar</button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtradosOrdenados.length} registros</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
          {filtradosOrdenados.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              No hay registros de trazabilidad aún. Las acciones se irán registrando automáticamente.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{thSort("FECHA / HORA", "created_at")}</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{thSort("USUARIO", "usuario_nombre")}</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{thSort("ACCION", "accion")}</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{thSort("MODULO", "modulo")}</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{thSort("DESCRIPCION", "descripcion")}</th>
                  <th style={{ padding: "10px 20px", width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtradosOrdenados.map((r, idx) => {
                  const mc = MODULO_COLOR[r.modulo] || { bg: "#f3f4f6", color: "#6b7280" }
                  const icon = ACCION_ICON[r.accion] || "•"
                  const fecha = new Date(r.created_at)
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid #F1F5F9", background: selected?.id === r.id ? "#F0FDF4" : "#FFFFFF", cursor: "pointer" }}
                      onClick={() => setSelected(r)}>
                      <td style={{ padding: "10px 20px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{fecha.toLocaleDateString("es-PE")}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.usuario_nombre || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{icon} {r.accion}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: mc.bg, color: mc.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{r.modulo}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.descripcion || r.entidad_label || "—"}
                      </td>
                      <td style={{ padding: "10px 20px", textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); setSelected(r) }}
                          style={{ fontSize: 11, padding: "5px 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: "#334155", fontWeight: 700 }}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {(totalRegistros > POR_PAGINA || pagina > 0) && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
              <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} className="btn-secondary" style={{ fontSize: 12 }}>← Anterior</button>
              <span style={{ fontSize: 12, color: "#6b7280", padding: "4px 8px" }}>Página {pagina + 1} · {Math.min((pagina + 1) * POR_PAGINA, totalRegistros)} de {totalRegistros}</span>
              <button disabled={(pagina + 1) * POR_PAGINA >= totalRegistros} onClick={() => setPagina(p => p + 1)} className="btn-secondary" style={{ fontSize: 12 }}>Siguiente →</button>
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={{ alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#111827" }}>Detalle del registro</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Fecha y hora</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{new Date(selected.created_at).toLocaleString("es-PE")}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Usuario</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.usuario_nombre || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Accion</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{ACCION_ICON[selected.accion] || "•"} {selected.accion}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Modulo</div>
                <div style={{ fontSize: 13, color: "#374151", textTransform: "capitalize" }}>{selected.modulo}</div>
              </div>
              {selected.entidad_tipo && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Entidad</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{selected.entidad_tipo}</div>
                  {selected.entidad_label && <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{selected.entidad_label}</div>}
                  {selected.entidad_id && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>ID interno: {String(selected.entidad_id).slice(0, 8)}…</div>}
                </div>
              )}
              {selected.descripcion && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Descripcion</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion}</div>
                </div>
              )}
              {selected.datos_nuevos && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Datos nuevos</div>
                  <pre style={{ fontSize: 11, color: "#374151", background: "#f9fafb", borderRadius: 6, padding: "8px 10px", overflow: "auto", maxHeight: 150, margin: 0 }}>
                    {JSON.stringify(JSON.parse(selected.datos_nuevos || "{}"), null, 2)}
                  </pre>
                </div>
              )}
              {selected.datos_anteriores && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Datos anteriores</div>
                  <pre style={{ fontSize: 11, color: "#374151", background: "#fef9c3", borderRadius: 6, padding: "8px 10px", overflow: "auto", maxHeight: 150, margin: 0 }}>
                    {JSON.stringify(JSON.parse(selected.datos_anteriores || "{}"), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



