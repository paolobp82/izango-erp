"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"

const ESTADOS: Record<string, any> = {
  nuevo:        { bg: "#dbeafe", color: "#1e40af", label: "Nuevo" },
  contactado:   { bg: "#fef9c3", color: "#92400e", label: "Contactado" },
  reunion:      { bg: "#fed7aa", color: "#9a3412", label: "Reunion" },
  propuesta:    { bg: "#f5f3ff", color: "#6d28d9", label: "Propuesta" },
  negociacion:  { bg: "#fce7f3", color: "#9d174d", label: "Negociacion" },
  ganado:       { bg: "#dcfce7", color: "#15803d", label: "Ganado" },
  perdido:      { bg: "#fee2e2", color: "#991b1b", label: "Perdido" },
}

const TEMPERATURAS: Record<string, any> = {
  frio:     { color: "#3b82f6", label: "Frio" },
  tibio:    { color: "#f59e0b", label: "Tibio" },
  caliente: { color: "#ef4444", label: "Caliente" },
}

const ORIGENES = ["Referido", "Web", "LinkedIn", "Evento", "Llamada fria", "Email", "Otro"]
const INDUSTRIAS = ["Retail", "Banca", "Tecnologia", "Alimentos", "Automotriz", "Farmaceutica", "Telecomunicaciones", "Gobierno", "Educacion", "Otro"]

const emptyForm = {
  razon_social: "", ruc: "", nombre_contacto: "", email_contacto: "",
  telefono_contacto: "", cargo_contacto: "", origen: "", estado: "nuevo",
  temperatura: "frio", industria: "", presupuesto_estimado: "",
  probabilidad_cierre: 0, fecha_proximo_contacto: "", notas: "",
}

export default function CRMPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTemp, setFiltroTemp] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState<any>(emptyForm)
  const [nuevaNota, setNuevaNota] = useState("")
  const [notas, setNotas] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function loadNotas(leadId: string) {
    const { data } = await supabase.from("crm_notas").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
    setNotas(data || [])
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function abrirEditar(lead: any) {
    setEditando(lead)
    setForm({
      razon_social: lead.razon_social || "", ruc: lead.ruc || "",
      nombre_contacto: lead.nombre_contacto || "", email_contacto: lead.email_contacto || "",
      telefono_contacto: lead.telefono_contacto || "", cargo_contacto: lead.cargo_contacto || "",
      origen: lead.origen || "", estado: lead.estado || "nuevo",
      temperatura: lead.temperatura || "frio", industria: lead.industria || "",
      presupuesto_estimado: lead.presupuesto_estimado || "",
      probabilidad_cierre: lead.probabilidad_cierre || 0,
      fecha_proximo_contacto: lead.fecha_proximo_contacto || "", notas: lead.notas || "",
    })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.razon_social) { alert("Razon social es obligatoria"); return }
    setSaving(true)
    const payload = { ...form, presupuesto_estimado: form.presupuesto_estimado ? Number(form.presupuesto_estimado) : null }
    if (editando) {
      await supabase.from("crm_leads").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("crm_leads").insert({ ...payload, entidad: "peru" })
    }
    setSaving(false)
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "crm", entidad_tipo: "lead", descripcion: (editando ? "Lead editado: " : "Lead creado: ") + form.razon_social })
    setShowForm(false)
    load()
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !selected) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("crm_notas").insert({ lead_id: selected.id, contenido: nuevaNota, created_by: user?.id })
    setNuevaNota("")
    loadNotas(selected.id)
  }

  async function cambiarEstado(leadId: string, estado: string) {
    await supabase.from("crm_leads").update({ estado }).eq("id", leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado } : l))
    if (selected?.id === leadId) setSelected((prev: any) => ({ ...prev, estado }))
  }

  async function convertirACliente() {
    if (!selected) return
    if (!confirm("Convertir " + selected.razon_social + " a cliente?")) return
    await supabase.from("clientes").insert({
      razon_social: selected.razon_social, ruc: selected.ruc || null, entidad: "peru",
      nombre_contacto: selected.nombre_contacto || null,
      email_contacto: selected.email_contacto || null,
      telefono_contacto: selected.telefono_contacto || null,
    })
    await supabase.from("crm_leads").update({ estado: "ganado" }).eq("id", selected.id)
    setSelected((prev: any) => ({ ...prev, estado: "ganado" }))
    load()
    alert("Cliente creado en la base de clientes.")
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  const filtrados = leads.filter(l => {
    if (filtroEstado && l.estado !== filtroEstado) return false
    if (filtroTemp && l.temperatura !== filtroTemp) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!l.razon_social?.toLowerCase().includes(q) && !l.nombre_contacto?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPipeline = leads.filter(l => !["ganado","perdido"].includes(l.estado)).reduce((s, l) => s + (l.presupuesto_estimado || 0), 0)
  const totalGanado = leads.filter(l => l.estado === "ganado").reduce((s, l) => s + (l.presupuesto_estimado || 0), 0)
  const tasaConversion = leads.length > 0 ? Math.round((leads.filter(l => l.estado === "ganado").length / leads.length) * 100) : 0

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>CRM</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Seguimiento de clientes potenciales · {leads.length} leads</p>
        </div>
        <ImportExport modulo="crm_leads" campos={[{key:"razon_social",label:"Razon social",requerido:true},{key:"ruc",label:"RUC"},{key:"nombre_contacto",label:"Nombre contacto"},{key:"email_contacto",label:"Email"},{key:"telefono_contacto",label:"Telefono"},{key:"cargo_contacto",label:"Cargo"},{key:"origen",label:"Origen"},{key:"industria",label:"Industria"},{key:"temperatura",label:"Temperatura"},{key:"presupuesto_estimado",label:"Presupuesto estimado"},{key:"probabilidad_cierre",label:"Probabilidad %"}]} datos={leads} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const{error}=await supabase.from("crm_leads").insert({...r,entidad:"peru",estado:"nuevo",temperatura:r.temperatura||"frio"}); if(error)errores.push(r.razon_social+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo lead</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Pipeline total</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af" }}>{fmt(totalPipeline)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{leads.filter(l => !["ganado","perdido"].includes(l.estado)).length} activos</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Ganados</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmt(totalGanado)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{leads.filter(l => l.estado === "ganado").length} clientes</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tasa conversion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}>{tasaConversion}%</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>De leads a clientes</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Calientes</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{leads.filter(l => l.temperatura === "caliente").length}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Requieren atencion</div>
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar lead" : "Nuevo lead"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Razon social *</label><input style={inp} value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></div>
                <div><label style={lbl}>RUC</label><input style={inp} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Nombre contacto</label><input style={inp} value={form.nombre_contacto} onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Email</label><input style={inp} value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Telefono</label><input style={inp} value={form.telefono_contacto} onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo_contacto} onChange={e => setForm({ ...form, cargo_contacto: e.target.value })} /></div>
                <div>
                  <label style={lbl}>Origen</label>
                  <select style={inp} value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {ORIGENES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Industria</label>
                  <select style={inp} value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {INDUSTRIAS.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Estado</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Temperatura</label>
                  <select style={inp} value={form.temperatura} onChange={e => setForm({ ...form, temperatura: e.target.value })}>
                    {Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Presupuesto est.</label><input type="number" style={inp} value={form.presupuesto_estimado} onChange={e => setForm({ ...form, presupuesto_estimado: e.target.value })} /></div>
                <div><label style={lbl}>Probabilidad %</label><input type="number" min={0} max={100} style={inp} value={form.probabilidad_cierre} onChange={e => setForm({ ...form, probabilidad_cierre: Number(e.target.value) })} /></div>
              </div>
              <div><label style={lbl}>Proximo contacto</label><input type="date" style={inp} value={form.fecha_proximo_contacto} onChange={e => setForm({ ...form, fecha_proximo_contacto: e.target.value })} /></div>
              <div><label style={lbl}>Notas</label><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear lead"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 12, padding: "10px 14px" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...inp, width: 220 }} placeholder="Buscar lead..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
                <option value="">Todas las temp.</option>
                {Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(filtroEstado || filtroTemp || busqueda) && (
                <button onClick={() => { setFiltroEstado(""); setFiltroTemp(""); setBusqueda("") }}
                  style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Limpiar</button>
              )}
              <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} resultados</span>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EMPRESA</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONTACTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TEMP.</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRESUPUESTO</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROB.</th>
                  <th style={{ padding: "10px 20px", width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>No hay leads. Crea el primero.</td></tr>
                ) : filtrados.map((lead, idx) => {
                  const ec = ESTADOS[lead.estado] || { bg: "#f3f4f6", color: "#6b7280", label: lead.estado }
                  const tc = TEMPERATURAS[lead.temperatura] || { color: "#6b7280", label: lead.temperatura }
                  return (
                    <tr key={lead.id} onClick={() => { setSelected(lead); loadNotas(lead.id) }}
                      style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === lead.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{lead.razon_social}</div>
                        {lead.industria && <div style={{ fontSize: 11, color: "#9ca3af" }}>{lead.industria}</div>}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontSize: 13, color: "#374151" }}>{lead.nombre_contacto || "—"}</div>
                        {lead.email_contacto && <div style={{ fontSize: 11, color: "#9ca3af" }}>{lead.email_contacto}</div>}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ec.label}</span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: tc.color, fontWeight: 700, fontSize: 13 }}>● {tc.label}</span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                        {lead.presupuesto_estimado ? fmt(lead.presupuesto_estimado) : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: lead.probabilidad_cierre >= 70 ? "#0F6E56" : lead.probabilidad_cierre >= 40 ? "#ca8a04" : "#6b7280" }}>
                          {lead.probabilidad_cierre || 0}%
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); abrirEditar(lead) }} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{selected.razon_social}</h2>
                  {selected.industria && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{selected.industria}</div>}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>x</button>
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                {selected.nombre_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Contacto: </span>{selected.nombre_contacto}{selected.cargo_contacto ? " · " + selected.cargo_contacto : ""}</div>}
                {selected.email_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Email: </span>{selected.email_contacto}</div>}
                {selected.telefono_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Tel: </span>{selected.telefono_contacto}</div>}
                {selected.origen && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Origen: </span>{selected.origen}</div>}
                {selected.fecha_proximo_contacto && <div style={{ fontSize: 13, color: "#d97706", fontWeight: 600 }}>Proximo contacto: {selected.fecha_proximo_contacto}</div>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>CAMBIAR ESTADO</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(ESTADOS).map(([k, v]: [string, any]) => (
                    <button key={k} onClick={() => cambiarEstado(selected.id, k)}
                      style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: selected.estado === k ? v.color : v.bg,
                        color: selected.estado === k ? "#fff" : v.color,
                        border: "1px solid " + v.color }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {selected.presupuesto_estimado > 0 && (
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Presupuesto estimado</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>{fmt(selected.presupuesto_estimado)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Prob. cierre: {selected.probabilidad_cierre}%</div>
                </div>
              )}
              {!["ganado", "perdido"].includes(selected.estado) && (
                <button onClick={convertirACliente}
                  style={{ width: "100%", padding: "8px", background: "#0F6E56", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Convertir a cliente
                </button>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "#374151" }}>Seguimiento</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input style={{ ...inp, flex: 1, fontSize: 12 }} value={nuevaNota} placeholder="Agregar nota..."
                  onChange={e => setNuevaNota(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && agregarNota()} />
                <button onClick={agregarNota} className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>+</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 8 }}>
                {notas.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 12 }}>Sin notas aun</div>
                ) : notas.map((nota: any) => (
                  <div key={nota.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12, color: "#374151" }}>{nota.contenido}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                      {new Date(nota.created_at).toLocaleDateString("es-PE")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}