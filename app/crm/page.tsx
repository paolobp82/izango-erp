"use client"
import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"

type CRMEstado = "nuevo" | "contactado" | "reunion" | "propuesta" | "negociacion" | "ganado" | "perdido"
type CRMTemperatura = "frio" | "tibio" | "caliente"

type CRMLead = {
  id: string
  razon_social: string
  ruc?: string | null
  nombre_contacto?: string | null
  email_contacto?: string | null
  telefono_contacto?: string | null
  cargo_contacto?: string | null
  origen?: string | null
  estado: CRMEstado
  temperatura?: CRMTemperatura | string | null
  industria?: string | null
  presupuesto_estimado?: number | null
  probabilidad_cierre?: number | null
  fecha_proximo_contacto?: string | null
  notas?: string | null
  entidad?: string | null
  created_at?: string | null
}

type CRMNota = {
  id: string
  lead_id: string
  contenido: string
  created_by?: string | null
  created_at?: string | null
}

type ClienteCRM = {
  id: string
  razon_social: string
}

type CRMLeadForm = {
  razon_social: string
  ruc: string
  nombre_contacto: string
  email_contacto: string
  telefono_contacto: string
  cargo_contacto: string
  origen: string
  estado: CRMEstado
  temperatura: CRMTemperatura
  industria: string
  presupuesto_estimado: string | number
  probabilidad_cierre: number
  fecha_proximo_contacto: string
  notas: string
}

type CRMVisualConfig = {
  bg?: string
  color: string
  label: string
}

const ESTADOS_CRM: Record<CRMEstado, CRMVisualConfig> = {
  nuevo:        { bg: "#dbeafe", color: "#1e40af", label: "Nuevo" },
  contactado:   { bg: "#fef9c3", color: "#92400e", label: "Contactado" },
  reunion:      { bg: "#fed7aa", color: "#9a3412", label: "Reunión" },
  propuesta:    { bg: "#f5f3ff", color: "#6d28d9", label: "Propuesta" },
  negociacion:  { bg: "#fce7f3", color: "#9d174d", label: "Negociación" },
  ganado:       { bg: "#dcfce7", color: "#15803d", label: "Ganado" },
  perdido:      { bg: "#fee2e2", color: "#991b1b", label: "Perdido" },
}

const TEMPERATURAS_CRM: Record<CRMTemperatura, CRMVisualConfig> = {
  frio:     { color: "#3b82f6", label: "Frio" },
  tibio:    { color: "#f59e0b", label: "Tibio" },
  caliente: { color: "#ef4444", label: "Caliente" },
}

const ORIGENES_CRM = ["Referido", "Web", "LinkedIn", "Evento", "Llamada fria", "Email", "Otro"]
const INDUSTRIAS_CRM = ["Retail", "Banca", "Tecnologia", "Alimentos", "Automotriz", "Farmaceutica", "Telecomunicaciones", "Gobierno", "Educacion", "Otro"]
const ESTADOS_PIPELINE_CRM: CRMEstado[] = ["nuevo", "contactado", "reunion", "propuesta", "negociacion", "ganado", "perdido"]

const emptyForm: CRMLeadForm = {
  razon_social: "", ruc: "", nombre_contacto: "", email_contacto: "",
  telefono_contacto: "", cargo_contacto: "", origen: "", estado: "nuevo",
  temperatura: "frio", industria: "", presupuesto_estimado: "",
  probabilidad_cierre: 0, fecha_proximo_contacto: "", notas: "",
}

function supabaseErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Error desconocido"
  const e = error as { message?: string; code?: string; details?: string; hint?: string }
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(" · ") || "Error desconocido"
}

export default function CRMPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [leads, setLeads] = useState<CRMLead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<CRMLead | null>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<CRMLead | null>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTemp, setFiltroTemp] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState<CRMLeadForm>(emptyForm)
  const [nuevaNota, setNuevaNota] = useState("")
  const [notas, setNotas] = useState<CRMNota[]>([])
  const [clientesConvertidos, setClientesConvertidos] = useState<Record<string, ClienteCRM>>({})

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false })
    if (error) {
      console.error("Error cargando CRM:", error)
      alert("No se pudo cargar CRM: " + supabaseErrorMessage(error))
      setLoading(false)
      return
    }
    setLeads(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    async function loadInitial() {
      await load()
    }
    void loadInitial()
  }, [load])

  async function loadNotas(leadId: string) {
    const { data, error } = await supabase.from("crm_notas").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
    if (error) {
      console.error("Error cargando notas CRM:", error)
      alert("No se pudieron cargar las notas: " + supabaseErrorMessage(error))
      return
    }
    setNotas(data || [])
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function abrirEditar(lead: CRMLead) {
    setEditando(lead)
    setForm({
      razon_social: lead.razon_social || "", ruc: lead.ruc || "",
      nombre_contacto: lead.nombre_contacto || "", email_contacto: lead.email_contacto || "",
      telefono_contacto: lead.telefono_contacto || "", cargo_contacto: lead.cargo_contacto || "",
      origen: lead.origen || "", estado: (lead.estado as CRMEstado) || "nuevo",
      temperatura: (lead.temperatura as CRMTemperatura) || "frio", industria: lead.industria || "",
      presupuesto_estimado: lead.presupuesto_estimado || "",
      probabilidad_cierre: lead.probabilidad_cierre || 0,
      fecha_proximo_contacto: lead.fecha_proximo_contacto || "", notas: lead.notas || "",
    })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.razon_social) { alert("Razón social es obligatoria"); return }
    setSaving(true)
    const payload = { ...form, presupuesto_estimado: form.presupuesto_estimado ? Number(form.presupuesto_estimado) : null }
    const { error } = editando
      ? await supabase.from("crm_leads").update(payload).eq("id", editando.id)
      : await supabase.from("crm_leads").insert({ ...payload, entidad: "peru" })

    if (error) {
      console.error("Error guardando lead CRM:", error)
      alert("No se pudo guardar el lead: " + supabaseErrorMessage(error))
      setSaving(false)
      return
    }
    setSaving(false)
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "crm", entidad_tipo: "lead", descripcion: (editando ? "Lead editado: " : "Lead creado: ") + form.razon_social })
    setShowForm(false)
    load()
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !selected) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("crm_notas").insert({ lead_id: selected.id, contenido: nuevaNota, created_by: user?.id })
    if (error) {
      console.error("Error agregando nota CRM:", error)
      alert("No se pudo agregar la nota: " + supabaseErrorMessage(error))
      return
    }
    setNuevaNota("")
    loadNotas(selected.id)
  }

  async function cambiarEstado(leadId: string, estado: CRMEstado) {
    const { error } = await supabase.from("crm_leads").update({ estado }).eq("id", leadId)
    if (error) {
      console.error("Error cambiando estado CRM:", error)
      alert("No se pudo cambiar el estado: " + supabaseErrorMessage(error))
      return
    }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado } : l))
    if (selected?.id === leadId) setSelected((prev) => prev ? ({ ...prev, estado }) : prev)
  }

  async function eliminarLead(lead: CRMLead) {
    if (!confirm("¿Eliminar lead " + lead.razon_social + "?")) return
    const { error } = await supabase.from("crm_leads").delete().eq("id", lead.id)
    if (error) {
      console.error("Error eliminando lead CRM:", error)
      alert("No se pudo eliminar el lead: " + supabaseErrorMessage(error))
      return
    }
    if (selected?.id === lead.id) setSelected(null)
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    await registrarAccion({ accion: "eliminar", modulo: "crm", entidad_tipo: "lead", descripcion: "Lead eliminado: " + lead.razon_social })
  }
  async function convertirACliente() {
    if (!selected) return
    if (!confirm("Convertir " + selected.razon_social + " a cliente?")) return
    const { data: cliente, error } = await supabase.from("clientes").insert({
      razon_social: selected.razon_social, ruc: selected.ruc || null, entidad: "peru",
      nombre_contacto: selected.nombre_contacto || null,
      email_contacto: selected.email_contacto || null,
      telefono_contacto: selected.telefono_contacto || null,
    }).select("id, razon_social").single()
    if (error || !cliente) { alert("Error creando cliente: " + (error?.message || "sin respuesta")); return }
    const { error: leadError } = await supabase.from("crm_leads").update({ estado: "ganado" }).eq("id", selected.id)
    if (leadError) {
      console.error("Error actualizando lead convertido:", leadError)
      alert("Cliente creado, pero no se pudo actualizar el lead: " + supabaseErrorMessage(leadError))
      return
    }
    setSelected((prev) => prev ? ({ ...prev, estado: "ganado" }) : prev)
    setClientesConvertidos(prev => ({ ...prev, [selected.id]: cliente }))
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0 })
  const inp: CSSProperties = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

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
  const leadsActivos = leads.filter(l => !["ganado","perdido"].includes(l.estado))
  const leadsCalientes = leads.filter(l => l.temperatura === "caliente")
  const propuestasAbiertas = leads.filter(l => ["propuesta","negociacion"].includes(l.estado))
  const cierreEsperado = leadsActivos.reduce((s, l) => s + ((Number(l.presupuesto_estimado) || 0) * ((Number(l.probabilidad_cierre) || 0) / 100)), 0)
  const estadosPipeline = ESTADOS_PIPELINE_CRM

  const leadsPorEstado = (estado: CRMEstado) => filtrados.filter(l => l.estado === estado)

  const valorPorEstado = (estado: CRMEstado) =>
    leadsPorEstado(estado).reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)



  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>CRM</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Gestión de oportunidades comerciales · {leads.length} leads</p>
        </div>
        <ImportExport modulo="crm_leads" campos={[{key:"razon_social",label:"Razón social",requerido:true},{key:"ruc",label:"RUC"},{key:"nombre_contacto",label:"Nombre contacto"},{key:"email_contacto",label:"Email"},{key:"telefono_contacto",label:"Teléfono"},{key:"cargo_contacto",label:"Cargo"},{key:"origen",label:"Origen"},{key:"industria",label:"Industria"},{key:"temperatura",label:"Temperatura"},{key:"presupuesto_estimado",label:"Presupuesto estimado"},{key:"probabilidad_cierre",label:"Probabilidad %"}]} datos={leads} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const{error}=await supabase.from("crm_leads").insert({...r,entidad:"peru",estado:"nuevo",temperatura:r.temperatura||"frio"}); if(error)errores.push(r.razon_social+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo lead</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pipeline Comercial", value: fmt(totalPipeline), sub: `${leadsActivos.length} oportunidades activas`, icon: "◈", bg: "#eaf8f2", color: "#0F6E56" },
          { label: "Cierre esperado", value: fmt(cierreEsperado), sub: "Presupuesto x probabilidad", icon: "↗", bg: "#eef4ff", color: "#2563eb" },
          { label: "Propuestas abiertas", value: propuestasAbiertas.length, sub: fmt(propuestasAbiertas.reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)), icon: "▤", bg: "#fff7ed", color: "#f97316" },
          { label: "Negocios Ganados", value: fmt(totalGanado), sub: `${leads.filter(l => l.estado === "ganado").length} clientes`, icon: "✓", bg: "#ecfdf5", color: "#059669" },
          { label: "Leads calientes", value: leadsCalientes.length, sub: "Requieren atención", icon: "●", bg: "#fef2f2", color: "#ef4444" },
        ].map(k => (
          <div key={k.label} className="card" style={{ display: "flex", alignItems: "center", gap: 16, minHeight: 104, border: "1px solid #e5e7eb", boxShadow: "0 10px 25px rgba(15,23,42,.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: k.bg, color: k.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "-0.01em" }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: k.color, marginTop: 4 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{k.sub}</div>
            </div>
          </div>
        ))}
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
                <div><label style={lbl}>Razón social *</label><input style={inp} value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></div>
                <div><label style={lbl}>RUC</label><input style={inp} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Nombre contacto</label><input style={inp} value={form.nombre_contacto} onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Email</label><input style={inp} value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono_contacto} onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo_contacto} onChange={e => setForm({ ...form, cargo_contacto: e.target.value })} /></div>
                <div>
                  <label style={lbl}>Origen</label>
                  <select style={inp} value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {ORIGENES_CRM.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Industria</label>
                  <select style={inp} value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {INDUSTRIAS_CRM.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Estado</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as CRMEstado })}>
                    {Object.entries(ESTADOS_CRM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Temperatura</label>
                  <select style={inp} value={form.temperatura} onChange={e => setForm({ ...form, temperatura: e.target.value as CRMTemperatura })}>
                    {Object.entries(TEMPERATURAS_CRM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Presupuesto est.</label><input type="number" style={inp} value={form.presupuesto_estimado} onChange={e => setForm({ ...form, presupuesto_estimado: e.target.value })} /></div>
                <div><label style={lbl}>Probabilidad %</label><input type="number" min={0} max={100} style={inp} value={form.probabilidad_cierre} onChange={e => setForm({ ...form, probabilidad_cierre: Number(e.target.value) })} /></div>
              </div>
              <div><label style={lbl}>Próximo contacto</label><input type="date" style={inp} value={form.fecha_proximo_contacto} onChange={e => setForm({ ...form, fecha_proximo_contacto: e.target.value })} /></div>
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
          <div className="card" style={{ marginBottom: 16, padding: "14px 16px", border: "1px solid #e5e7eb", boxShadow: "0 8px 20px rgba(15,23,42,.03)" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...inp, width: 220 }} placeholder="Buscar lead..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS_CRM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
                <option value="">Todas las temp.</option>
                {Object.entries(TEMPERATURAS_CRM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(filtroEstado || filtroTemp || busqueda) && (
                <button onClick={() => { setFiltroEstado(""); setFiltroTemp(""); setBusqueda("") }}
                  style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Limpiar</button>
              )}
              <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} resultados</span>
              <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo lead</button>
            </div>
          </div>

          <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(260px, 1fr))", gap: 16, minWidth: 1904 }}>
              {estadosPipeline.map(estado => {
                const ec = ESTADOS_CRM[estado] || { bg: "#f3f4f6", color: "#6b7280", label: estado }
                const lista = leadsPorEstado(estado)
                return (
                  <div key={estado} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 28px rgba(15,23,42,.04)" }}>
                    <div style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #e5e7eb",
                      background: "#fff"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: ec.color }} />
                          <div style={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>{ec.label}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ec.color, background: ec.bg, padding: "3px 8px", borderRadius: 99 }}>
                          {lista.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{fmt(valorPorEstado(estado))}</div>
                    </div>

                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, minHeight: 360 }}>
                      {lista.length === 0 ? (
                        <div style={{ border: "1px dashed #d1d5db", borderRadius: 12, padding: "24px 12px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                          Sin leads
                        </div>
                      ) : lista.map(lead => {
                        const tc = TEMPERATURAS_CRM[lead.temperatura as CRMTemperatura] || { color: "#6b7280", label: lead.temperatura }
                        const probabilidad = Number(lead.probabilidad_cierre) || 0
                        return (
                          <div key={lead.id}
                            onClick={() => { setSelected(lead); loadNotas(lead.id) }}
                            style={{
                              background: selected?.id === lead.id ? "#ecfdf5" : "#fff",
                              border: selected?.id === lead.id ? "1px solid #03E373" : "1px solid #e5e7eb",
                              borderRadius: 14,
                              padding: 14,
                              boxShadow: "0 10px 24px rgba(15,23,42,.06)",
                              cursor: "pointer"
                            }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 900, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {lead.razon_social}
                                </div>
                                {lead.industria && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{lead.industria}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={e => { e.stopPropagation(); abrirEditar(lead) }}
                                  style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "4px 7px", fontSize: 11, cursor: "pointer", color: "#374151" }}>
                                  Editar
                                </button>
                                <button onClick={e => { e.stopPropagation(); eliminarLead(lead) }}
                                  style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 8, padding: "4px 7px", fontSize: 11, cursor: "pointer", color: "#dc2626" }}>
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#4b5563" }}>
                              {lead.nombre_contacto && <div>👤 {lead.nombre_contacto}</div>}
                              {lead.telefono_contacto && <div>📞 {lead.telefono_contacto}</div>}
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <span>💰 {lead.presupuesto_estimado ? fmt(lead.presupuesto_estimado) : "Sin presupuesto"}</span>
                                <strong style={{ color: probabilidad >= 70 ? "#0F6E56" : probabilidad >= 40 ? "#ca8a04" : "#6b7280" }}>
                                  {probabilidad}%
                                </strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                <span style={{ color: tc.color, fontWeight: 800 }}>● {tc.label}</span>
                                {lead.fecha_proximo_contacto && <span style={{ color: "#d97706", fontSize: 11 }}>Próx. {lead.fecha_proximo_contacto}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
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
                {selected.fecha_proximo_contacto && <div style={{ fontSize: 13, color: "#d97706", fontWeight: 600 }}>Próximo contacto: {selected.fecha_proximo_contacto}</div>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>CAMBIAR ESTADO</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(ESTADOS_CRM).map(([k, v]) => (
                    <button key={k} onClick={() => cambiarEstado(selected.id, k as CRMEstado)}
                      style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: selected.estado === k ? v.color : v.bg,
                        color: selected.estado === k ? "#fff" : v.color,
                        border: "1px solid " + v.color }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {Number(selected.presupuesto_estimado) > 0 && (
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Presupuesto estimado</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>{fmt(Number(selected.presupuesto_estimado))}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Prob. cierre: {Number(selected.probabilidad_cierre) || 0}%</div>
                </div>
              )}
              {!["ganado", "perdido"].includes(selected.estado) && (
                <button onClick={convertirACliente}
                  style={{ width: "100%", padding: "8px", background: "#0F6E56", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Convertir a cliente
                </button>
              )}
              {clientesConvertidos[selected.id] && (
                <div style={{ display: "grid", gap: 8, marginTop: 12, padding: 12, border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>Cliente creado</div>
                  <button onClick={() => router.push(`/clientes/${clientesConvertidos[selected.id].id}`)}
                    className="btn-secondary" style={{ fontSize: 12, width: "100%" }}>
                    Ver cliente
                  </button>
                  <button onClick={() => router.push(`/proyectos/nuevo?cliente_id=${clientesConvertidos[selected.id].id}`)}
                    className="btn-primary" style={{ fontSize: 12, width: "100%" }}>
                    Crear proyecto para este cliente
                  </button>
                </div>
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
                ) : notas.map((nota: CRMNota) => (
                  <div key={nota.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12, color: "#374151" }}>{nota.contenido}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                      {nota.created_at ? new Date(nota.created_at).toLocaleDateString("es-PE") : ""}
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







