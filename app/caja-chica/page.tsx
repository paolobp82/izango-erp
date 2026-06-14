"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import { registrarAccion } from "@/lib/trazabilidad"
import { rqCodigo } from "@/lib/rq-code"

const ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  aprobado:  { label: "Aprobado",  bg: "#dcfce7", color: "#15803d" },
  rechazado: { label: "Rechazado", bg: "#fee2e2", color: "#991b1b" },
}

const TIPOS_COMPROBANTE = ["factura", "boleta", "deposito", "recibo", "otro"]

const CATEGORIAS = [
  "Materiales", "Transporte", "Alimentacion", "Hospedaje", "Comunicaciones",
  "Equipos", "Servicios", "Impuestos", "Gastos bancarios", "Otros"
]

const ROLES_APROBADOR = ["controller", "gerente_general", "superadmin"]

const formVacio = {
  concepto: "", monto_debe: "", monto_haber: "", fecha: "",
  tipo_comprobante: "boleta", numero_operacion: "",
  proyecto_id: "", rq_id: "", categoria: "", observaciones: "",
  destinatario: "",
}

export default function CajaChicaPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [rqs, setRqs] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [form, setForm] = useState({ ...formVacio })
  const [selected, setSelected] = useState<any>(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [showRechazo, setShowRechazo] = useState(false)
  const [showCerrarRendicion, setShowCerrarRendicion] = useState(false)
  const [showAbrirCaja, setShowAbrirCaja] = useState(false)
  const [nombrePeriodo, setNombrePeriodo] = useState("")
  const [montoApertura, setMontoApertura] = useState("")
  const [periodos, setPeriodos] = useState<string[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState("actual")
  const [editando, setEditando] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data: r } = await supabase
      .from("caja_chica")
      .select("*, proyecto:proyectos(nombre, codigo, deleted_at), solicitante:perfiles!solicitado_por(nombre, apellido), aprobador:perfiles!aprobado_por(nombre, apellido)")
      .order("created_at", { ascending: false })
    setRegistros((r || []).filter((registro: any) => !rowBelongsToDeletedProject(registro)))
    const { data: pr } = await supabase.from("proyectos").select("id, nombre, codigo").is("deleted_at", null).order("nombre")
    const { data: rAll } = await supabase.from("caja_chica").select("periodo").not("periodo", "is", null)
    const periStr = [...new Set((rAll || []).map((r: any) => r.periodo).filter(Boolean))] as string[]
    setPeriodos(periStr)
    setProyectos(pr || [])
    const { data: rq } = await supabase.from("requerimientos_pago").select("id, codigo_rq, numero_rq, descripcion").order("created_at", { ascending: false }).limit(50)
    setRqs(rq || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.concepto || !form.fecha) { alert("Concepto y fecha son obligatorios"); return }
    if (!form.monto_debe && !form.monto_haber) { alert("Ingresa al menos un monto (debe o haber)"); return }
    setSaving(true)
    if (editando) {
      const { error } = await supabase.from("caja_chica").update({
        concepto: form.concepto,
        monto_debe: Number(form.monto_debe) || 0,
        monto_haber: Number(form.monto_haber) || 0,
        fecha: form.fecha,
        tipo_comprobante: form.tipo_comprobante || null,
        numero_operacion: form.numero_operacion || null,
        proyecto_id: form.proyecto_id || null,
        rq_id: form.rq_id || null,
        categoria: form.categoria || null,
        destinatario: form.destinatario || null,
        observaciones: form.observaciones || null,
      }).eq("id", editando.id)
      if (error) { alert("Error: " + error.message); setSaving(false); return }
    } else {
      await supabase.from("caja_chica").insert({
        concepto: form.concepto,
        monto_debe: Number(form.monto_debe) || 0,
        monto_haber: Number(form.monto_haber) || 0,
        fecha: form.fecha,
        tipo_comprobante: form.tipo_comprobante || null,
        numero_operacion: form.numero_operacion || null,
        proyecto_id: form.proyecto_id || null,
        rq_id: form.rq_id || null,
        categoria: form.categoria || null,
        destinatario: form.destinatario || null,
        observaciones: form.observaciones || null,
        solicitado_por: perfil?.id || null,
        estado: "pendiente",
        entidad: "peru",
        fecha_apertura: form.fecha,
        monto_inicial: 0,
      })
    }
    await registrarAccion({ accion: "crear", modulo: "caja_chica", entidad_tipo: "caja_chica", descripcion: "Solicitud caja chica: " + form.concepto })
    setSaving(false)
    setShowForm(false)
    setEditando(null)
    setForm({ ...formVacio })
    load()
  }

  async function aprobar(id: string) {
    await supabase.from("caja_chica").update({
      estado: "aprobado",
      aprobado_por: perfil?.id,
      aprobado_at: new Date().toISOString(),
    }).eq("id", id)
    await registrarAccion({ accion: "aprobar", modulo: "caja_chica", entidad_id: id, entidad_tipo: "caja_chica", descripcion: "Caja chica aprobada" })
    load()
    if (selected?.id === id) setSelected((p: any) => ({ ...p, estado: "aprobado" }))
  }

  async function rechazar(id: string) {
    await supabase.from("caja_chica").update({
      estado: "rechazado",
      aprobado_por: perfil?.id,
      aprobado_at: new Date().toISOString(),
      observaciones: motivoRechazo || null,
    }).eq("id", id)
    await registrarAccion({ accion: "rechazar", modulo: "caja_chica", entidad_id: id, entidad_tipo: "caja_chica", descripcion: "Caja chica rechazada" })
    setShowRechazo(false)
    setMotivoRechazo("")
    load()
    if (selected?.id === id) setSelected((p: any) => ({ ...p, estado: "rechazado" }))
  }

  async function cerrarRendicion() {
    if (!nombrePeriodo.trim()) { alert("Ingresa un nombre para el período"); return }
    await supabase.from("caja_chica").update({ archivada: true, periodo: nombrePeriodo }).is("archivada", null).neq("archivada", true)
    await supabase.from("caja_chica").update({ archivada: true, periodo: nombrePeriodo }).eq("archivada", false)
    setShowCerrarRendicion(false)
    setNombrePeriodo("")
    load()
  }

  async function abrirNuevaCaja() {
    if (!montoApertura || Number(montoApertura) <= 0) { alert("Ingresa un monto de apertura válido"); return }
    const hoy = new Date().toISOString().split("T")[0]
    await supabase.from("caja_chica").insert({
      concepto: "Apertura de caja chica",
      monto_debe: 0,
      monto_haber: Number(montoApertura),
      fecha: hoy,
      tipo_comprobante: "deposito",
      solicitado_por: perfil?.id || null,
      estado: "aprobado",
      aprobado_por: perfil?.id || null,
      aprobado_at: new Date().toISOString(),
      entidad: "peru",
      fecha_apertura: hoy,
      monto_inicial: Number(montoApertura),
      categoria: "Apertura",
      observaciones: "Apertura de caja con monto S/ " + montoApertura,
    })
    await registrarAccion({ accion: "crear", modulo: "caja_chica", entidad_tipo: "caja_chica", descripcion: "Apertura de caja: S/ " + montoApertura })
    setShowAbrirCaja(false)
    setMontoApertura("")
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    await supabase.from("caja_chica").delete().eq("id", id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  const esAprobador = perfil && ROLES_APROBADOR.includes(perfil.perfil)
  const registroActual = registros.filter(r => !r.archivada)

  const registrosFiltrados = registros.filter(r => {
    if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false
    if (filtroPeriodo === "actual" && r.archivada) return false
    if (filtroPeriodo !== "actual" && filtroPeriodo !== "todos" && r.periodo !== filtroPeriodo) return false
    return true
  })

  const registrosParaTotales = registrosFiltrados
  const totalDebe = registrosParaTotales.filter(r => r.estado === "aprobado").reduce((s, r) => s + (r.monto_debe || 0), 0)
  const totalHaber = registrosParaTotales.filter(r => r.estado === "aprobado").reduce((s, r) => s + (r.monto_haber || 0), 0)
  const totalPendiente = registrosParaTotales.filter(r => r.estado === "pendiente").reduce((s, r) => s + (r.monto_debe || 0), 0)
  const saldoCaja = totalHaber - totalDebe
  const montoInicialCaja = registrosParaTotales.find(r => r.categoria === "Apertura")?.monto_inicial || 0
  const pctUsado = montoInicialCaja > 0 ? ((totalDebe / montoInicialCaja) * 100) : 0

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Caja Chica</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{registros.length} registros</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["superadmin","gerente_general","controller"].includes(perfil?.perfil) && (<>
              <button onClick={() => setShowAbrirCaja(true)} style={{ padding: "7px 14px", border: "1px solid #1D9E75", borderRadius: 8, background: "#f0fdf4", color: "#0F6E56", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>💰 Abrir caja</button>
              <button onClick={() => setShowCerrarRendicion(true)} style={{ padding: "7px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📦 Cerrar rendición</button>
            </>)}
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva solicitud</button>
          </div>
        </div>

        {/* Saldo y progreso */}
        {montoInicialCaja > 0 && (
          <div style={{ background: saldoCaja < montoInicialCaja * 0.2 ? "#fef9c3" : "#f0fdf4", border: "1px solid " + (saldoCaja < montoInicialCaja * 0.2 ? "#fde68a" : "#1D9E75"), borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Fondo apertura: {fmt(montoInicialCaja)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: saldoCaja < montoInicialCaja * 0.2 ? "#92400e" : "#0F6E56" }}>
                {saldoCaja < montoInicialCaja * 0.2 ? "⚠️ Saldo bajo — " : ""}Disponible: {fmt(saldoCaja)}
              </span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pctUsado + "%", background: pctUsado > 80 ? "#dc2626" : pctUsado > 50 ? "#f59e0b" : "#03E373", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{pctUsado.toFixed(0)}% utilizado</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total egresos aprobados", value: fmt(totalDebe), color: "#991b1b", bg: "#fee2e2" },
            { label: "Total ingresos aprobados", value: fmt(totalHaber), color: "#15803d", bg: "#dcfce7" },
            { label: "Saldo disponible", value: fmt(saldoCaja), color: saldoCaja >= 0 ? "#15803d" : "#991b1b", bg: saldoCaja >= 0 ? "#dcfce7" : "#fee2e2" },
            { label: "Pendiente aprobacion", value: fmt(totalPendiente), color: "#92400e", bg: "#fef9c3" },
          ].map(c => (
            <div key={c.label} className="card" style={{ background: c.bg, border: "none", padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "uppercase", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
            <option value="actual">Rendición actual</option>
            {periodos.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="todos">Todos los períodos</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {registrosFiltrados.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay registros</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONCEPTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SOLICITANTE</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DEBE</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HABER</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                  <th style={{ padding: "10px 16px", width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, idx) => {
                  const es = ESTADOS[r.estado] || ESTADOS.pendiente
                  return (
                    <tr key={r.id} onClick={() => setSelected(r)}
                      style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === r.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>{r.fecha}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{r.concepto}</div>
                        {r.proyecto && <div style={{ fontSize: 11, color: "#9ca3af" }}>📁 {r.proyecto.codigo}</div>}
                        {r.categoria && <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.categoria}</div>}
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>
                        {r.solicitante ? r.solicitante.nombre + " " + r.solicitante.apellido : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: r.monto_debe > 0 ? "#991b1b" : "#9ca3af" }}>
                        {r.monto_debe > 0 ? fmt(r.monto_debe) : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: r.monto_haber > 0 ? "#15803d" : "#9ca3af" }}>
                        {r.monto_haber > 0 ? fmt(r.monto_haber) : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: es.bg, color: es.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{es.label}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {esAprobador && r.estado === "pendiente" && (
                            <>
                              <button onClick={e => { e.stopPropagation(); aprobar(r.id) }}
                                style={{ fontSize: 11, padding: "3px 8px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>✓</button>
                              <button onClick={e => { e.stopPropagation(); setSelected(r); setShowRechazo(true) }}
                                style={{ fontSize: 11, padding: "3px 8px", background: "#fff", color: "#dc2626", border: "1px solid #fee2e2", borderRadius: 6, cursor: "pointer" }}>✕</button>
                            </>
                          )}
                          {["superadmin","gerente_general","controller"].includes(perfil?.perfil) && (
                            <button onClick={e => { e.stopPropagation(); setEditando(r); setForm({ concepto: r.concepto||"", monto_debe: r.monto_debe||"", monto_haber: r.monto_haber||"", fecha: r.fecha||"", tipo_comprobante: r.tipo_comprobante||"boleta", numero_operacion: r.numero_operacion||"", proyecto_id: r.proyecto_id||"", rq_id: r.rq_id||"", categoria: r.categoria||"", observaciones: r.observaciones||"", destinatario: r.destinatario||"" }); setShowForm(true) }}
                              style={{ fontSize: 11, padding: "3px 8px", background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }}>✏️</button>
                          )}
                          {(perfil?.id === r.solicitado_por || esAprobador) && r.estado === "pendiente" && (
                            <button onClick={e => { e.stopPropagation(); eliminar(r.id) }}
                              style={{ fontSize: 11, padding: "3px 8px", background: "#fff", color: "#9ca3af", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={3} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#374151" }}>TOTAL APROBADOS</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{fmt(totalDebe)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#15803d" }}>{fmt(totalHaber)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div style={{ width: 340, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111827" }}>Detalle</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Concepto", value: selected.concepto },
              { label: "Fecha", value: selected.fecha },
              { label: "Estado", value: ESTADOS[selected.estado]?.label || selected.estado },
              { label: "Debe", value: selected.monto_debe > 0 ? fmt(selected.monto_debe) : "—" },
              { label: "Haber", value: selected.monto_haber > 0 ? fmt(selected.monto_haber) : "—" },
              { label: "Tipo comprobante", value: selected.tipo_comprobante || "—" },
              { label: "N° operación", value: selected.numero_operacion || "—" },
              { label: "Categoría", value: selected.categoria || "—" },
              { label: "Proyecto", value: selected.proyecto ? selected.proyecto.codigo + " — " + selected.proyecto.nombre : "—" },
              { label: "Solicitante", value: selected.solicitante ? selected.solicitante.nombre + " " + selected.solicitante.apellido : "—" },
              { label: "Aprobado por", value: selected.aprobador ? selected.aprobador.nombre + " " + selected.aprobador.apellido : "—" },
              { label: "Fecha aprobación", value: selected.aprobado_at ? new Date(selected.aprobado_at).toLocaleDateString("es-PE") : "—" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: "#9ca3af", fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "#374151", textAlign: "right", maxWidth: 180 }}>{r.value}</span>
              </div>
            ))}
            {selected.observaciones && (
              <div style={{ padding: 10, background: "#f9fafb", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>OBSERVACIONES</div>
                <div style={{ fontSize: 12, color: "#374151" }}>{selected.observaciones}</div>
              </div>
            )}
          </div>
          {esAprobador && selected.estado === "pendiente" && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => aprobar(selected.id)}
                style={{ flex: 1, padding: "8px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Aprobar</button>
              <button onClick={() => setShowRechazo(true)}
                style={{ flex: 1, padding: "8px", background: "#fff", color: "#dc2626", border: "1px solid #fee2e2", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Rechazar</button>
            </div>
          )}
        </div>
      )}

      {showRechazo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#111827" }}>Motivo de rechazo</h3>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical", marginBottom: 16 }}
              placeholder="Explica el motivo del rechazo (opcional)..."
              value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowRechazo(false); setMotivoRechazo("") }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={() => rechazar(selected?.id)}
                style={{ padding: "7px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Confirmar rechazo</button>
            </div>
          </div>
        </div>
      )}

      {showAbrirCaja && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Abrir nueva caja chica</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Define el monto inicial del fondo. Se registrará como ingreso aprobado automáticamente.</p>
            <label style={lbl}>MONTO DE APERTURA (S/)</label>
            <input type="number" style={{ ...inp, fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 20 }}
              value={montoApertura} placeholder="Ej: 1000.00" autoFocus
              onChange={e => setMontoApertura(e.target.value)} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAbrirCaja(false); setMontoApertura("") }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={abrirNuevaCaja} className="btn-primary" style={{ fontSize: 13 }}>Abrir caja</button>
            </div>
          </div>
        </div>
      )}

      {showCerrarRendicion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Cerrar rendición actual</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Los {registroActual.length} registros actuales serán archivados. Ingresa un nombre para identificar este período.</p>
            <label style={lbl}>NOMBRE DEL PERÍODO</label>
            <input style={inp} value={nombrePeriodo} placeholder="Ej: Junio 2026, Semana 1..."
              onChange={e => setNombrePeriodo(e.target.value)} autoFocus />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowCerrarRendicion(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={cerrarRendicion} className="btn-primary" style={{ fontSize: 13 }}>Archivar y nueva rendición</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar registro" : "Nueva solicitud de caja chica"}</h2>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm({ ...formVacio }) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>CONCEPTO *</label>
                <input style={inp} value={form.concepto} placeholder="Descripción del gasto" onChange={e => setForm({ ...form, concepto: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>DEBE (EGRESO) S/</label>
                  <input type="number" style={inp} value={form.monto_debe} placeholder="0.00" onChange={e => setForm({ ...form, monto_debe: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>HABER (INGRESO) S/</label>
                  <input type="number" style={inp} value={form.monto_haber} placeholder="0.00" onChange={e => setForm({ ...form, monto_haber: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA *</label>
                  <input type="date" style={inp} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>TIPO COMPROBANTE</label>
                  <select style={inp} value={form.tipo_comprobante} onChange={e => setForm({ ...form, tipo_comprobante: e.target.value })}>
                    {TIPOS_COMPROBANTE.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>N° OPERACIÓN / COMPROBANTE</label>
                <input style={inp} value={form.numero_operacion} placeholder="Ej: F001-00123" onChange={e => setForm({ ...form, numero_operacion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>PROYECTO (opcional)</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Sin proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>CATEGORÍA (opcional)</label>
                  <select style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>RQ RELACIONADO (opcional)</label>
                <select style={inp} value={form.rq_id} onChange={e => setForm({ ...form, rq_id: e.target.value })}>
                  <option value="">Sin RQ</option>
                  {rqs.map(r => <option key={r.id} value={r.id}>{rqCodigo(r)} — {r.descripcion?.slice(0, 40) || "Sin descripción"}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>DESTINATARIO / PARA QUIÉN</label>
                <input style={inp} value={form.destinatario} placeholder="Ej: Maria Paula, Producción..." onChange={e => setForm({ ...form, destinatario: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>OBSERVACIONES</label>
                <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={form.observaciones} placeholder="Notas adicionales..." onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm({ ...formVacio }) }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
