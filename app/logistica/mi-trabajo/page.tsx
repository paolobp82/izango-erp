"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeAccederRuta } from "@/lib/permissions"
import StatusBadge from "@/components/ui/StatusBadge"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2KpiCard,
  V2PageHeader,
  V2SectionCard,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const ESTADOS: Record<string, any> = {
  borrador: { label: "Borrador", type: "pendiente" },
  pendiente: { label: "Pendiente", type: "pendiente" },
  programado: { label: "Programado", type: "programado" },
  aprobada: { label: "Aprobada", type: "aprobado" },
  aprobado: { label: "Aprobado", type: "aprobado" },
  en_proceso: { label: "En proceso", type: "en_progreso" },
  en_transito: { label: "En tránsito", type: "en_progreso" },
  ejecutada: { label: "Ejecutada", type: "completado" },
  entregado: { label: "Entregado", type: "completado" },
  retornado: { label: "Retornado", type: "completado" },
  observado: { label: "Observado", type: "revision" },
  cerrada: { label: "Cerrada", type: "completado" },
  cancelada: { label: "Cancelada", type: "cancelado" },
  cancelado: { label: "Cancelado", type: "cancelado" },
}

export default function MiTrabajoLogisticaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [tareas, setTareas] = useState<any[]>([])
  const [filtroOrigen, setFiltroOrigen] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    const puedeVer = puedeAccederRuta(perfil?.perfil, "/logistica/mi-trabajo")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const [{ data: ordenes }, { data: envios }, { data: traslados }] = await Promise.all([
      supabase
        .from("inventario_ordenes")
        .select("id,tipo,estado,fecha_entrega,created_at,direccion_destino,contacto_receptor,proyecto:proyectos(nombre,codigo,deleted_at)")
        .order("created_at", { ascending: false }),
      supabase
        .from("envios_materiales")
        .select("id,tipo,estado,fecha_salida,fecha_entrega_estimada,created_at,direccion_destino,contacto_receptor,proyecto:proyectos(nombre,codigo,deleted_at)")
        .order("created_at", { ascending: false }),
      supabase
        .from("logistica_traslados")
        .select("id,codigo,titulo,estado,fecha_salida,fecha_entrega,created_at,punto_recojo,punto_entrega,contacto_receptor,proyecto:proyectos(nombre,codigo,deleted_at)")
        .order("created_at", { ascending: false }),
    ])

    const rows: any[] = []

    ;(ordenes || []).forEach((o:any) => {
      if (o.proyecto?.deleted_at) return
      rows.push({
        id: o.id,
        origen: "orden",
        origenLabel: "Orden Inventario",
        titulo: `${o.tipo || "Orden"}${o.proyecto ? " · " + o.proyecto.codigo : ""}`,
        estado: o.estado,
        fecha: o.fecha_entrega || o.created_at,
        destino: o.direccion_destino || "—",
        contacto: o.contacto_receptor || "—",
        href: "/inventario/ordenes",
      })
    })

    ;(envios || []).forEach((e:any) => {
      if (e.proyecto?.deleted_at) return
      rows.push({
        id: e.id,
        origen: "envio",
        origenLabel: "Envío Materiales",
        titulo: `${e.tipo || "Envío"}${e.proyecto ? " · " + e.proyecto.codigo : ""}`,
        estado: e.estado,
        fecha: e.fecha_salida || e.fecha_entrega_estimada || e.created_at,
        destino: e.direccion_destino || "—",
        contacto: e.contacto_receptor || "—",
        href: "/envios-materiales",
      })
    })

    ;(traslados || []).forEach((t:any) => {
      if (t.proyecto?.deleted_at) return
      rows.push({
        id: t.id,
        origen: "traslado",
        origenLabel: "Traslado / Movimiento",
        titulo: `${t.codigo || ""} · ${t.titulo || ""}`,
        estado: t.estado,
        fecha: t.fecha_salida || t.fecha_entrega || t.created_at,
        destino: t.punto_entrega || "—",
        contacto: t.contacto_receptor || "—",
        href: "/logistica/traslados",
      })
    })

    rows.sort((a,b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    setTareas(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtradas = tareas.filter(t => {
    if (filtroOrigen && t.origen !== filtroOrigen) return false
    if (filtroEstado && t.estado !== filtroEstado) return false
    return true
  })

  const pendientes = tareas.filter(t => ["borrador","pendiente","programado","aprobada","aprobado","en_proceso","en_transito"].includes(t.estado)).length
  const entregados = tareas.filter(t => ["entregado","ejecutada","cerrada","retornado"].includes(t.estado)).length
  const observados = tareas.filter(t => t.estado === "observado").length

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando trabajo logístico...
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
      key: "origen",
      header: "Origen",
      render: (t) => <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--v2-text)" }}>{t.origenLabel}</span>,
    },
    {
      key: "titulo",
      header: "Tarea",
      render: (t) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{t.titulo}</span>,
    },
    {
      key: "destino",
      header: "Destino",
      render: (t) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{t.destino}</span>,
    },
    {
      key: "contacto",
      header: "Contacto",
      render: (t) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{t.contacto}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (t) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{t.fecha ? String(t.fecha).slice(0, 10) : "—"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (t) => {
        const e = ESTADOS[t.estado] || { label: t.estado, type: "pendiente" }
        return <StatusBadge label={e.label} type={e.type} />
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (t) => (
        <a href={t.href} style={{ textDecoration: "none" }}>
          <V2Button variant="secondary" size="compact">
            Abrir
          </V2Button>
        </a>
      ),
    },
  ]

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          eyebrow="Logística"
          title="Mi Trabajo Logística"
          subtitle="Vista consolidada de órdenes, envíos y traslados pendientes de atención"
          actions={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="/inventario/ordenes" style={{ textDecoration: "none" }}>
                <V2Button variant="secondary">Nueva orden</V2Button>
              </a>
              <a href="/envios-materiales" style={{ textDecoration: "none" }}>
                <V2Button variant="secondary">Nuevo envío</V2Button>
              </a>
              <a href="/logistica/traslados" style={{ textDecoration: "none" }}>
                <V2Button variant="primary">+ Nuevo traslado</V2Button>
              </a>
            </div>
          }
        />
      }
      summary={
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <V2KpiCard label="Total tareas" value={String(tareas.length)} icon="folder" />
          <V2KpiCard label="Pendientes / tránsito" value={String(pendientes)} icon="chart" />
          <V2KpiCard label="En revisión / observadas" value={String(observados)} icon="file" />
          <V2KpiCard label="Entregadas / cerradas" value={String(entregados)} icon="shield" />
        </div>
      }
      toolbar={
        <V2FilterBar
          searchValue=""
          onSearchChange={() => {}}
          activeFiltersCount={(filtroOrigen ? 1 : 0) + (filtroEstado ? 1 : 0)}
          hideDrawerButton
          onToggleDrawer={() => {}}
          quickFilters={
            <>
              <div style={{ width: 220 }}>
                <V2Select
                  compact
                  value={filtroOrigen}
                  onChange={(e) => setFiltroOrigen(e.target.value)}
                  options={[
                    { label: "Todos los orígenes", value: "" },
                    { label: "Órdenes", value: "orden" },
                    { label: "Envíos de materiales", value: "envio" },
                    { label: "Traslados y movimientos", value: "traslado" },
                  ]}
                />
              </div>
              <div style={{ width: 200 }}>
                <V2Select
                  compact
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  options={[
                    { label: "Todos los estados", value: "" },
                    ...Object.entries(ESTADOS).map(([k, v]: any) => ({ label: v.label, value: k })),
                  ]}
                />
              </div>
            </>
          }
          showClearButton={Boolean(filtroOrigen || filtroEstado)}
          onClearFilters={() => {
            setFiltroOrigen("")
            setFiltroEstado("")
          }}
        />
      }
      table={
        <div style={{ display: "grid", gap: 20 }}>
          <V2DataTable
            columns={columns}
            rows={filtradas}
            getRowKey={(t) => t.origen + t.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay tareas logísticas con estos filtros.
              </div>
            }
          />

          <V2SectionCard title="Accesos rápidos">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 12 }}>
              <div style={{ padding: 16, borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)", background: "var(--v2-surface-subtle)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px", color: "var(--v2-text)" }}>Órdenes de Inventario</h3>
                <p style={{ fontSize: 12.5, color: "var(--v2-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
                  Crea y gestiona órdenes de salida, ingreso, devolución y traslado.
                </p>
                <a href="/inventario/ordenes" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--v2-brand)", textDecoration: "none" }}>
                  Ir a órdenes →
                </a>
              </div>

              <div style={{ padding: 16, borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)", background: "var(--v2-surface-subtle)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px", color: "var(--v2-text)" }}>Envíos de Materiales</h3>
                <p style={{ fontSize: 12.5, color: "var(--v2-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
                  Gestiona envíos, retornos, entregas y seguimiento de materiales.
                </p>
                <a href="/envios-materiales" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--v2-brand)", textDecoration: "none" }}>
                  Ir a envíos →
                </a>
              </div>

              <div style={{ padding: 16, borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)", background: "var(--v2-surface-subtle)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px", color: "var(--v2-text)" }}>Traslados y Movimientos</h3>
                <p style={{ fontSize: 12.5, color: "var(--v2-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
                  Registra movimientos menores entre puntos, con o sin proyecto.
                </p>
                <a href="/logistica/traslados" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--v2-brand)", textDecoration: "none" }}>
                  Ir a traslados →
                </a>
              </div>
            </div>
          </V2SectionCard>
        </div>
      }
    />
  )
}
