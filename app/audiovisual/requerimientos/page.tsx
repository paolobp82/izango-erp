"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"

const PIEZAS = ["Video", "3D", "Imagenes IA", "Dinamica", "Graficas", "Adaptacion", "Otros"]
const PRIORIDADES: Record<string, any> = {
  alta: { label: "Alta", bg: "#fee2e2", color: "#991b1b" },
  media: { label: "Media", bg: "#fef9c3", color: "#92400e" },
  baja: { label: "Baja", bg: "#f3f4f6", color: "#6b7280" },
}
const ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  en_progreso: { label: "En progreso", bg: "#dbeafe", color: "#1e40af" },
  en_revision: { label: "En revision", bg: "#f5f3ff", color: "#6d28d9" },
  completado: { label: "Completado", bg: "#dcfce7", color: "#15803d" },
  cancelado: { label: "Cancelado", bg: "#fee2e2", color: "#991b1b" },
}
const AUDIOVISUAL_EMAILS = [
  "pbastianelli@izango.com.pe",
  "pcampos@izango.com.pe",
  "aestupinan@izango.com.pe",
  "gveliz@izango.com.pe",
]

const formVacio = {
  proyecto_id: "",
  cotizacion_id: "",
  ubicacion: "",
  productor_id: "",
  responsable_audiovisual_id: "",
  fecha_entrega_solicitada: "",
  fecha_devolucion_audiovisual: "",
  piezas: [] as string[],
  pieza_otros_descripcion: "",
  brief: "",
  prioridad: "media",
  avance: "10",
  referencia_url: "",
  documento_url: "",
  artes_url: "",
  estado: "pendiente",
}

export default function AudiovisualRequerimientosPage() {
  const supabase = createClient()
  const [requerimientos, setRequerimientos] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savingCom, setSavingCom] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ ...formVacio })

  useEffect(() => { load() }, [])

  async function load() {
    const proyectoIdParam = new URLSearchParams(window.location.search).get("proyecto_id") || ""
    const requerimientoIdParam = new URLSearchParams(window.location.search).get("requerimiento_id") || ""
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }

    const { data: reqs } = await supabase
      .from("audiovisual_requerimientos")
      .select("*, proyecto:proyectos(id,nombre,codigo), cotizacion:cotizaciones(id,version,total_cliente), productor:perfiles!productor_id(nombre,apellido), responsable:perfiles!responsable_audiovisual_id(nombre,apellido), creador:perfiles!creado_por(nombre,apellido)")
      .order("created_at", { ascending: false })
    setRequerimientos(reqs || [])

    const { data: proys } = await supabase
      .from("proyectos")
      .select("id,nombre,codigo,productor_id,fecha_inicio,fecha_fin_estimada,productor:perfiles!productor_id(nombre,apellido)")
      .order("created_at", { ascending: false })
    setProyectos(proys || [])

    const { data: prods } = await supabase.from("perfiles").select("id,nombre,apellido,perfil").eq("activo", true).order("nombre")
    setProductores(prods || [])

    if (requerimientoIdParam) {
      const reqParam = (reqs || []).find((r: any) => r.id === requerimientoIdParam)
      if (reqParam) await abrirDetalle(reqParam)
    } else if (proyectoIdParam) {
      const proyectoParam = (proys || []).find((p: any) => p.id === proyectoIdParam)
      setEditando(null)
      setForm({
        ...formVacio,
        proyecto_id: proyectoIdParam,
        productor_id: proyectoParam?.productor_id || "",
      })
      await loadCotizaciones(proyectoIdParam)
      setShowForm(true)
    }
  }

  async function loadCotizaciones(proyectoId: string) {
    if (!proyectoId) { setCotizaciones([]); return }
    const { data } = await supabase
      .from("cotizaciones")
      .select("id,version,estado,total_cliente")
      .eq("proyecto_id", proyectoId)
      .is("deleted_at", null)
      .order("version")
    setCotizaciones(data || [])
  }

  async function loadComentarios(reqId: string) {
    const { data } = await supabase
      .from("audiovisual_requerimiento_comentarios")
      .select("*, usuario:perfiles(nombre,apellido)")
      .eq("requerimiento_id", reqId)
      .order("created_at", { ascending: true })
    setComentarios(data || [])
  }

  async function abrirDetalle(req: any) {
    setSelected(req)
    await loadComentarios(req.id)
  }

  async function abrirNuevo(proyectoId = "") {
    const proyecto = proyectos.find(p => p.id === proyectoId)
    setEditando(null)
    setForm({
      ...formVacio,
      proyecto_id: proyectoId,
      productor_id: proyecto?.productor_id || "",
    })
    await loadCotizaciones(proyectoId)
    setShowForm(true)
  }

  async function abrirEditar(req: any) {
    setEditando(req)
    setForm({
      proyecto_id: req.proyecto_id || "",
      cotizacion_id: req.cotizacion_id || "",
      ubicacion: req.ubicacion || "",
      productor_id: req.productor_id || "",
      responsable_audiovisual_id: req.responsable_audiovisual_id || "",
      fecha_entrega_solicitada: req.fecha_entrega_solicitada || "",
      fecha_devolucion_audiovisual: req.fecha_devolucion_audiovisual || "",
      piezas: req.piezas || [],
      pieza_otros_descripcion: req.pieza_otros_descripcion || "",
      brief: req.brief || "",
      prioridad: req.prioridad || "media",
      avance: String(req.avance || 10),
      referencia_url: req.referencia_url || "",
      documento_url: req.documento_url || "",
      artes_url: req.artes_url || "",
      estado: req.estado || "pendiente",
    })
    await loadCotizaciones(req.proyecto_id)
    setShowForm(true)
  }

  async function handleProyectoChange(proyectoId: string) {
    const proyecto = proyectos.find(p => p.id === proyectoId)
    setForm(prev => ({ ...prev, proyecto_id: proyectoId, cotizacion_id: "", productor_id: proyecto?.productor_id || prev.productor_id }))
    await loadCotizaciones(proyectoId)
  }

  function togglePieza(pieza: string) {
    setForm(prev => ({
      ...prev,
      piezas: prev.piezas.includes(pieza) ? prev.piezas.filter(p => p !== pieza) : [...prev.piezas, pieza],
      pieza_otros_descripcion: pieza === "Otros" && prev.piezas.includes(pieza) ? "" : prev.pieza_otros_descripcion,
    }))
  }

  async function uploadDocumento(file: File) {
    setUploading(true)
    const path = `audiovisual/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) {
      alert("Error subiendo archivo: " + error.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from("assets").getPublicUrl(path)
    setForm(prev => ({ ...prev, documento_url: data.publicUrl }))
    setUploading(false)
  }

  async function enviarCorreo(req: any) {
    const proyecto = proyectos.find(p => p.id === req.proyecto_id)
    const productor = productores.find(p => p.id === req.productor_id)
    await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "audiovisual_requerimiento_creado",
        destinatarios: AUDIOVISUAL_EMAILS,
        datos: {
          proyecto: proyecto ? `${proyecto.codigo} - ${proyecto.nombre}` : "Sin proyecto",
          productor: productor ? `${productor.nombre} ${productor.apellido}` : "Sin productor",
          prioridad: PRIORIDADES[req.prioridad]?.label || req.prioridad,
          fecha_entrega_solicitada: req.fecha_entrega_solicitada || "-",
          piezas: (req.piezas || []).join(", ") || "-",
        },
      }),
    })
  }

  async function guardar() {
    if (!form.proyecto_id) { alert("Selecciona un proyecto"); return }
    if (!form.fecha_entrega_solicitada) { alert("La fecha solicitada por produccion es obligatoria"); return }
    if (form.piezas.length === 0) { alert("Selecciona al menos una pieza necesaria"); return }
    if (form.piezas.includes("Otros") && !form.pieza_otros_descripcion.trim()) { alert("Describe la pieza requerida en Otros"); return }
    setSaving(true)
    const payload = {
      proyecto_id: form.proyecto_id,
      cotizacion_id: form.cotizacion_id || null,
      ubicacion: form.ubicacion || null,
      productor_id: form.productor_id || null,
      responsable_audiovisual_id: form.responsable_audiovisual_id || null,
      fecha_entrega_solicitada: form.fecha_entrega_solicitada || null,
      fecha_devolucion_audiovisual: form.fecha_devolucion_audiovisual || null,
      piezas: form.piezas,
      pieza_otros_descripcion: form.piezas.includes("Otros") ? form.pieza_otros_descripcion.trim() : null,
      brief: form.brief || null,
      prioridad: form.prioridad,
      avance: Number(form.avance) || 10,
      referencia_url: form.referencia_url || null,
      documento_url: form.documento_url || null,
      artes_url: form.artes_url || null,
      estado: form.estado,
      creado_por: perfil?.id || null,
      updated_at: new Date().toISOString(),
    }

    if (editando) {
      const { error } = await supabase.from("audiovisual_requerimientos").update(payload).eq("id", editando.id)
      if (error) { alert("Error: " + error.message); setSaving(false); return }
      await registrarAccion({ accion: "editar", modulo: "audiovisual", entidad_tipo: "requerimiento_audiovisual", entidad_id: editando.id, descripcion: "Requerimiento audiovisual editado" })
    } else {
      const { data, error } = await supabase.from("audiovisual_requerimientos").insert(payload).select().single()
      if (error) { alert("Error: " + error.message); setSaving(false); return }
      await registrarAccion({ accion: "crear", modulo: "audiovisual", entidad_tipo: "requerimiento_audiovisual", entidad_id: data?.id, descripcion: "Requerimiento audiovisual creado" })
      await enviarCorreo(payload)
    }
    setSaving(false)
    setShowForm(false)
    await load()
  }

  async function cambiarEstado(req: any, estado: string) {
    const payload = { estado, updated_at: new Date().toISOString() }
    await supabase.from("audiovisual_requerimientos").update(payload).eq("id", req.id)
    setRequerimientos(prev => prev.map(r => r.id === req.id ? { ...r, ...payload } : r))
    if (selected?.id === req.id) setSelected((prev: any) => ({ ...prev, ...payload }))
  }

  async function agregarComentario() {
    if (!nuevoComentario.trim() || !selected) return
    setSavingCom(true)
    await supabase.from("audiovisual_requerimiento_comentarios").insert({
      requerimiento_id: selected.id,
      usuario_id: perfil?.id || null,
      comentario: nuevoComentario.trim(),
    })
    setNuevoComentario("")
    await loadComentarios(selected.id)
    setSavingCom(false)
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }
  const puedeDefinirDevolucion = editando && ["superadmin", "gerente_general", "gerente_produccion", "gerente_operaciones", "project_manager", "audiovisual"].includes(perfil?.perfil)
  const hoy = new Date().toISOString().split("T")[0]
  const vencidos = requerimientos.filter(r => r.fecha_entrega_solicitada && r.fecha_entrega_solicitada < hoy && !["completado", "cancelado"].includes(r.estado)).length
  const enCurso = requerimientos.filter(r => r.estado === "en_progreso" || r.estado === "en_revision").length

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Requerimientos audiovisuales</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Solicitudes de produccion para piezas audiovisuales, artes y entregables.</p>
          </div>
          <button onClick={() => abrirNuevo()} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo requerimiento</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total requerimientos", value: requerimientos.length, bg: "#f3f4f6", color: "#374151" },
            { label: "En seguimiento", value: enCurso, bg: "#dbeafe", color: "#1e40af" },
            { label: "Vencidos", value: vencidos, bg: "#fee2e2", color: "#991b1b" },
          ].map(c => (
            <div key={c.label} className="card" style={{ background: c.bg, border: "none", padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "uppercase" }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {requerimientos.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay requerimientos audiovisuales registrados</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1D2040" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#fff" }}>PROYECTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>PIEZAS</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>PRIORIDAD</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>AVANCE</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>ENTREGA</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {requerimientos.map((r, idx) => {
                  const pr = PRIORIDADES[r.prioridad] || PRIORIDADES.media
                  const vencido = r.fecha_entrega_solicitada && r.fecha_entrega_solicitada < hoy && !["completado", "cancelado"].includes(r.estado)
                  return (
                    <tr key={r.id} onClick={() => abrirDetalle(r)} style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === r.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{r.proyecto?.codigo || "-"}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{r.proyecto?.nombre || "Sin proyecto"}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{(r.piezas || []).join(", ") || "-"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}><span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{pr.label}</span></td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: "#374151", fontWeight: 700 }}>{r.avance || 10}%</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: vencido ? "#991b1b" : "#6b7280", fontWeight: vencido ? 700 : 400 }}>{r.fecha_entrega_solicitada || "-"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); abrirEditar(r) }} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Editar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div style={{ width: 390, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{selected.proyecto?.codigo || "Requerimiento"}</h2>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{selected.proyecto?.nombre}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>x</button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>ESTADO</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <button key={k} onClick={() => cambiarEstado(selected, k)}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, border: selected.estado === k ? "2px solid #1D9E75" : "1px solid #e5e7eb", background: selected.estado === k ? v.bg : "#fff", color: selected.estado === k ? v.color : "#6b7280", cursor: "pointer", fontWeight: selected.estado === k ? 700 : 400 }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Cotizacion", value: selected.cotizacion ? `V${selected.cotizacion.version}` : "-" },
              { label: "Productor", value: selected.productor ? `${selected.productor.nombre} ${selected.productor.apellido}` : "-" },
              { label: "Responsable audiovisual", value: selected.responsable ? `${selected.responsable.nombre} ${selected.responsable.apellido}` : "-" },
              { label: "Ubicacion", value: selected.ubicacion || "-" },
              { label: "Entrega solicitada", value: selected.fecha_entrega_solicitada || "-" },
              { label: "Devolucion audiovisual", value: selected.fecha_devolucion_audiovisual || "-" },
              { label: "Piezas", value: (selected.piezas || []).join(", ") || "-" },
              { label: "Otros", value: selected.pieza_otros_descripcion || "-" },
              { label: "Avance", value: `${selected.avance || 10}%` },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, gap: 10 }}>
                <span style={{ color: "#9ca3af", fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "#374151", textAlign: "right", maxWidth: 220 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {(selected.referencia_url || selected.documento_url || selected.artes_url) && (
            <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>REFERENCIAS</div>
              {selected.referencia_url && <a href={selected.referencia_url} target="_blank" style={{ display: "block", fontSize: 12, color: "#0F6E56", marginBottom: 6 }}>Referencia / documento</a>}
              {selected.documento_url && <a href={selected.documento_url} target="_blank" style={{ display: "block", fontSize: 12, color: "#0F6E56", marginBottom: 6 }}>Archivo adjunto</a>}
              {selected.artes_url && <a href={selected.artes_url} target="_blank" style={{ display: "block", fontSize: 12, color: "#0F6E56" }}>Artes relacionados</a>}
            </div>
          )}

          {selected.brief && (
            <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>INDICACIONES / BRIEF</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{selected.brief}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #f3f4f6" }}>COMENTARIOS ({comentarios.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {comentarios.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin comentarios aun</div>}
              {comentarios.map(c => (
                <div key={c.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{c.usuario?.nombre} {c.usuario?.apellido}</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(c.created_at).toLocaleString("es-PE")}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{c.comentario}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Escribe un comentario..." value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} onKeyDown={e => e.key === "Enter" && agregarComentario()} />
              <button onClick={agregarComentario} disabled={savingCom || !nuevoComentario.trim()} className="btn-primary" style={{ fontSize: 13 }}>{savingCom ? "..." : "Enviar"}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar requerimiento audiovisual" : "Nuevo requerimiento audiovisual"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>PROYECTO *</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => handleProyectoChange(e.target.value)}>
                    <option value="">Seleccionar proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>COTIZACION / PROFORMA</label>
                  <select style={inp} value={form.cotizacion_id} onChange={e => setForm({ ...form, cotizacion_id: e.target.value })}>
                    <option value="">Sin proforma especifica</option>
                    {cotizaciones.map(c => <option key={c.id} value={c.id}>V{c.version} - {c.estado}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>UBICACION DEL PROYECTO</label>
                  <input style={inp} value={form.ubicacion} placeholder="Sede, ciudad, venue o referencia" onChange={e => setForm({ ...form, ubicacion: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>PRODUCTOR A CARGO</label>
                  <select style={inp} value={form.productor_id} onChange={e => setForm({ ...form, productor_id: e.target.value })}>
                    <option value="">Sin productor</option>
                    {productores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>RESPONSABLE AUDIOVISUAL</label>
                <select style={inp} value={form.responsable_audiovisual_id} onChange={e => setForm({ ...form, responsable_audiovisual_id: e.target.value })}>
                  <option value="">Sin responsable asignado</option>
                  {productores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA DE ENTREGA SOLICITADA *</label>
                  <input style={inp} type="date" value={form.fecha_entrega_solicitada} onChange={e => setForm({ ...form, fecha_entrega_solicitada: e.target.value })} />
                </div>
                {puedeDefinirDevolucion && (
                  <div>
                    <label style={lbl}>FECHA DE DEVOLUCION AUDIOVISUAL</label>
                    <input style={inp} type="date" value={form.fecha_devolucion_audiovisual} onChange={e => setForm({ ...form, fecha_devolucion_audiovisual: e.target.value })} />
                  </div>
                )}
              </div>

              <div>
                <label style={lbl}>PIEZAS NECESARIAS *</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PIEZAS.map(pieza => (
                    <button key={pieza} type="button" onClick={() => togglePieza(pieza)}
                      style={{ padding: "6px 10px", borderRadius: 99, border: form.piezas.includes(pieza) ? "2px solid #0F6E56" : "1px solid #e5e7eb", background: form.piezas.includes(pieza) ? "#dcfce7" : "#fff", color: form.piezas.includes(pieza) ? "#15803d" : "#374151", fontSize: 12, fontWeight: form.piezas.includes(pieza) ? 700 : 500, cursor: "pointer" }}>
                      {pieza}
                    </button>
                  ))}
                </div>
              </div>

              {form.piezas.includes("Otros") && (
                <div>
                  <label style={lbl}>DESCRIBE LA PIEZA REQUERIDA *</label>
                  <input style={inp} value={form.pieza_otros_descripcion} placeholder="Ej. animacion especial, formato no estandar, pieza experimental..." onChange={e => setForm({ ...form, pieza_otros_descripcion: e.target.value })} />
                </div>
              )}

              <div>
                <label style={lbl}>INDICACIONES / BRIEF DEL REQUERIMIENTO</label>
                <textarea style={{ ...inp, minHeight: 110, resize: "vertical" }} value={form.brief} placeholder="Detalle dinamica, estilo, referencias, formatos, restricciones, duracion, entregables o cualquier indicacion relevante." onChange={e => setForm({ ...form, brief: e.target.value })} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>PRIORIDAD</label>
                  <select style={inp} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>ESTATUS DE AVANCE</label>
                  <select style={inp} value={form.avance} onChange={e => setForm({ ...form, avance: e.target.value })}>
                    {[10,20,30,40,50,60,70,80,90,100].map(n => <option key={n} value={n}>{n}%</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>ESTADO</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>REFERENCIAS / DOCUMENTOS (LINK)</label>
                  <input style={inp} value={form.referencia_url} placeholder="https://..." onChange={e => setForm({ ...form, referencia_url: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>ARTES RELACIONADOS</label>
                  <input style={inp} value={form.artes_url} placeholder="https://..." onChange={e => setForm({ ...form, artes_url: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={lbl}>ADJUNTAR ARCHIVO</label>
                <input style={inp} type="file" onChange={e => e.target.files?.[0] && uploadDocumento(e.target.files[0])} />
                {uploading && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Subiendo archivo...</div>}
                {form.documento_url && <a href={form.documento_url} target="_blank" style={{ display: "inline-block", marginTop: 6, fontSize: 12, color: "#0F6E56" }}>Archivo adjunto cargado</a>}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving || uploading} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear y alertar audiovisual"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
