"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeAccederRuta } from "@/lib/permissions"

const ESTADOS: Record<string, any> = {
  borrador: { label: "Borrador", bg: "#f3f4f6", color: "#6b7280" },
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  programado: { label: "Programado", bg: "#dbeafe", color: "#1e40af" },
  aprobada: { label: "Aprobada", bg: "#dbeafe", color: "#1e40af" },
  aprobado: { label: "Aprobado", bg: "#dbeafe", color: "#1e40af" },
  en_proceso: { label: "En proceso", bg: "#e0f2fe", color: "#0369a1" },
  en_transito: { label: "En tránsito", bg: "#fef9c3", color: "#92400e" },
  ejecutada: { label: "Ejecutada", bg: "#dcfce7", color: "#15803d" },
  entregado: { label: "Entregado", bg: "#dcfce7", color: "#15803d" },
  retornado: { label: "Retornado", bg: "#f5f3ff", color: "#6d28d9" },
  observado: { label: "Observado", bg: "#fed7aa", color: "#9a3412" },
  cerrada: { label: "Cerrada", bg: "#e5e7eb", color: "#374151" },
  cancelada: { label: "Cancelada", bg: "#fee2e2", color: "#991b1b" },
  cancelado: { label: "Cancelado", bg: "#fee2e2", color: "#991b1b" },
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
        titulo: `${o.tipo || "Orden"} ${o.proyecto ? "· " + o.proyecto.codigo : ""}`,
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
        titulo: `${e.tipo || "Envío"} ${e.proyecto ? "· " + e.proyecto.codigo : ""}`,
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

  const inp: any = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff" }

  if (loading) return <div style={{ padding: 24, color: "#6b7280" }}>Cargando...</div>
  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111827" }}>Mi Trabajo Logística</h1>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Vista consolidada de órdenes, envíos y traslados pendientes de atención.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 18 }}>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:16 }}><div style={{ fontSize:12, color:"#64748b" }}>Total tareas</div><div style={{ fontSize:26, fontWeight:800 }}>{tareas.length}</div></div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:16 }}><div style={{ fontSize:12, color:"#64748b" }}>Pendientes / tránsito</div><div style={{ fontSize:26, fontWeight:800, color:"#92400e" }}>{pendientes}</div></div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:16 }}><div style={{ fontSize:12, color:"#64748b" }}>Entregadas / cerradas</div><div style={{ fontSize:26, fontWeight:800, color:"#15803d" }}>{entregados}</div></div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:16 }}><div style={{ fontSize:12, color:"#64748b" }}>Observadas</div><div style={{ fontSize:26, fontWeight:800, color:"#9a3412" }}>{observados}</div></div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <select style={inp} value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
          <option value="">Todos los orígenes</option>
          <option value="orden">Órdenes</option>
          <option value="envio">Envíos de materiales</option>
          <option value="traslado">Traslados y movimientos</option>
        </select>
        <select style={inp} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k,v]: any) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>ORIGEN</th>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>TAREA</th>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>DESTINO</th>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>CONTACTO</th>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>FECHA</th>
              <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, color:"#64748b" }}>ESTADO</th>
              <th style={{ padding:"10px 12px", textAlign:"right", fontSize:11, color:"#64748b" }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map(t => {
              const e = ESTADOS[t.estado] || { label: t.estado, bg:"#f3f4f6", color:"#374151" }
              return (
                <tr key={t.origen + t.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"12px", fontSize:12, fontWeight:700 }}>{t.origenLabel}</td>
                  <td style={{ padding:"12px", fontSize:13, color:"#111827" }}>{t.titulo}</td>
                  <td style={{ padding:"12px", fontSize:12, color:"#475569" }}>{t.destino}</td>
                  <td style={{ padding:"12px", fontSize:12, color:"#475569" }}>{t.contacto}</td>
                  <td style={{ padding:"12px", fontSize:12, color:"#64748b" }}>{t.fecha ? String(t.fecha).slice(0,10) : "—"}</td>
                  <td style={{ padding:"12px" }}>
                    <span style={{ background:e.bg, color:e.color, padding:"4px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>{e.label}</span>
                  </td>
                  <td style={{ padding:"12px", textAlign:"right" }}>
                    <a href={t.href} className="btn-secondary" style={{ fontSize:12, textDecoration:"none" }}>Abrir</a>
                  </td>
                </tr>
              )
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={7} style={{ padding:36, textAlign:"center", color:"#94a3b8" }}>No hay tareas logísticas con estos filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
