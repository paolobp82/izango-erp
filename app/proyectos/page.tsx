"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { useRouter } from "next/navigation"

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: "Pendiente",
  aprobado_produccion: "Aprobado Prod.",
  aprobado: "Aprobado",
  en_curso: "En curso",
  terminado: "Terminado",
  liquidado: "Liquidado",
  facturado: "Facturado",
  cancelado: "Pagado",
  rechazado: "Rechazado",
}

const ENTIDAD_LABEL: Record<string, string> = {
  peru: "Izango Peru",
  selva: "Izango Selva",
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [eliminados, setEliminados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [showEliminados, setShowEliminados] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroEntidad, setFiltroEntidad] = useState("")
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre, apellido), cotizacion_aprobada:cotizaciones!cotizacion_aprobada_id(version, total_cliente)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
    const proyectosData = data || []
    const proyectoIds = proyectosData.map((p: any) => p.id)
    if (proyectoIds.length > 0) {
      const { data: cots } = await supabase.from("cotizaciones").select("proyecto_id, total_cliente, version").is("deleted_at", null).in("proyecto_id", proyectoIds).order("version", { ascending: false })
      const montosPorProyecto: Record<string, number> = {}
      for (const cot of (cots || [])) {
        if (!montosPorProyecto[cot.proyecto_id] && cot.total_cliente > 0) {
          montosPorProyecto[cot.proyecto_id] = cot.total_cliente
        }
      }
      setProyectos(proyectosData.map((p: any) => ({ ...p, _subtotal: montosPorProyecto[p.id] || 0 })))
    } else {
      setProyectos(proyectosData)
    }
    const hace2dias = new Date()
    hace2dias.setDate(hace2dias.getDate() - 2)
    const { data: elim } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social)")
      .not("deleted_at", "is", null)
      .gte("deleted_at", hace2dias.toISOString())
      .order("deleted_at", { ascending: false })
    setEliminados(elim || [])
    setLoading(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("¿Eliminar el proyecto " + nombre + "? Podrás recuperarlo en los próximos 2 días.")) return
    setEliminando(id)
    await supabase.from("proyectos").update({ deleted_at: new Date().toISOString() }).eq("id", id)
    setEliminando(null)
    load()
  }
  async function copiarProyecto(p: any) {
  if (!confirm(`¿Copiar proyecto "${p.nombre}"?`)) return
  const { data: todosProj } = await supabase.from("proyectos").select("codigo")
  const maxNum = (todosProj || []).reduce((max: number, p: any) => {
    const num = parseInt((p.codigo || "").replace("IZ-", "")) || 0
    return num > max ? num : max
  }, 26000)
  const nuevoCodigo = `IZ-${maxNum + 1}`
  const { data: nuevo } = await supabase.from("proyectos").insert({
    codigo: nuevoCodigo,
    nombre: p.nombre + " (copia)",
    cliente_id: p.cliente_id || null,
    productor_id: p.productor_id || null,
    entidad: p.entidad || "peru",
    fecha_inicio: p.fecha_inicio || null,
    fecha_fin_estimada: p.fecha_fin_estimada || null,
    presupuesto_referencial: p.presupuesto_referencial || null,
    estado: "pendiente_aprobacion",
  }).select().single()
  if (!nuevo) return
  // Copiar cotizaciones
  const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", p.id).is("deleted_at", null)
  for (const cot of (cots || [])) {
    const { data: nuevaCot } = await supabase.from("cotizaciones").insert({
      proyecto_id: nuevo.id, version: cot.version, estado: "borrador",
      condicion_pago: cot.condicion_pago, validez_dias: cot.validez_dias,
      fee_agencia_pct: cot.fee_agencia_pct, fee_activo: cot.fee_activo,
      igv_pct: cot.igv_pct, descuento_pct: cot.descuento_pct || 0,
    }).select().single()
    if (!nuevaCot) continue
    const { data: items } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cot.id)
    if (items && items.length > 0) {
      await supabase.from("cotizacion_items").insert(
        items.map(({ id: _id, cotizacion_id: _cid, ...rest }: any) => ({ ...rest, cotizacion_id: nuevaCot.id }))
      )
    }
  }
  load()
  router.push("/proyectos/" + nuevo.id)
}

  async function recuperar(id: string) {
    await supabase.from("proyectos").update({ deleted_at: null }).eq("id", id)
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Proyectos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {proyectos.length} proyectos
            {eliminados.length > 0 && (
              <button onClick={() => setShowEliminados(!showEliminados)}
                style={{ marginLeft: 12, fontSize: 12, color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: 99, padding: "2px 8px", cursor: "pointer" }}>
                🗑 {eliminados.length} eliminado{eliminados.length > 1 ? "s" : ""} (recuperables)
              </button>
            )}
          </p>
        </div>
        <ImportExport modulo="proyectos" campos={[{key:"nombre",label:"Nombre",requerido:true},{key:"descripcion_requerimiento",label:"Descripcion"},{key:"presupuesto_referencial",label:"Presupuesto"},{key:"fecha_limite_cotizacion",label:"Fecha limite cotizacion"},{key:"fecha_inicio",label:"Fecha ejecucion"},{key:"fecha_fin_estimada",label:"Fecha fin estimada"}]} datos={proyectos} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const{error}=await supabase.from("proyectos").insert({...r,entidad:"peru",estado:"pendiente_aprobacion"}); if(error)errores.push(r.nombre+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={filtroEntidad} onChange={e => setFiltroEntidad(e.target.value)}
  style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
  <option value="">Todas las entidades</option>
  <option value="peru">Izango Peru (IZ)</option>
  <option value="selva">Izango Selva (SEL)</option>
</select>
        <button onClick={() => router.push("/proyectos/nuevo")} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo proyecto</button>
      </div>

      {showEliminados && eliminados.length > 0 && (
        <div style={{ marginBottom: 20, background: "#fff8f8", border: "1px solid #fecaca", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", marginBottom: 12 }}>🗑 Proyectos eliminados — recuperables por 2 días</div>
          {eliminados.map(p => {
            const eliminadoHace = Math.floor((Date.now() - new Date(p.deleted_at).getTime()) / (1000 * 60 * 60))
            const horasRestantes = 48 - eliminadoHace
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #fee2e2" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{p.nombre}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{p.cliente?.razon_social}</span>
                  <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 8 }}>Expira en {horasRestantes}h</span>
                </div>
                <button onClick={() => recuperar(p.id)}
                  style={{ fontSize: 12, padding: "4px 12px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>
                  Recuperar
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {proyectos.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay proyectos aún</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CÓDIGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>ENTIDAD</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>V. APROBADA</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>SUBTOTAL</th>
                <th style={{ padding: "10px 20px", width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {proyectos.filter(p => (!filtroEstado || p.estado === filtroEstado) && (!filtroEntidad || p.entidad === filtroEntidad)).map((p, idx) => {
                const ec: any = {
                  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e" },
                  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412" },
                  aprobado:             { bg: "#dbeafe", color: "#1e40af" },
                  aprobado_gerencia:    { bg: "#e0e7ff", color: "#3730a3" },
                  aprobado_cliente:     { bg: "#dcfce7", color: "#15803d" },
                  en_curso:             { bg: "#dcfce7", color: "#15803d" },
                  terminado:            { bg: "#f3f4f6", color: "#6b7280" },
                  liquidado:            { bg: "#f5f3ff", color: "#6d28d9" },
                  facturado:            { bg: "#f0fdf4", color: "#166534" },
                  cancelado:            { bg: "#f0fdf4", color: "#166534" },
                  rechazado:            { bg: "#fde8d8", color: "#c2410c" },
                }
                const e = ec[p.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                const prod = p.productor ? p.productor.nombre + " " + p.productor.apellido : "—"
                return (
                  
                  <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{p.codigo}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, background: p.entidad === "selva" ? "#fef9c3" : "#dbeafe", color: p.entidad === "selva" ? "#92400e" : "#1e40af", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                        {ENTIDAD_LABEL[p.entidad] || p.entidad || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{prod}</td>
                    <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                      <span style={{ background: e.bg, color: e.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                        {ESTADO_LABEL[p.estado] || p.estado || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {p.cotizacion_aprobada ? (
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 99 }}>✓ V{p.cotizacion_aprobada.version}</span>
                          {p.cotizacion_aprobada.total_cliente > 0 && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{fmt(p.cotizacion_aprobada.total_cliente)}</div>}
                        </div>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0F6E56", whiteSpace: "nowrap" }}>
                      {p._subtotal > 0 ? fmt(p._subtotal) : "—"}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => copiarProyecto(p)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer" }}>Copiar</button>
                        <button onClick={() => router.push("/proyectos/" + p.id)} className="btn-secondary" style={{ fontSize: 12 }}>Ver</button>
                        <button onClick={() => eliminar(p.id, p.nombre)} disabled={eliminando === p.id}
                          style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                          {eliminando === p.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}