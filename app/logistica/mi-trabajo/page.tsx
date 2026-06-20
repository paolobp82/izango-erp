"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeAccederRuta } from "@/lib/permissions"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"

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

  useEffect(() => { load() }, [])

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

  const filtradas = tareas.filter(t => {
    if (filtroOrigen && t.origen !== filtroOrigen) return false
    if (filtroEstado && t.estado !== filtroEstado) return false
    return true
  })

  const pendientes = tareas.filter(t => ["borrador","pendiente","programado","aprobada","aprobado","en_proceso","en_transito"].includes(t.estado)).length
  const entregados = tareas.filter(t => ["entregado","ejecutada","cerrada","retornado"].includes(t.estado)).length
  const observados = tareas.filter(t => t.estado === "observado").length

  const inp: any = {
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 13,
    background: "#fff",
    fontFamily: "inherit",
    outline: "none",
  }

  if (loading) return <div style={{ padding: 24, color: "#6b7280" }}>Cargando...</div>
  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#0f172a" }}>Mi Trabajo Logística</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Vista consolidada de órdenes, envíos y traslados pendientes de atención.</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a href="/inventario/ordenes" className="btn-secondary" style={{ fontSize: 13, textDecoration: "none" }}>▤ Nueva orden</a>
          <a href="/envios-materiales" className="btn-secondary" style={{ fontSize: 13, textDecoration: "none" }}>✈ Nuevo envío</a>
          <a href="/logistica/traslados" className="btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>＋ Nuevo traslado</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="tasks" label="Total tareas" value={String(tareas.length)} sub="Órdenes, envíos y traslados" borderColor="#E2E8F0" valueColor="#0f172a" />
        <KpiCard icon="truck" label="Pendientes / tránsito" value={String(pendientes)} sub="Por atender" borderColor="#F59E0B" valueColor="#92400e" />
        <KpiCard icon="eye" label="En revisión / observadas" value={String(observados)} sub="Con incidencias" borderColor="#8B5CF6" valueColor="#6d28d9" />
        <KpiCard icon="check" label="Entregadas / cerradas" value={String(entregados)} sub="Finalizadas" borderColor="#10B981" valueColor="#15803d" />
      </div>

      <SectionCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <select style={{ ...inp, minWidth: 220 }} value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
            <option value="">Todos los orígenes</option>
            <option value="orden">Órdenes</option>
            <option value="envio">Envíos de materiales</option>
            <option value="traslado">Traslados y movimientos</option>
          </select>

          <select style={{ ...inp, minWidth: 220 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k,v]: any) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>ORIGEN</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>TAREA</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>DESTINO</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>CONTACTO</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>FECHA</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>ESTADO</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(t => {
                const e = ESTADOS[t.estado] || { label: t.estado, type: "pendiente" }
                return (
                  <tr key={t.origen + t.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{t.origenLabel}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#111827" }}>{t.titulo}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{t.destino}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{t.contacto}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#64748b" }}>{t.fecha ? String(t.fecha).slice(0,10) : "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <StatusBadge label={e.label} type={e.type} />
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <a href={t.href} className="btn-secondary" style={{ fontSize: 12, textDecoration: "none" }}>Abrir</a>
                    </td>
                  </tr>
                )
              })}

              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 46, textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>▱</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>No hay tareas logísticas con estos filtros</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Intenta cambiar los filtros o crea una nueva orden, envío o traslado.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}


