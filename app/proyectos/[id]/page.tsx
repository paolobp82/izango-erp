"use client"
import { registrarAccion } from "@/lib/trazabilidad"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

const FLUJO: Record<string, any> = {
  pendiente_aprobacion: { label: "Pendiente aprobación", bg: "#fef9c3", color: "#92400e", siguiente: "aprobado_produccion", accion: "Aprobar (Producción)", roles: ["gerente_produccion", "gerente_general"] },
  aprobado_produccion:  { label: "Aprobado Producción",  bg: "#fed7aa", color: "#9a3412", siguiente: "aprobado",            accion: "Aprobar (GG)",            roles: ["gerente_general"] },
  aprobado:             { label: "Aprobado",              bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Iniciar proyecto",        roles: ["gerente_produccion", "gerente_general", "productor"] },
  en_curso:             { label: "En curso",              bg: "#dcfce7", color: "#15803d", siguiente: "terminado",           accion: "Marcar terminado",        roles: ["gerente_produccion", "gerente_general", "productor"] },
  terminado:            { label: "Terminado",             bg: "#f3f4f6", color: "#6b7280", siguiente: "liquidado",           accion: "Pasar a liquidación",     roles: ["gerente_produccion", "gerente_general", "productor"] },
  liquidado:            { label: "Liquidado",             bg: "#f5f3ff", color: "#6d28d9", siguiente: "facturado",           accion: "Marcar facturado",        roles: ["gerente_produccion", "gerente_general"] },
  facturado:            { label: "Facturado",             bg: "#f0fdf4", color: "#166534", siguiente: null,                  accion: null,                      roles: [] },
}

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [historial, setHistorial] = useState<Record<string, any[]>>({})
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [cambiando, setCambiando] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data: proy } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social, ruc), productor:perfiles!productor_id(nombre, apellido)")
      .eq("id", id)
      .single()
    setProyecto(proy)
    const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).order("version")
    if (cots && cots.length > 0) {
      const hist: Record<string, any[]> = {}
      for (const cot of cots) {
        const { data: h } = await supabase.from("cotizacion_historial").select("*").eq("cotizacion_id", cot.id).order("created_at", { ascending: false })
        hist[cot.id] = h || []
      }
      setHistorial(hist)
    }
    setCotizaciones(cots || [])
    setLoading(false)
  }

  async function cambiarEstado(nuevoEstado: string) {
    if (nuevoEstado === "terminado") {
      const cotAprobada = cotizaciones.find(c => c.estado === "aprobada_cliente")
      const { data: liqExistente } = await supabase.from("liquidaciones").select("id").eq("proyecto_id", id).single()
      if (!liqExistente) {
        const { data: liq } = await supabase.from("liquidaciones").insert({
          proyecto_id: id,
          costo_presupuestado: cotAprobada?.subtotal_costo || 0,
          precio_cliente_presupuestado: cotAprobada?.total_cliente || 0,
          margen_presupuestado_pct: cotAprobada?.margen_pct || 0,
          costo_real: 0, precio_cliente_real: cotAprobada?.total_cliente || 0,
          margen_real_pct: 0, cerrada: false,
        }).select().single()
        if (liq && cotAprobada) {
          const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotAprobada.id)
          if (its && its.length > 0) {
            await supabase.from("liquidacion_items").insert(its.map((item: any) => ({
              liquidacion_id: liq.id, cotizacion_item_id: item.id,
              descripcion: item.descripcion, costo_presupuestado: item.costo_total || 0,
              costo_real: 0, desvio: 0, desvio_pct: 0,
            })))
          }
        }
      }
    }
    setCambiando(true)
    await supabase.from("proyectos").update({ estado: nuevoEstado }).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Estado cambiado a: " + nuevoEstado, datos_nuevos: { estado: nuevoEstado } })
    setProyecto({ ...proyecto, estado: nuevoEstado })
    setCambiando(false)
  }

  async function rechazar() {
    if (!confirm("¿Rechazar este proyecto?")) return
    await supabase.from("proyectos").update({ estado: "pendiente_aprobacion" }).eq("id", id)
    setProyecto({ ...proyecto, estado: "pendiente_aprobacion" })
  }

  async function nuevaVersion() {
    setCreando(true)
    const ultimaVersion = cotizaciones.length > 0 ? Math.max(...cotizaciones.map(c => c.version || 1)) : 0
    const { data: nueva } = await supabase.from("cotizaciones").insert({
      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",
      condicion_pago: "50% adelanto / 50% contra entrega", validez_dias: 10,
      fee_agencia_pct: 10, fee_activo: true, igv_pct: 18, total_cliente: 0, margen_pct: 0,
    }).select().single()
    setCreando(false)
    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const estadoInfo = FLUJO[proyecto?.estado] || { label: proyecto?.estado, bg: "#f3f4f6", color: "#6b7280" }
  const tieneCotizacion = cotizaciones.length > 0
  const puedeAvanzar = estadoInfo.roles?.includes(perfil?.perfil) && tieneCotizacion
  const puedeRechazar = ["gerente_produccion", "gerente_general"].includes(perfil?.perfil) && ["aprobado_produccion", "aprobado"].includes(proyecto?.estado)

  const ecCot: any = {
    borrador: { bg: "#fef9c3", color: "#92400e" },
    enviada_cliente: { bg: "#dbeafe", color: "#1e40af" },
    aprobada_cliente: { bg: "#dcfce7", color: "#15803d" },
    rechazada: { bg: "#fee2e2", color: "#991b1b" },
  }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>{proyecto?.codigo}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {proyecto?.cliente?.razon_social}
            {proyecto?.productor && <span style={{ marginLeft: 8, color: "#9ca3af" }}>· Productor: {proyecto.productor.nombre} {proyecto.productor.apellido}</span>}
          </p>
        </div>
        <button onClick={nuevaVersion} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
          {creando ? "Creando..." : "+ Nueva proforma"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Estado</div>
            <span style={{ background: estadoInfo.bg, color: estadoInfo.color, padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {estadoInfo.label}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Fecha inicio</div>
            <div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.fecha_inicio || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Fecha fin estimada</div>
            <div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.fecha_fin_estimada || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Presupuesto ref.</div>
            <div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.presupuesto_referencial ? fmt(proyecto.presupuesto_referencial) : "—"}</div>
          </div>
        </div>

        {/* Flujo de aprobación */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(FLUJO).map(([estado, info]: [string, any], idx, arr) => {
              const estados = Object.keys(FLUJO)
              const idxActual = estados.indexOf(proyecto?.estado)
              const idxEste = estados.indexOf(estado)
              const completado = idxEste <= idxActual
              const actual = estado === proyecto?.estado
              return (
                <div key={estado} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: completado ? info.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{idxEste + 1}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: actual ? 700 : 400, color: actual ? info.color : completado ? "#374151" : "#9ca3af" }}>{info.label}</span>
                  </div>
                  {idx < arr.length - 1 && <span style={{ color: "#d1d5db", fontSize: 14 }}>→</span>}
                </div>
              )
            })}
          </div>

          {!tieneCotizacion && proyecto?.estado === "pendiente_aprobacion" && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
              Debes crear al menos una proforma antes de poder aprobar este proyecto.
            </div>
          )}
          {puedeAvanzar && estadoInfo.siguiente && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => cambiarEstado(estadoInfo.siguiente)} disabled={cambiando}
                style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {cambiando ? "..." : estadoInfo.accion}
              </button>
              {puedeRechazar && (
                <button onClick={rechazar}
                  style={{ padding: "8px 16px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  Rechazar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Proformas</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{cotizaciones.length} versión{cotizaciones.length !== 1 ? "es" : ""}</span>
        </div>
        {cotizaciones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No hay proformas aún</div>
            <div style={{ fontSize: 12 }}>Crea la primera versión para comenzar</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VERSIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONDICIÓN PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HISTORIAL</th>
                <th style={{ padding: "10px 20px", width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((cot, idx) => {
                const e = ecCot[cot.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                return (
                  <tr key={cot.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontWeight: 700, fontSize: 15, color: "#111827" }}>V{cot.version}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: e.bg, color: e.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{cot.estado || "borrador"}</span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {cot.total_cliente > 0 ? fmt(cot.total_cliente) : "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (cot.margen_pct || 0) >= 35 ? "#0F6E56" : "#6b7280" }}>
                      {cot.margen_pct > 0 ? cot.margen_pct.toFixed(1) + "%" : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{cot.condicion_pago || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      {historial[cot.id] && historial[cot.id].length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {historial[cot.id].slice(0, 3).map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: 10, color: "#9ca3af", display: "flex", gap: 4, alignItems: "center" }}>
                              <span style={{ color: h.accion === "aprobada_cliente" ? "#15803d" : "#6b7280" }}>
                                {h.accion === "aprobada_cliente" ? "✓" : "✎"}
                              </span>
                              <span>{h.usuario_nombre}</span>
                              <span>·</span>
                              <span>{new Date(h.created_at).toLocaleDateString("es-PE")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>
                          Editar
                        </button>
                        <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}/preview`)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer" }}>
                          Preview
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




