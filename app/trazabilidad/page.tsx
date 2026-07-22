"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeVerInformacionSensible } from "@/lib/permissions"
import { nextSortState, sortIndicator, sortRows, type SortState } from "@/lib/table-sort"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2KpiCard,
  V2PageHeader,
  V2Pagination,
  V2SectionCard,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

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

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando trazabilidad y auditoría...
      </div>
    )
  }

  if (!autorizado) {
    return (
      <div style={{ padding: 32, color: "var(--v2-danger)", fontWeight: 700, fontSize: 13 }}>
        Acceso no autorizado
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "created_at",
      header: "Fecha / Hora",
      render: (r) => {
        const fecha = new Date(r.created_at)
        return (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--v2-text)" }}>{fecha.toLocaleDateString("es-PE")}</div>
            <div style={{ fontSize: 11, color: "var(--v2-muted)" }}>{fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
          </div>
        )
      },
    },
    {
      key: "usuario_nombre",
      header: "Usuario",
      render: (r) => <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>{r.usuario_nombre || "—"}</span>,
    },
    {
      key: "accion",
      header: "Acción",
      render: (r) => {
        const icon = ACCION_ICON[r.accion] || "•"
        return <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--v2-text)" }}>{icon} {r.accion}</span>
      },
    },
    {
      key: "modulo",
      header: "Módulo",
      render: (r) => {
        const mc = MODULO_COLOR[r.modulo] || { bg: "var(--v2-surface-subtle)", color: "var(--v2-muted)" }
        return (
          <span style={{ background: mc.bg, color: mc.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
            {r.modulo}
          </span>
        )
      },
    },
    {
      key: "descripcion",
      header: "Descripción",
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "var(--v2-muted)", maxWidth: 300, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.descripcion || r.entidad_label || "—"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (r) => (
        <V2Button variant="secondary" size="compact" onClick={() => setSelected(r)}>
          Ver
        </V2Button>
      ),
    },
  ]

  const totalPaginas = Math.ceil(totalRegistros / POR_PAGINA) || 1

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          eyebrow="Seguridad & Auditoría"
          title="Trazabilidad del Sistema"
          subtitle="Bitácora de eventos, modificaciones y acciones realizadas por usuarios en Izango SIG"
        />
      }
      summary={
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <V2KpiCard label="Total registros" value={String(totalRegistros || registros.length)} icon="file" />
          <V2KpiCard label="Usuarios activos" value={String(usuarios.length)} icon="shield" />
          <V2KpiCard label="Módulos registrados" value={String(modulos.length)} icon="folder" />
        </div>
      }
      toolbar={
        <V2FilterBar
          searchValue={busqueda}
          onSearchChange={setBusqueda}
          activeFiltersCount={(filtroModulo ? 1 : 0) + (filtroUsuario ? 1 : 0) + (filtroAccion ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0)}
          hideDrawerButton
          onToggleDrawer={() => {}}
          quickFilters={
            <>
              <div style={{ width: 160 }}>
                <V2Select
                  compact
                  value={filtroModulo}
                  onChange={(e) => setFiltroModulo(e.target.value)}
                  options={[
                    { label: "Todos los módulos", value: "" },
                    ...modulos.map((m) => ({ label: m, value: m })),
                  ]}
                />
              </div>
              <div style={{ width: 160 }}>
                <V2Select
                  compact
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  options={[
                    { label: "Todos los usuarios", value: "" },
                    ...usuarios.map((u) => ({ label: u, value: u })),
                  ]}
                />
              </div>
              <div style={{ width: 160 }}>
                <V2Select
                  compact
                  value={filtroAccion}
                  onChange={(e) => setFiltroAccion(e.target.value)}
                  options={[
                    { label: "Todas las acciones", value: "" },
                    ...[...new Set(registros.map((r) => r.accion))].map((a) => ({ label: a, value: a })),
                  ]}
                />
              </div>
            </>
          }
          showClearButton={Boolean(filtroModulo || filtroUsuario || filtroAccion || busqueda || fechaDesde || fechaHasta)}
          onClearFilters={() => {
            setFiltroModulo("")
            setFiltroUsuario("")
            setFiltroAccion("")
            setBusqueda("")
            setFechaDesde("")
            setFechaHasta("")
          }}
        />
      }
      table={
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16 }}>
            <V2DataTable
              columns={columns}
              rows={filtradosOrdenados}
              getRowKey={(r) => r.id}
              empty={
                <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                  No hay registros de trazabilidad con los filtros aplicados.
                </div>
              }
            />

            {selected && (
              <V2SectionCard title="Detalle del registro">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>ID: {String(selected.id).slice(0, 8)}…</h4>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--v2-muted)", fontSize: 18 }}>×</button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Fecha y hora</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{new Date(selected.created_at).toLocaleString("es-PE")}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Usuario</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>{selected.usuario_nombre || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Acción</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{ACCION_ICON[selected.accion] || "•"} {selected.accion}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Módulo</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-text)", textTransform: "capitalize" }}>{selected.modulo}</div>
                  </div>
                  {selected.entidad_tipo && (
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Entidad</div>
                      <div style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{selected.entidad_tipo}</div>
                      {selected.entidad_label && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)" }}>{selected.entidad_label}</div>}
                    </div>
                  )}
                  {selected.descripcion && (
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Descripción</div>
                      <div style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{selected.descripcion}</div>
                    </div>
                  )}
                  {selected.datos_nuevos && (
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>Datos nuevos</div>
                      <pre style={{ fontSize: 11, color: "var(--v2-text)", background: "var(--v2-surface-subtle)", borderRadius: "var(--v2-radius)", padding: "8px 10px", overflow: "auto", maxHeight: 140, margin: 0, border: "1px solid var(--v2-border)" }}>
                        {JSON.stringify(JSON.parse(selected.datos_nuevos || "{}"), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </V2SectionCard>
            )}
          </div>

          {totalRegistros > POR_PAGINA && (
            <V2Pagination
              page={pagina + 1}
              pageCount={totalPaginas}
              onPageChange={(p) => setPagina(p - 1)}
              summary={`Mostrando ${(pagina * POR_PAGINA) + 1} - ${Math.min((pagina + 1) * POR_PAGINA, totalRegistros)} de ${totalRegistros} registros`}
            />
          )}
        </div>
      }
    />
  )
}
