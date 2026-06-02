"use client"
import { registrarAccion } from "@/lib/trazabilidad"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

const FLUJO: Record<string, any> = {
  pendiente_aprobacion: { label: "Pendiente aprobación", bg: "#fef9c3", color: "#92400e", siguiente: "aprobado_produccion", accion: "Aprobar (Producción)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  aprobado_produccion:  { label: "Aprobado Producción",  bg: "#fed7aa", color: "#9a3412", siguiente: "aprobado",            accion: "Aprobar (GG)",            roles: ["gerente_general", "superadmin"] },
  aprobado:             { label: "Aprobado",              bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Iniciar proyecto",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  en_curso:             { label: "En curso",              bg: "#dcfce7", color: "#15803d", siguiente: "terminado",           accion: "Marcar terminado",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  terminado:            { label: "Terminado",             bg: "#f3f4f6", color: "#6b7280", siguiente: "liquidado",           accion: "Pasar a liquidación",     roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  liquidado:            { label: "Liquidado",             bg: "#f5f3ff", color: "#6d28d9", siguiente: "facturado",           accion: "Marcar facturado",        roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  facturado:            { label: "Facturado",             bg: "#e0f2fe", color: "#0369a1", siguiente: "cancelado",           accion: "Marcar pagado",           roles: ["gerente_general", "superadmin"] },
  cancelado:            { label: "Pagado",                bg: "#f0fdf4", color: "#166534", siguiente: null,                  accion: null,                      roles: [] },
  rechazado:            { label: "Rechazado",             bg: "#fde8d8", color: "#c2410c", siguiente: null,                  accion: null,                      roles: [] },
}

const FLUJO_BREADCRUMB = ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "en_curso", "terminado", "liquidado", "facturado", "cancelado"]

const ENTIDADES = [
  { value: "peru", label: "Izango Peru" },
  { value: "selva", label: "Izango Selva" },
]

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [cotizacionesEliminadas, setCotizacionesEliminadas] = useState<any[]>([])
  const [historial, setHistorial] = useState<Record<string, any[]>>({})
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [versionAprobar, setVersionAprobar] = useState("")
  const [editandoEntidad, setEditandoEntidad] = useState(false)
  const [showVersionesEliminadas, setShowVersionesEliminadas] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [formEditar, setFormEditar] = useState<any>({})

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

    const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).is("deleted_at", null).order("version")
    if (cots && cots.length > 0) {
      const hist: Record<string, any[]> = {}
      for (const cot of cots) {
        const { data: h } = await supabase.from("cotizacion_historial").select("*").eq("cotizacion_id", cot.id).order("created_at", { ascending: false })
        hist[cot.id] = h || []
      }
      setHistorial(hist)
      const yaAprobada = cots.find((c: any) => c.estado === "aprobada_cliente")
      if (yaAprobada) setVersionAprobar(yaAprobada.id)
      else if (proy?.cotizacion_aprobada_id) setVersionAprobar(proy.cotizacion_aprobada_id)
      else setVersionAprobar(cots[cots.length - 1]?.id || "")
    }
    setCotizaciones(cots || [])

    const hace2dias = new Date()
    hace2dias.setDate(hace2dias.getDate() - 2)
    const { data: elim } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).not("deleted_at", "is", null).gte("deleted_at", hace2dias.toISOString()).order("deleted_at", { ascending: false })
    setCotizacionesEliminadas(elim || [])
    setLoading(false)
  }

  async function abrirEditar() {
    const [{ data: cls }, { data: prods }] = await Promise.all([
      supabase.from("clientes").select("id,razon_social").order("razon_social"),
      supabase.from("perfiles").select("id,nombre,apellido").order("apellido"),
    ])
    setClientes(cls || [])
    setProductores(prods || [])
    setFormEditar({
      nombre: proyecto?.nombre || "",
      cliente_id: proyecto?.cliente_id || "",
      productor_id: proyecto?.productor_id || "",
      fecha_inicio: proyecto?.fecha_inicio || "",
      fecha_fin_estimada: proyecto?.fecha_fin_estimada || "",
      presupuesto_referencial: proyecto?.presupuesto_referencial || "",
    })
    setShowEditar(true)
  }

  async function guardarEdicion() {
    await supabase.from("proyectos").update({
      nombre: formEditar.nombre,
      cliente_id: formEditar.cliente_id || null,
      productor_id: formEditar.productor_id || null,
      fecha_inicio: formEditar.fecha_inicio || null,
      fecha_fin_estimada: formEditar.fecha_fin_estimada || null,
      presupuesto_referencial: formEditar.presupuesto_referencial ? Number(formEditar.presupuesto_referencial) : null,
    }).eq("id", id)
    await registrarAccion({ accion: "editar", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto editado: " + formEditar.nombre })
    setProyecto((prev: any) => ({ ...prev, ...formEditar }))
    setShowEditar(false)
    setTimeout(() => load(), 500)
  }

  async function cambiarEstado(nuevoEstado: string) {
    setCambiando(true)
    if (nuevoEstado === "en_curso" && versionAprobar) {
      for (const cot of cotizaciones) {
        if (cot.id !== versionAprobar && cot.estado === "aprobada_cliente") {
          await supabase.from("cotizaciones").update({ estado: "enviada_cliente" }).eq("id", cot.id)
        }
      }
      await supabase.from("cotizaciones").update({ estado: "aprobada_cliente" }).eq("id", versionAprobar)
      await supabase.from("proyectos").update({ cotizacion_aprobada_id: versionAprobar }).eq("id", id)
    }
    if (nuevoEstado === "terminado") {
      const cotAprobada = cotizaciones.find(c => c.id === versionAprobar) || cotizaciones.find(c => c.estado === "aprobada_cliente")
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
    await supabase.from("proyectos").update({ estado: nuevoEstado }).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Estado cambiado a: " + nuevoEstado, datos_nuevos: { estado: nuevoEstado } })
    setProyecto({ ...proyecto, estado: nuevoEstado })
    setCambiando(false)
    load()
  }

  async function rechazar() {
    if (!confirm("¿Rechazar este proyecto?")) return
    setCambiando(true)
    await supabase.from("proyectos").update({ estado: "rechazado" }).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto rechazado", datos_nuevos: { estado: "rechazado" } })
    setProyecto({ ...proyecto, estado: "rechazado" })
    setCambiando(false)
  }

  async function cambiarEntidad(entidad: string) {
    await supabase.from("proyectos").update({ entidad }).eq("id", id)
    setProyecto({ ...proyecto, entidad })
    setEditandoEntidad(false)
  }

  async function eliminarVersion(cotId: string, version: number) {
    if (!confirm(`¿Eliminar proforma V${version}? Podrás recuperarla en los próximos 2 días.`)) return
    await supabase.from("cotizaciones").update({ deleted_at: new Date().toISOString() }).eq("id", cotId)
    load()
  }

  async function recuperarVersion(cotId: string) {
    await supabase.from("cotizaciones").update({ deleted_at: null }).eq("id", cotId)
    load()
  }

  async function nuevaVersion(copiarDeId?: string) {
    setCreando(true)
    const ultimaVersion = cotizaciones.length > 0 ? Math.max(...cotizaciones.map((c: any) => c.version || 1)) : 0
    let condicion = "50% adelanto / 50% contra entrega"
    let validez = 10, fee_pct = 10, fee_activo = true, igv_pct = 18
    let itemsACopiar: any[] = []
    if (copiarDeId) {
      const cot = cotizaciones.find((c: any) => c.id === copiarDeId)
      if (cot) {
        condicion = cot.condicion_pago || condicion
        validez = cot.validez_dias || validez
        fee_pct = cot.fee_agencia_pct || fee_pct
        fee_activo = cot.fee_activo !== false
        igv_pct = cot.igv_pct || igv_pct
      }
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", copiarDeId).order("orden")
      itemsACopiar = its || []
    }
    const { data: nueva } = await supabase.from("cotizaciones").insert({
      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",
      condicion_pago: condicion, validez_dias: validez,
      fee_agencia_pct: fee_pct, fee_activo, igv_pct, total_cliente: 0, margen_pct: 0,
    }).select().single()
    if (nueva && itemsACopiar.length > 0) {
      const copias = itemsACopiar.map(({ id: _id, cotizacion_id: _cid, ...rest }: any) => ({ ...rest, cotizacion_id: nueva.id }))
      await supabase.from("cotizacion_items").insert(copias)
    }
    setCreando(false)
    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const estadoInfo = FLUJO[proyecto?.estado] || { label: proyecto?.estado, bg: "#f3f4f6", color: "#6b7280" }
  const tieneCotizacion = cotizaciones.length > 0
  const esEstadoFinal = ["cancelado", "rechazado"].includes(proyecto?.estado)
  const puedeAvanzar = estadoInfo.roles?.includes(perfil?.perfil) && tieneCotizacion && !esEstadoFinal
  const puedeRechazar = ["gerente_produccion", "gerente_general", "superadmin"].includes(perfil?.perfil) && !esEstadoFinal
  const puedeEditar = ["superadmin", "gerente_general", "gerente_produccion", "administrador", "controller", "productor"].includes(perfil?.perfil)
  const cotAprobada = cotizaciones.find(c => c.estado === "aprobada_cliente") || cotizaciones.find(c => c.id === proyecto?.cotizacion_aprobada_id)

  const ecCot: any = {
    borrador: { bg: "#fef9c3", color: "#92400e" },
    enviada_cliente: { bg: "#dbeafe", color: "#1e40af" },
    aprobada_cliente: { bg: "#dcfce7", color: "#15803d" },
    rechazada: { bg: "#fee2e2", color: "#991b1b" },
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{proyecto?.cliente?.razon_social}</span>
            {proyecto?.productor && <span style={{ color: "#9ca3af", fontSize: 13 }}>· Productor: {proyecto.productor.nombre} {proyecto.productor.apellido}</span>}
            {cotAprobada && (
              <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                ✓ V{cotAprobada.version} aprobada
              </span>
            )}
            {editandoEntidad ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {ENTIDADES.map(e => (
                  <button key={e.value} onClick={() => cambiarEntidad(e.value)}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, border: proyecto?.entidad === e.value ? "2px solid #0F6E56" : "1px solid #e5e7eb", background: proyecto?.entidad === e.value ? "#f0fdf4" : "#fff", color: proyecto?.entidad === e.value ? "#0F6E56" : "#6b7280", cursor: "pointer", fontWeight: proyecto?.entidad === e.value ? 700 : 400 }}>
                    {e.label}
                  </button>
                ))}
                <button onClick={() => setEditandoEntidad(false)} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>×</button>
              </div>
            ) : (
              <button onClick={() => setEditandoEntidad(true)}
                style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 99, padding: "2px 8px", cursor: "pointer" }}>
                🏢 {ENTIDADES.find(e => e.value === proyecto?.entidad)?.label || proyecto?.entidad || "Sin entidad"}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {puedeEditar && (
            <button onClick={abrirEditar}
              style={{ padding: "7px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ✏️ Editar
            </button>
          )}
          <a href={"/api/reporte-pdf?proyecto_id=" + id} target="_blank"
            style={{ padding: "7px 14px", border: "1px solid #1D9E75", borderRadius: 8, background: "#fff", color: "#0F6E56", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            📥 Reporte PDF
          </a>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select id="copiar-version" style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "#fff" >
                <option value="">Nueva vacia</option>
                {cotizaciones.map((cot: any) => (
                  <option key={cot.id} value={cot.id}>Copiar V{cot.version}</option>
                ))}
              </select>
            )}
            <button onClick={() => {
              const sel = document.getElementById("copiar-version") as HTMLSelectElement
              const val = sel?.value
              nuevaVersion(val && val !== "" ? val : undefined)
            }} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
              {creando ? "Creando..." : "+ Nueva proforma"}
            </button>
          </div>
        </div>
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

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {FLUJO_BREADCRUMB.map((estado, idx) => {
              const info = FLUJO[estado]
              const idxActual = FLUJO_BREADCRUMB.indexOf(proyecto?.estado)
              const completado = idx <= idxActual
              const actual = estado === proyecto?.estado
              return (
                <div key={estado} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: completado ? info.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: actual ? 700 : 400, color: actual ? info.color : completado ? "#374151" : "#9ca3af" }}>{info.label}</span>
                  </div>
                  {idx < FLUJO_BREADCRUMB.length - 1 && <span style={{ color: "#d1d5db", fontSize: 14 }}>→</span>}
                </div>
              )
            })}
          </div>

          {proyecto?.estado === "rechazado" && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fde8d8", border: "1px solid #fdba74", borderRadius: 8, fontSize: 12, color: "#c2410c", fontWeight: 600 }}>
              Este proyecto fue rechazado y no puede avanzar.
            </div>
          )}

          {!tieneCotizacion && proyecto?.estado === "pendiente_aprobacion" && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
              Debes crear al menos una proforma antes de poder aprobar este proyecto.
            </div>
          )}

          {puedeAvanzar && proyecto?.estado === "aprobado" && cotizaciones.length > 0 && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0F6E56", marginBottom: 8 }}>
                ✓ Selecciona la version aprobada por el cliente
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cotizaciones.map((cot: any) => (
                  <button key={cot.id} type="button" onClick={() => setVersionAprobar(cot.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: versionAprobar === cot.id ? 700 : 400,
                      border: versionAprobar === cot.id ? "2px solid #0F6E56" : "1px solid #e5e7eb",
                      background: versionAprobar === cot.id ? "#dcfce7" : "#fff",
                      color: versionAprobar === cot.id ? "#15803d" : "#374151", cursor: "pointer",
                    }}>
                    V{cot.version}
                    {cot.total_cliente > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: versionAprobar === cot.id ? "#15803d" : "#9ca3af" }}>{fmt(cot.total_cliente)}</span>}
                    {cot.estado === "aprobada_cliente" && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {puedeAvanzar && estadoInfo.siguiente && (
              <button onClick={() => cambiarEstado(estadoInfo.siguiente)} disabled={cambiando || (proyecto?.estado === "aprobado" && !versionAprobar)}
                style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (proyecto?.estado === "aprobado" && !versionAprobar) ? 0.5 : 1 }}>
                {cambiando ? "..." : estadoInfo.accion}
              </button>
            )}
            {puedeRechazar && (
              <button onClick={rechazar} disabled={cambiando}
                style={{ padding: "8px 16px", border: "1px solid #fde8d8", borderRadius: 8, background: "#fff", color: "#c2410c", cursor: "pointer", fontSize: 13 }}>
                Rechazar proyecto
              </button>
            )}
          </div>
        </div>
      </div>

      {cotizacionesEliminadas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowVersionesEliminadas(!showVersionesEliminadas)}
            style={{ fontSize: 12, color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: 99, padding: "3px 10px", cursor: "pointer", marginBottom: 8 }}>
            🗑 {cotizacionesEliminadas.length} version{cotizacionesEliminadas.length > 1 ? "es eliminadas" : " eliminada"} (recuperable{cotizacionesEliminadas.length > 1 ? "s" : ""})
          </button>
          {showVersionesEliminadas && (
            <div style={{ background: "#fff8f8", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
              {cotizacionesEliminadas.map(cot => {
                const horasRestantes = 48 - Math.floor((Date.now() - new Date(cot.deleted_at).getTime()) / (1000 * 60 * 60))
                return (
                  <div key={cot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fee2e2" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>V{cot.version}</span>
                      {cot.total_cliente > 0 && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{fmt(cot.total_cliente)}</span>}
                      <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 8 }}>Expira en {horasRestantes}h</span>
                    </div>
                    <button onClick={() => recuperarVersion(cot.id)}
                      style={{ fontSize: 12, padding: "3px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>
                      Recuperar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Proformas</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{cotizaciones.length} version{cotizaciones.length !== 1 ? "es" : ""}</span>
        </div>
        {cotizaciones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No hay proformas aun</div>
            <div style={{ fontSize: 12 }}>Crea la primera version para comenzar</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VERSION</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONDICION PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HISTORIAL</th>
                <th style={{ padding: "10px 20px", width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((cot, idx) => {
                const e = ecCot[cot.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                const esAprobada = (cot.id === proyecto?.cotizacion_aprobada_id || cot.estado === "aprobada_cliente") && ["en_curso","terminado","liquidado","facturado","cancelado"].includes(proyecto?.estado)
                return (
                  <tr key={cot.id} style={{ borderTop: "1px solid #f3f4f6", background: esAprobada ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>V{cot.version}</span>
                        {esAprobada && <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>✓ Aprobada</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <select value={cot.estado || "borrador"} onChange={async ev => { await supabase.from("cotizaciones").update({ estado: ev.target.value }).eq("id", cot.id); load() }}
                        style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid " + e.color, background: e.bg, color: e.color, cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
                        <option value="borrador">Borrador</option>
                        <option value="enviada_cliente">Enviada</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobada_cliente">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
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
                        {!esAprobada && (
                          <button onClick={() => eliminarVersion(cot.id, cot.version)}
                            style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                            Borrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showEditar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Editar proyecto</h2>
              <button onClick={() => setShowEditar(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>NOMBRE</label>
                <input style={inp} value={formEditar.nombre} onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>CLIENTE</label>
                <select style={inp} value={formEditar.cliente_id} onChange={e => setFormEditar({ ...formEditar, cliente_id: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>PRODUCTOR</label>
                <select style={inp} value={formEditar.productor_id} onChange={e => setFormEditar({ ...formEditar, productor_id: e.target.value })}>
                  <option value="">Sin productor</option>
                  {productores.map(p => <option key={p.id} value={p.id}>{p.apellido} {p.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA INICIO</label>
                  <input type="date" style={inp} value={formEditar.fecha_inicio} onChange={e => setFormEditar({ ...formEditar, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>FECHA FIN ESTIMADA</label>
                  <input type="date" style={inp} value={formEditar.fecha_fin_estimada} onChange={e => setFormEditar({ ...formEditar, fecha_fin_estimada: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>PRESUPUESTO REF.</label>
                <input type="number" style={inp} value={formEditar.presupuesto_referencial} onChange={e => setFormEditar({ ...formEditar, presupuesto_referencial: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowEditar(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarEdicion} className="btn-primary" style={{ fontSize: 13 }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}