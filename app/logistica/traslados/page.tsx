"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeAccederRuta } from "@/lib/permissions"

const ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  programado: { label: "Programado", bg: "#dbeafe", color: "#1e40af" },
  en_proceso: { label: "En proceso", bg: "#e0f2fe", color: "#0369a1" },
  en_transito: { label: "En tránsito", bg: "#f5f3ff", color: "#6d28d9" },
  entregado: { label: "Entregado", bg: "#dcfce7", color: "#15803d" },
  observado: { label: "Observado", bg: "#fed7aa", color: "#9a3412" },
  cancelado: { label: "Cancelado", bg: "#fee2e2", color: "#991b1b" },
}

const formVacio: any = {
  titulo: "",
  proyecto_id: "",
  punto_recojo: "",
  punto_entrega: "",
  contacto_receptor: "",
  dni_receptor: "",
  telefono_receptor: "",
  fecha_salida: "",
  fecha_entrega: "",
  estado: "pendiente",
  responsable_id: "",
  notas: "",
}

export default function TrasladosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [traslados, setTraslados] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ ...formVacio })
  const [items, setItems] = useState<any[]>([{ descripcion: "", cantidad: 1, notas: "" }])
  const [filtroEstado, setFiltroEstado] = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeAccederRuta(p?.perfil, "/logistica/traslados")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const [{ data: trs }, { data: pros }, { data: us }] = await Promise.all([
      supabase
        .from("logistica_traslados")
        .select("*, proyecto:proyectos(nombre,codigo), responsable:perfiles!responsable_id(nombre,apellido), solicitante:perfiles!solicitado_por(nombre,apellido), logistica_traslado_items(*)")
        .order("created_at", { ascending: false }),
      supabase.from("proyectos").select("id,nombre,codigo").is("deleted_at", null).order("nombre"),
      supabase.from("perfiles").select("id,nombre,apellido,perfil").eq("activo", true).order("apellido"),
    ])

    setTraslados(trs || [])
    setProyectos(pros || [])
    setUsuarios(us || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setSelected(null)
    setForm({ ...formVacio })
    setItems([{ descripcion: "", cantidad: 1, notas: "" }])
    setShowForm(true)
  }

  function agregarItem() {
    setItems(prev => [...prev, { descripcion: "", cantidad: 1, notas: "" }])
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!autorizado) return
    if (!form.titulo || !form.punto_recojo || !form.punto_entrega) {
      alert("Título, punto de recojo y punto de entrega son obligatorios")
      return
    }

    const validItems = items.filter(i => i.descripcion)
    if (validItems.length === 0) {
      alert("Agrega al menos un material")
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const codigo = "MOV-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-6)

    const { data: traslado, error } = await supabase
      .from("logistica_traslados")
      .insert({
        codigo,
        titulo: form.titulo,
        proyecto_id: form.proyecto_id || null,
        punto_recojo: form.punto_recojo,
        punto_entrega: form.punto_entrega,
        contacto_receptor: form.contacto_receptor || null,
        dni_receptor: form.dni_receptor || null,
        telefono_receptor: form.telefono_receptor || null,
        fecha_salida: form.fecha_salida || null,
        fecha_entrega: form.fecha_entrega || null,
        estado: form.estado || "pendiente",
        responsable_id: form.responsable_id || null,
        solicitado_por: user?.id || null,
        notas: form.notas || null,
        entidad: "peru",
      })
      .select()
      .single()

    if (error) {
      alert("Error creando traslado: " + error.message)
      setSaving(false)
      return
    }

    await supabase.from("logistica_traslado_items").insert(
      validItems.map(i => ({
        traslado_id: traslado.id,
        descripcion: i.descripcion,
        cantidad: Number(i.cantidad) || 1,
        notas: i.notas || null,
      }))
    )

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("logistica_traslados").update({ estado, updated_at: new Date().toISOString() }).eq("id", id)
    load()
  }

  function seleccionarArchivoEntrega(accept: string) {
    return new Promise<File | null>((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = accept
      input.onchange = () => resolve(input.files?.[0] || null)
      input.click()
    })
  }

  async function subirArchivoTraslado(file: File, carpeta: string) {
    const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `logistica-traslados/${carpeta}/${Date.now()}-${nombreSeguro}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from("assets").getPublicUrl(path)
    return data.publicUrl
  }

  async function registrarEntregaTraslado(t: any) {
    const recibidoPor = prompt("¿Quién recibió el traslado?", t.contacto_receptor || "")
    if (!recibidoPor) return

    const fechaReal = prompt("Fecha real de entrega (YYYY-MM-DD)", new Date().toISOString().slice(0, 10))
    if (!fechaReal) return

    alert("Selecciona el cargo firmado en PDF/JPG/PNG.")
    const cargoFirmado = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")
    if (!cargoFirmado) return

    alert("Selecciona la evidencia fotográfica o archivo adicional. Puedes cancelar si no aplica.")
    const evidencia = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")

    try {
      const cargoUrl = await subirArchivoTraslado(cargoFirmado, "cargos-firmados")
      const evidenciaUrl = evidencia ? await subirArchivoTraslado(evidencia, "evidencias") : null

      const { error } = await supabase.from("logistica_traslados").update({
        cargo_firmado_url: cargoUrl,
        evidencia_url: evidenciaUrl,
        recibido_por: recibidoPor,
        fecha_entrega_real: fechaReal,
        estado: "entregado",
        updated_at: new Date().toISOString(),
      }).eq("id", t.id)

      if (error) {
        alert("Error registrando entrega: " + error.message)
        return
      }

      alert("Entrega registrada correctamente.")
      load()
      if (selected?.id === t.id) {
        setSelected((p: any) => ({
          ...p,
          cargo_firmado_url: cargoUrl,
          evidencia_url: evidenciaUrl,
          recibido_por: recibidoPor,
          fecha_entrega_real: fechaReal,
          estado: "entregado",
        }))
      }
    } catch (error: any) {
      alert("Error subiendo evidencia: " + (error?.message || error))
    }
  }

  function imprimirCargo(t: any) {
    const filas = (t.logistica_traslado_items || []).map((i:any) => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px">${i.descripcion}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${i.cantidad}</td>
        <td style="border:1px solid #ddd;padding:6px">${i.notas || ""}</td>
      </tr>
    `).join("")

    const html = `
      <html>
      <head><title>Cargo ${t.codigo}</title></head>
      <body style="font-family:Arial;padding:32px;color:#111">
        <h1>Cargo de traslado / movimiento</h1>
        <p><b>Código:</b> ${t.codigo || ""}</p>
        <p><b>Título:</b> ${t.titulo || ""}</p>
        <p><b>Proyecto:</b> ${t.proyecto ? t.proyecto.codigo + " — " + t.proyecto.nombre : "No asociado"}</p>
        <hr/>
        <p><b>Punto de recojo:</b> ${t.punto_recojo || ""}</p>
        <p><b>Punto de entrega:</b> ${t.punto_entrega || ""}</p>
        <p><b>Contacto receptor:</b> ${t.contacto_receptor || ""}</p>
        <p><b>DNI:</b> ${t.dni_receptor || ""}</p>
        <p><b>Teléfono:</b> ${t.telefono_receptor || ""}</p>
        <p><b>Fecha salida:</b> ${t.fecha_salida || ""}</p>
        <p><b>Fecha entrega:</b> ${t.fecha_entrega || ""}</p>
        <h3>Materiales</h3>
        <table style="border-collapse:collapse;width:100%">
          <thead>
            <tr>
              <th style="border:1px solid #ddd;padding:6px;text-align:left">Material</th>
              <th style="border:1px solid #ddd;padding:6px;text-align:right">Cantidad</th>
              <th style="border:1px solid #ddd;padding:6px;text-align:left">Notas</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div style="margin-top:80px;display:flex;gap:80px">
          <div>_________________________<br/>Entrega</div>
          <div>_________________________<br/>Recibe</div>
        </div>
      </body>
      </html>
    `
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const filtrados = traslados.filter(t => !filtroEstado || t.estado === filtroEstado)
  const inp: any = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box" }
  const lbl: any = { fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4, display: "block" }

  if (loading) return <div style={{ padding: 24, color: "#6b7280" }}>Cargando...</div>
  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Traslados y Movimientos</h1>
          <p style={{ fontSize: 13, color:"#64748b", marginTop: 4 }}>Movimientos menores con cargo imprimible y evidencia de entrega.</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo traslado</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select style={{ ...inp, maxWidth: 220 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius: 14, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              <th style={{ padding: "10px 12px", textAlign:"left", fontSize: 11 }}>CÓDIGO</th>
              <th style={{ padding: "10px 12px", textAlign:"left", fontSize: 11 }}>TÍTULO</th>
              <th style={{ padding: "10px 12px", textAlign:"left", fontSize: 11 }}>RECOJO</th>
              <th style={{ padding: "10px 12px", textAlign:"left", fontSize: 11 }}>ENTREGA</th>
              <th style={{ padding: "10px 12px", textAlign:"left", fontSize: 11 }}>ESTADO</th>
              <th style={{ padding: "10px 12px", textAlign:"right", fontSize: 11 }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(t => {
              const e = ESTADOS[t.estado] || ESTADOS.pendiente
              return (
                <tr key={t.id} onClick={() => setSelected(t)} style={{ borderTop:"1px solid #f1f5f9", cursor:"pointer" }}>
                  <td style={{ padding:"12px", fontSize:12, color:"#64748b" }}>{t.codigo}</td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:700 }}>{t.titulo}</td>
                  <td style={{ padding:"12px", fontSize:12 }}>{t.punto_recojo}</td>
                  <td style={{ padding:"12px", fontSize:12 }}>{t.punto_entrega}</td>
                  <td style={{ padding:"12px" }}>
                    <select value={t.estado} onClick={e => e.stopPropagation()} onChange={e => cambiarEstado(t.id, e.target.value)} style={{ padding:"4px 8px", borderRadius:8, border:"1px solid #e5e7eb", background:e.bg, color:e.color, fontSize:12, fontWeight:700 }}>
                      {Object.entries(ESTADOS).map(([k,v]: any) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"12px", textAlign:"right" }}>
                                        <button onClick={ev => { ev.stopPropagation(); imprimirCargo(t) }} className="btn-secondary" style={{ fontSize:12 }}>PDF / Imprimir</button>
                    {["programado", "en_proceso", "en_transito", "entregado"].includes(t.estado) && (
                      <button onClick={ev => { ev.stopPropagation(); registrarEntregaTraslado(t) }} className="btn-secondary" style={{ fontSize:12, marginLeft:6 }}>Entrega</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && <tr><td colSpan={6} style={{ padding:30, textAlign:"center", color:"#94a3b8" }}>Sin traslados registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ marginTop: 18, background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:18 }}>
          <h2 style={{ fontSize:16, marginTop:0 }}>{selected.codigo} — {selected.titulo}</h2>
          <p><b>Recojo:</b> {selected.punto_recojo}</p>
          <p><b>Entrega:</b> {selected.punto_entrega}</p>
          <p><b>Receptor:</b> {selected.contacto_receptor || "—"} / {selected.dni_receptor || "—"} / {selected.telefono_receptor || "—"}</p>
          <p><b>Notas:</b> {selected.notas || "—"}</p>
                    <p><b>Fecha real entrega:</b> {selected.fecha_entrega_real || "—"}</p>
          <p><b>Recibido por:</b> {selected.recibido_por || "—"}</p>
          <p><b>Cargo firmado:</b> {selected.cargo_firmado_url ? <a href={selected.cargo_firmado_url} target="_blank">Ver archivo</a> : "Pendiente"}</p>
          <p><b>Evidencia:</b> {selected.evidencia_url ? <a href={selected.evidencia_url} target="_blank">Ver archivo</a> : "Pendiente"}</p>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", justifyContent:"center", alignItems:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:24, width:"100%", maxWidth:760, maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h2 style={{ margin:0, fontSize:18 }}>Nuevo traslado / movimiento</h2>
              <button onClick={() => setShowForm(false)} style={{ border:0, background:"transparent", fontSize:22, cursor:"pointer" }}>×</button>
            </div>

            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label style={lbl}>TÍTULO *</label>
                <input style={inp} value={form.titulo} onChange={e => setForm({ ...form, titulo:e.target.value })} />
              </div>

              <div>
                <label style={lbl}>PROYECTO OPCIONAL</label>
                <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id:e.target.value })}>
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                </select>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>PUNTO DE RECOJO *</label>
                  <input style={inp} value={form.punto_recojo} onChange={e => setForm({ ...form, punto_recojo:e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>PUNTO DE ENTREGA *</label>
                  <input style={inp} value={form.punto_entrega} onChange={e => setForm({ ...form, punto_entrega:e.target.value })} />
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div><label style={lbl}>CONTACTO RECEPTOR</label><input style={inp} value={form.contacto_receptor} onChange={e => setForm({ ...form, contacto_receptor:e.target.value })} /></div>
                <div><label style={lbl}>DNI</label><input style={inp} value={form.dni_receptor} onChange={e => setForm({ ...form, dni_receptor:e.target.value })} /></div>
                <div><label style={lbl}>TELÉFONO</label><input style={inp} value={form.telefono_receptor} onChange={e => setForm({ ...form, telefono_receptor:e.target.value })} /></div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>FECHA SALIDA</label><input type="date" style={inp} value={form.fecha_salida} onChange={e => setForm({ ...form, fecha_salida:e.target.value })} /></div>
                <div><label style={lbl}>FECHA ENTREGA</label><input type="date" style={inp} value={form.fecha_entrega} onChange={e => setForm({ ...form, fecha_entrega:e.target.value })} /></div>
              </div>

              <div>
                <label style={lbl}>MATERIALES</label>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 100px 1fr 32px", gap:8, marginBottom:8 }}>
                    <input style={inp} placeholder="Descripción" value={it.descripcion} onChange={e => updateItem(idx, "descripcion", e.target.value)} />
                    <input type="number" style={inp} value={it.cantidad} onChange={e => updateItem(idx, "cantidad", e.target.value)} />
                    <input style={inp} placeholder="Notas" value={it.notas} onChange={e => updateItem(idx, "notas", e.target.value)} />
                    <button onClick={() => removeItem(idx)} className="btn-secondary">×</button>
                  </div>
                ))}
                <button onClick={agregarItem} className="btn-secondary" style={{ fontSize:12 }}>+ Agregar material</button>
              </div>

              <div>
                <label style={lbl}>NOTAS</label>
                <textarea style={{ ...inp, minHeight:80 }} value={form.notas} onChange={e => setForm({ ...form, notas:e.target.value })} />
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? "Guardando..." : "Crear traslado"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

