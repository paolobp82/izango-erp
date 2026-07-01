"use client"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"

const ESTADOS: Record<string, any> = {
  nuevo: { bg: "#dbeafe", color: "#1e40af", label: "Nuevo" },
  contactado: { bg: "#fef9c3", color: "#92400e", label: "Contactado" },
  reunion: { bg: "#fed7aa", color: "#9a3412", label: "Reunión" },
  propuesta: { bg: "#f5f3ff", color: "#6d28d9", label: "Propuesta" },
  negociacion: { bg: "#fce7f3", color: "#9d174d", label: "Negociación" },
  ganado: { bg: "#dcfce7", color: "#15803d", label: "Ganado" },
  perdido: { bg: "#fee2e2", color: "#991b1b", label: "Perdido" },
}

const ESTADOS_PIPELINE = ["nuevo", "contactado", "reunion", "propuesta", "negociacion", "ganado", "perdido"]

const TEMPERATURAS: Record<string, any> = {
  frio: { color: "#3b82f6", label: "Frio" },
  tibio: { color: "#f59e0b", label: "Tibio" },
  caliente: { color: "#ef4444", label: "Caliente" },
}

const ORIGENES = ["Referido", "Web", "LinkedIn", "Evento", "Llamada fria", "Email", "Otro"]
const INDUSTRIAS = ["Retail", "Banca", "Tecnologia", "Alimentos", "Automotriz", "Farmaceutica", "Telecomunicaciones", "Gobierno", "Educacion", "Otro"]

function periodoActual() {
  return new Date().toISOString().slice(0, 7)
}

const emptyForm = {
  razon_social: "", ruc: "", nombre_contacto: "", email_contacto: "",
  telefono_contacto: "", direccion: "", cargo_contacto: "", origen: "", estado: "nuevo",
  temperatura: "frio", industria: "", presupuesto_estimado: "",
  probabilidad_cierre: 0, fecha_proxima_accion: "", notas: "",
  responsable_id: "", cliente_id: "", periodo_pipeline: periodoActual(),
  crear_cliente: false,
}

export default function CRMPage() {
  const supabase = createClient()
  const router = useRouter()
  const [leads, setLeads] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [responsables, setResponsables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTemp, setFiltroTemp] = useState("")
  const [filtroPeriodo, setFiltroPeriodo] = useState("actual")
  const [filtroResponsable, setFiltroResponsable] = useState("")
  const [filtroOrigen, setFiltroOrigen] = useState("")
  const [filtroIndustria, setFiltroIndustria] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState<any>(emptyForm)
  const [nuevaNota, setNuevaNota] = useState("")
  const [notas, setNotas] = useState<any[]>([])
  const [clientesConvertidos, setClientesConvertidos] = useState<Record<string, { id: string; razon_social: string }>>({})
  const [archivando, setArchivando] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [leadsRes, clientesRes, perfilesRes] = await Promise.all([
      supabase
        .from("crm_leads")
        .select("*, cliente:clientes(id, razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto, nombre_contacto_admin, email_contacto_admin, telefono_contacto_admin)")
        .order("created_at", { ascending: false }),
      supabase
        .from("clientes")
        .select("id, razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto, nombre_contacto_admin, email_contacto_admin, telefono_contacto_admin, banco_1, numero_cuenta_1, cci_1")
        .order("razon_social"),
      supabase
        .from("perfiles")
        .select("id, nombre, apellido, perfil")
        .eq("activo", true)
        .order("apellido"),
    ])
    if (leadsRes.error) {
      console.error("Error CRM leads", leadsRes.error)
      setLeads([])
    } else {
      setLeads((leadsRes.data || []).map(normalizarLead))
    }
    setClientes(clientesRes.data || [])
    setResponsables(perfilesRes.data || [])
    setLoading(false)
  }

  async function loadNotas(leadId: string) {
    const { data } = await supabase.from("crm_notas").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
    setNotas(data || [])
  }

  function normalizarLead(lead: any) {
    return {
      ...lead,
      estado: ESTADOS[lead.estado] ? lead.estado : "nuevo",
      temperatura: TEMPERATURAS[lead.temperatura] ? lead.temperatura : "frio",
      periodo_pipeline: lead.periodo_pipeline || periodoActual(),
      fecha_proxima_accion: lead.fecha_proxima_accion || lead.fecha_proximo_contacto || "",
      nombre_contacto: lead.nombre_contacto || lead.contacto_nombre || "",
      ruc: lead.ruc || lead.cliente?.ruc || "",
      email_contacto: lead.email_contacto || lead.cliente?.email_contacto || "",
      telefono_contacto: lead.telefono_contacto || lead.cliente?.telefono_contacto || "",
      direccion: lead.direccion || lead.cliente?.direccion || "",
      cliente_id: lead.cliente_id || null,
      archivado: Boolean(lead.archivado),
    }
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...emptyForm, periodo_pipeline: periodoActual() })
    setShowForm(true)
  }

  function abrirEditar(lead: any) {
    const normalizado = normalizarLead(lead)
    setEditando(normalizado)
    setForm({
      razon_social: normalizado.razon_social || "", ruc: normalizado.ruc || "",
      nombre_contacto: normalizado.nombre_contacto || "", email_contacto: normalizado.email_contacto || "",
      telefono_contacto: normalizado.telefono_contacto || "", direccion: normalizado.direccion || "",
      cargo_contacto: normalizado.cargo_contacto || "",
      origen: normalizado.origen || "", estado: normalizado.estado || "nuevo",
      temperatura: normalizado.temperatura || "frio", industria: normalizado.industria || "",
      presupuesto_estimado: normalizado.presupuesto_estimado || "",
      probabilidad_cierre: normalizado.probabilidad_cierre || 0,
      fecha_proxima_accion: normalizado.fecha_proxima_accion || "", notas: normalizado.notas || "",
      responsable_id: normalizado.responsable_id || "", cliente_id: normalizado.cliente_id || "",
      periodo_pipeline: normalizado.periodo_pipeline || periodoActual(),
      crear_cliente: false,
    })
    setShowForm(true)
  }

  function aplicarCliente(clienteId: string) {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) {
      setForm((prev: any) => ({ ...prev, cliente_id: "" }))
      return
    }
    setForm((prev: any) => ({
      ...prev,
      cliente_id: cliente.id,
      razon_social: cliente.razon_social || prev.razon_social,
      ruc: cliente.ruc || prev.ruc,
      nombre_contacto: cliente.nombre_contacto || prev.nombre_contacto,
      email_contacto: cliente.email_contacto || prev.email_contacto,
      telefono_contacto: cliente.telefono_contacto || prev.telefono_contacto,
      direccion: cliente.direccion || prev.direccion,
      crear_cliente: false,
    }))
  }

  async function guardar() {
    if (!form.razon_social) { alert("Razón social es obligatoria"); return }
    setSaving(true)

    let clienteId = form.cliente_id || null
    if (!clienteId && form.crear_cliente) {
      const cliente = await buscarOCrearCliente(form)
      clienteId = cliente?.id || null
    }

    const payload = {
      razon_social: form.razon_social,
      ruc: form.ruc || null,
      nombre_contacto: form.nombre_contacto || null,
      contacto_nombre: form.nombre_contacto || null,
      email_contacto: form.email_contacto || null,
      telefono_contacto: form.telefono_contacto || null,
      direccion: form.direccion || null,
      cargo_contacto: form.cargo_contacto || null,
      origen: form.origen || null,
      estado: ESTADOS[form.estado] ? form.estado : "nuevo",
      temperatura: TEMPERATURAS[form.temperatura] ? form.temperatura : "frio",
      industria: form.industria || null,
      presupuesto_estimado: form.presupuesto_estimado ? Number(form.presupuesto_estimado) : null,
      probabilidad_cierre: Number(form.probabilidad_cierre) || 0,
      fecha_proxima_accion: form.fecha_proxima_accion || null,
      fecha_proximo_contacto: form.fecha_proxima_accion || null,
      responsable_id: form.responsable_id || null,
      cliente_id: clienteId,
      periodo_pipeline: form.periodo_pipeline || periodoActual(),
      archivado: false,
      notas: form.notas || null,
    }

    const { data, error } = editando
      ? await supabase.from("crm_leads").update(payload).eq("id", editando.id).select().single()
      : await supabase.from("crm_leads").insert({ ...payload, entidad: "peru" }).select().single()

    setSaving(false)
    if (error) { alert("No se pudo guardar el lead: " + error.message); return }
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "crm", entidad_tipo: "lead", entidad_id: data?.id, descripcion: (editando ? "Lead editado: " : "Lead creado: ") + form.razon_social })
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
    if (!ESTADOS[estado]) return
    const lead = leads.find(l => l.id === leadId) || selected
    let clienteId = lead?.cliente_id || null
    if (estado === "ganado" && lead && !clienteId) {
      const cliente = await buscarOCrearCliente(lead)
      clienteId = cliente?.id || null
    }
    const payload: any = { estado }
    if (clienteId) payload.cliente_id = clienteId
    const { error } = await supabase.from("crm_leads").update(payload).eq("id", leadId)
    if (error) { alert("No se pudo cambiar el estado: " + error.message); return }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...payload } : l))
    if (selected?.id === leadId) setSelected((prev: any) => ({ ...prev, ...payload }))
  }

  async function eliminarLead(lead: any) {
    if (!confirm("¿Eliminar lead " + lead.razon_social + "?")) return
    await supabase.from("crm_leads").delete().eq("id", lead.id)
    if (selected?.id === lead.id) setSelected(null)
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    await registrarAccion({ accion: "eliminar", modulo: "crm", entidad_tipo: "lead", entidad_id: lead.id, descripcion: "Lead eliminado: " + lead.razon_social })
  }

  async function convertirACliente(lead = selected, confirmar = true) {
    if (!lead) return null
    if (lead.cliente_id) {
      await cambiarEstado(lead.id, "ganado")
      return lead.cliente
    }
    if (confirmar && !confirm("Convertir " + lead.razon_social + " a cliente?")) return null
    const cliente = await buscarOCrearCliente(lead)
    if (!cliente) return null
    await supabase.from("crm_leads").update({ estado: "ganado", cliente_id: cliente.id }).eq("id", lead.id)
    setSelected((prev: any) => prev ? ({ ...prev, estado: "ganado", cliente_id: cliente.id, cliente }) : prev)
    setClientesConvertidos(prev => ({ ...prev, [lead.id]: cliente }))
    load()
    return cliente
  }

  async function buscarOCrearCliente(datos: any) {
    const email = String(datos.email_contacto || "").trim()
    const razon = String(datos.razon_social || "").trim()
    const ruc = String(datos.ruc || "").trim()

    if (ruc) {
      const { data } = await supabase.from("clientes").select("id, razon_social").eq("ruc", ruc).maybeSingle()
      if (data) return data
    }
    if (email) {
      const { data } = await supabase.from("clientes").select("id, razon_social").ilike("email_contacto", email).maybeSingle()
      if (data) return data
    }
    if (razon) {
      const { data } = await supabase.from("clientes").select("id, razon_social").ilike("razon_social", razon).maybeSingle()
      if (data) return data
    }

    const { data: cliente, error } = await supabase.from("clientes").insert({
      razon_social: razon,
      ruc: ruc || null,
      direccion: datos.direccion || null,
      entidad: "peru",
      nombre_contacto: datos.nombre_contacto || datos.contacto_nombre || null,
      email_contacto: datos.email_contacto || null,
      telefono_contacto: datos.telefono_contacto || null,
    }).select("id, razon_social").single()

    if (error || !cliente) {
      alert("Error creando cliente: " + (error?.message || "sin respuesta"))
      return null
    }
    return cliente
  }

  async function archivarLead(lead: any) {
    if (!confirm("¿Archivar lead " + lead.razon_social + "?")) return
    const { error } = await supabase.from("crm_leads").update({ archivado: true }).eq("id", lead.id)
    if (error) { alert("No se pudo archivar: " + error.message); return }
    if (selected?.id === lead.id) setSelected(null)
    load()
  }

  async function archivarCerradosDelMes() {
    const periodo = filtroPeriodo === "actual" || filtroPeriodo === "todos" ? periodoActual() : filtroPeriodo
    if (!confirm("Archivar leads ganados/perdidos del periodo " + periodo + "?")) return
    setArchivando(true)
    const { error } = await supabase
      .from("crm_leads")
      .update({ archivado: true })
      .eq("periodo_pipeline", periodo)
      .in("estado", ["ganado", "perdido"])
    setArchivando(false)
    if (error) { alert("No se pudo archivar el periodo: " + error.message); return }
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0 })
  const inp: any = { padding: "8px 10px", border: "1px solid #dbe3ea", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }
  const sectionTitle: any = { fontSize: 12, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", margin: "0 0 10px" }
  const muted: any = { fontSize: 12, color: "#64748b" }
  const panelSection: any = { padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }

  const periodos = useMemo(() => {
    const valores = Array.from(new Set(leads.map(l => l.periodo_pipeline || periodoActual()).filter(Boolean)))
    return valores.sort().reverse()
  }, [leads])

  const leadsPeriodo = leads.filter(l => {
    if (filtroPeriodo === "todos") return true
    const periodo = filtroPeriodo === "actual" ? periodoActual() : filtroPeriodo
    return l.periodo_pipeline === periodo && !l.archivado
  })

  const filtrados = leadsPeriodo.filter(l => {
    if (filtroEstado && l.estado !== filtroEstado) return false
    if (filtroTemp && l.temperatura !== filtroTemp) return false
    if (filtroResponsable && l.responsable_id !== filtroResponsable) return false
    if (filtroOrigen && l.origen !== filtroOrigen) return false
    if (filtroIndustria && l.industria !== filtroIndustria) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const texto = [l.razon_social, l.ruc, l.nombre_contacto, l.email_contacto, l.telefono_contacto, l.direccion].filter(Boolean).join(" ").toLowerCase()
      if (!texto.includes(q)) return false
    }
    return true
  })

  const totalPipeline = leadsPeriodo.filter(l => !["ganado","perdido"].includes(l.estado)).reduce((s, l) => s + (l.presupuesto_estimado || 0), 0)
  const totalGanado = leadsPeriodo.filter(l => l.estado === "ganado").reduce((s, l) => s + (l.presupuesto_estimado || 0), 0)
  const tasaConversion = leadsPeriodo.length > 0 ? Math.round((leadsPeriodo.filter(l => l.estado === "ganado").length / leadsPeriodo.length) * 100) : 0
  const leadsActivos = leadsPeriodo.filter(l => !["ganado","perdido"].includes(l.estado))
  const leadsCalientes = leadsPeriodo.filter(l => l.temperatura === "caliente")
  const propuestasAbiertas = leadsPeriodo.filter(l => ["propuesta","negociacion"].includes(l.estado))
  const cierreEsperado = leadsActivos.reduce((s, l) => s + ((Number(l.presupuesto_estimado) || 0) * ((Number(l.probabilidad_cierre) || 0) / 100)), 0)

  const leadsPorEstado = (estado: string) => filtrados.filter(l => l.estado === estado)

  const valorPorEstado = (estado: string) =>
    leadsPorEstado(estado).reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)

  const responsableNombre = (id?: string | null) => {
    const r = responsables.find(p => p.id === id)
    return r ? `${r.nombre || ""} ${r.apellido || ""}`.trim() : ""
  }

  const camposImport = [
    {key:"razon_social",label:"Razón social",requerido:true},{key:"ruc",label:"RUC"},
    {key:"nombre_contacto",label:"Nombre contacto"},{key:"email_contacto",label:"Email"},
    {key:"telefono_contacto",label:"Teléfono"},{key:"direccion",label:"Dirección"},
    {key:"cargo_contacto",label:"Cargo"},{key:"origen",label:"Origen"},
    {key:"industria",label:"Industria"},{key:"temperatura",label:"Temperatura"},
    {key:"presupuesto_estimado",label:"Presupuesto estimado"},
    {key:"probabilidad_cierre",label:"Probabilidad %"},{key:"periodo_pipeline",label:"Periodo pipeline"}
  ]

  async function importarLeads(registros: any[]) {
    let exitosos = 0
    const errores: string[] = []
    for (const r of registros) {
      const { error } = await supabase.from("crm_leads").insert({
        ...r,
        entidad: "peru",
        estado: ESTADOS[r.estado] ? r.estado : "nuevo",
        temperatura: r.temperatura || "frio",
        periodo_pipeline: r.periodo_pipeline || periodoActual(),
        archivado: false
      })
      if (error) errores.push(r.razon_social + ": " + error.message)
      else exitosos++
    }
    load()
    return { exitosos, errores }
  }

  const filtrosActivos = Boolean(filtroEstado || filtroTemp || filtroResponsable || filtroOrigen || filtroIndustria || busqueda || filtroPeriodo !== "actual")
  const selectedClienteId = selected?.cliente_id || clientesConvertidos[selected?.id]?.id || selected?.cliente?.id
  const kpis = [
    { label: "Pipeline Comercial", value: fmt(totalPipeline), sub: `${leadsActivos.length} activas`, color: "#0F6E56" },
    { label: "Cierre Esperado", value: fmt(cierreEsperado), sub: "Presupuesto ponderado", color: "#2563eb" },
    { label: "Oportunidades Activas", value: leadsActivos.length, sub: `${leadsCalientes.length} calientes`, color: "#0f172a" },
    { label: "Propuestas Abiertas", value: propuestasAbiertas.length, sub: fmt(propuestasAbiertas.reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)), color: "#f97316" },
    { label: "Negocios Ganados", value: fmt(totalGanado), sub: `${leadsPeriodo.filter(l => l.estado === "ganado").length} clientes`, color: "#059669" },
    { label: "Conversión", value: tasaConversion + "%", sub: "Ganados / periodo", color: "#7c3aed" },
  ]

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#0f172a" }}>CRM Comercial</h1>
          <p style={{ ...muted, margin: "6px 0 0" }}>
            {leadsActivos.length} oportunidades activas · {fmt(totalPipeline)} en pipeline · {tasaConversion}% conversión
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: "auto" }}>
          <ImportExport modulo="crm_leads" campos={camposImport} datos={leads} onImportar={importarLeads} />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13, padding: "9px 14px", fontWeight: 800 }}>+ Nuevo Lead</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} className="card" style={{ minHeight: 82, padding: 14, border: "1px solid #e5e7eb", boxShadow: "0 8px 18px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 22, lineHeight: "28px", fontWeight: 900, color: k.color, marginTop: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.46)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(15,23,42,.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#0f172a" }}>{editando ? "Editar lead" : "Nuevo lead"}</h2>
                <p style={{ ...muted, margin: "4px 0 0" }}>Ficha comercial conectada con Clientes</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#64748b", fontSize: 18, width: 34, height: 34 }}>x</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <section style={panelSection}>
                <h3 style={sectionTitle}>Cliente existente</h3>
                <select style={inp} value={form.cliente_id} onChange={e => aplicarCliente(e.target.value)}>
                  <option value="">Sin cliente vinculado</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Empresa</h3>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(160px, .6fr)", gap: 12 }}>
                  <div><label style={lbl}>Empresa / nombre *</label><input style={inp} value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></div>
                  <div><label style={lbl}>RUC</label><input style={inp} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: 12 }}><label style={lbl}>Dirección</label><input style={inp} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Contacto</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                  <div><label style={lbl}>Contacto</label><input style={inp} value={form.nombre_contacto} onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                  <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo_contacto} onChange={e => setForm({ ...form, cargo_contacto: e.target.value })} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} /></div>
                  <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono_contacto} onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} /></div>
                </div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Comercial</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                  <div><label style={lbl}>Estado</label><select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{ESTADOS_PIPELINE.map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}</select></div>
                  <div><label style={lbl}>Temperatura</label><select style={inp} value={form.temperatura} onChange={e => setForm({ ...form, temperatura: e.target.value })}>{Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                  <div><label style={lbl}>Origen</label><select style={inp} value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })}><option value="">Seleccionar</option>{ORIGENES.map(o => <option key={o}>{o}</option>)}</select></div>
                  <div><label style={lbl}>Industria</label><select style={inp} value={form.industria} onChange={e => setForm({ ...form, industria: e.target.value })}><option value="">Seleccionar</option>{INDUSTRIAS.map(i => <option key={i}>{i}</option>)}</select></div>
                  <div><label style={lbl}>Presupuesto est.</label><input type="number" style={inp} value={form.presupuesto_estimado} onChange={e => setForm({ ...form, presupuesto_estimado: e.target.value })} /></div>
                  <div><label style={lbl}>Probabilidad %</label><input type="number" min={0} max={100} style={inp} value={form.probabilidad_cierre} onChange={e => setForm({ ...form, probabilidad_cierre: Number(e.target.value) })} /></div>
                  <div><label style={lbl}>Próxima acción</label><input type="date" style={inp} value={form.fecha_proxima_accion} onChange={e => setForm({ ...form, fecha_proxima_accion: e.target.value })} /></div>
                  <div><label style={lbl}>Periodo pipeline</label><input style={inp} value={form.periodo_pipeline} onChange={e => setForm({ ...form, periodo_pipeline: e.target.value })} placeholder="YYYY-MM" /></div>
                  <div style={{ gridColumn: "span 2" }}><label style={lbl}>Responsable</label><select style={inp} value={form.responsable_id} onChange={e => setForm({ ...form, responsable_id: e.target.value })}><option value="">Sin responsable</option>{responsables.map(r => <option key={r.id} value={r.id}>{r.apellido} {r.nombre}</option>)}</select></div>
                </div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Seguimiento</h3>
                {!form.cliente_id && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginBottom: 10 }}>
                    <input type="checkbox" checked={form.crear_cliente} onChange={e => setForm({ ...form, crear_cliente: e.target.checked })} />
                    Crear también en Clientes al guardar
                  </label>
                )}
                <textarea style={{ ...inp, minHeight: 78, resize: "vertical" }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Notas / seguimiento" />
              </section>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear lead"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 14, border: "1px solid #e5e7eb", boxShadow: "0 8px 18px rgba(15,23,42,.03)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 1.3fr) repeat(6, minmax(130px, 1fr)) auto", gap: 10, alignItems: "center" }}>
          <input style={inp} placeholder="Buscar lead..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={inp} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}><option value="actual">Pipeline actual</option><option value="todos">Todos</option>{periodos.filter(p => p !== periodoActual()).map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select style={inp} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{ESTADOS_PIPELINE.map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}</select>
          <select style={inp} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}><option value="">Temperatura</option>{Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select style={inp} value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)}><option value="">Responsable</option>{responsables.map(r => <option key={r.id} value={r.id}>{r.apellido} {r.nombre}</option>)}</select>
          <select style={inp} value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}><option value="">Origen</option>{ORIGENES.map(o => <option key={o}>{o}</option>)}</select>
          <select style={inp} value={filtroIndustria} onChange={e => setFiltroIndustria(e.target.value)}><option value="">Industria</option>{INDUSTRIAS.map(i => <option key={i}>{i}</option>)}</select>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {filtrosActivos && <button onClick={() => { setFiltroEstado(""); setFiltroTemp(""); setFiltroResponsable(""); setFiltroOrigen(""); setFiltroIndustria(""); setBusqueda(""); setFiltroPeriodo("actual") }} className="btn-secondary" style={{ fontSize: 12 }}>Limpiar</button>}
            <button onClick={archivarCerradosDelMes} disabled={archivando} className="btn-secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{archivando ? "Archivando..." : "Archivar mes"}</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0, 1fr) 360px" : "minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 12, boxShadow: "0 10px 24px rgba(15,23,42,.03)", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Pipeline comercial</div>
              <div style={muted}>{filtrados.length} resultados · 7 etapas</div>
            </div>
            <div style={{ ...muted, color: "#94a3b8" }}>Scroll horizontal</div>
          </div>
          <div style={{ overflowX: "auto", paddingBottom: 10, scrollbarGutter: "stable" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 238px)", gap: 12, width: "max-content" }}>
              {ESTADOS_PIPELINE.map(estado => {
                const ec = ESTADOS[estado]
                const lista = leadsPorEstado(estado)
                return (
                  <div key={estado} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: ec.color, flex: "0 0 auto" }} />
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ec.label}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 900, color: ec.color, background: ec.bg, padding: "3px 8px", borderRadius: 99 }}>{lista.length}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{fmt(valorPorEstado(estado))}</div>
                    </div>
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 9, height: 430, overflowY: "auto" }}>
                      {lista.length === 0 ? (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: "22px 10px", textAlign: "center", color: "#94a3b8", fontSize: 12, background: "#fff" }}>
                          Sin oportunidades
                        </div>
                      ) : lista.map(lead => {
                        const tc = TEMPERATURAS[lead.temperatura] || { color: "#6b7280", label: lead.temperatura }
                        const responsable = responsableNombre(lead.responsable_id)
                        return (
                          <div key={lead.id} onClick={() => { setSelected(lead); loadNotas(lead.id) }}
                            style={{ background: selected?.id === lead.id ? "#ecfdf5" : "#fff", border: selected?.id === lead.id ? "1px solid #03E373" : "1px solid #e5e7eb", borderRadius: 12, padding: 12, boxShadow: selected?.id === lead.id ? "0 10px 22px rgba(3,227,115,.16)" : "0 8px 18px rgba(15,23,42,.05)", cursor: "pointer" }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.razon_social}</div>
                            {lead.cliente_id && <div style={{ fontSize: 10, color: "#0F6E56", marginTop: 2, fontWeight: 800 }}>Cliente vinculado</div>}
                            <div style={{ display: "grid", gap: 5, fontSize: 11, color: "#475569", marginTop: 8 }}>
                              {lead.nombre_contacto && <div>{lead.nombre_contacto}{lead.cargo_contacto ? " · " + lead.cargo_contacto : ""}</div>}
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                <strong style={{ color: "#0f172a" }}>{lead.presupuesto_estimado ? fmt(lead.presupuesto_estimado) : "Sin presupuesto"}</strong>
                                <span>{lead.probabilidad_cierre || 0}%</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                <span style={{ color: tc.color, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 99, padding: "2px 7px", fontWeight: 800 }}>{tc.label}</span>
                                {lead.fecha_proxima_accion && <span style={{ color: "#d97706" }}>{lead.fecha_proxima_accion}</span>}
                              </div>
                              {responsable && <div style={{ color: "#64748b" }}>Resp. {responsable}</div>}
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
          <aside style={{ display: "grid", gap: 12, position: "sticky", top: 16 }}>
            <div className="card" style={{ display: "grid", gap: 12, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(15,23,42,.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: "#0f172a" }}>{selected.razon_social}</h2>
                  <div style={{ fontSize: 12, color: selected.cliente_id ? "#0F6E56" : "#94a3b8", marginTop: 3, fontWeight: 800 }}>{selected.cliente_id ? "Cliente vinculado" : "Sin cliente vinculado"}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#64748b", width: 30, height: 30 }}>x</button>
              </div>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Empresa</h3>
                <div style={{ display: "grid", gap: 7, fontSize: 13 }}>
                  <div><span style={{ color: "#94a3b8" }}>Razón social: </span>{selected.razon_social || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Cliente vinculado: </span>{selected.cliente_id ? "Sí" : "No"}</div>
                  <div><span style={{ color: "#94a3b8" }}>RUC: </span>{selected.ruc || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Industria: </span>{selected.industria || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Dirección: </span>{selected.direccion || "—"}</div>
                </div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Contacto</h3>
                <div style={{ display: "grid", gap: 7, fontSize: 13 }}>
                  <div><span style={{ color: "#94a3b8" }}>Nombre: </span>{selected.nombre_contacto || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Cargo: </span>{selected.cargo_contacto || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Email: </span>{selected.email_contacto || "—"}</div>
                  <div><span style={{ color: "#94a3b8" }}>Teléfono: </span>{selected.telefono_contacto || "—"}</div>
                </div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Comercial</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ESTADOS_PIPELINE.map(k => {
                      const v = ESTADOS[k]
                      return <button key={k} onClick={() => cambiarEstado(selected.id, k)} style={{ padding: "4px 9px", borderRadius: 99, fontSize: 11, fontWeight: 800, cursor: "pointer", background: selected.estado === k ? v.color : v.bg, color: selected.estado === k ? "#fff" : v.color, border: "1px solid " + v.color }}>{v.label}</button>
                    })}
                  </div>
                  <div style={{ display: "grid", gap: 7, fontSize: 13 }}>
                    <div><span style={{ color: "#94a3b8" }}>Origen: </span>{selected.origen || "—"}</div>
                    <div><span style={{ color: "#94a3b8" }}>Temperatura: </span>{TEMPERATURAS[selected.temperatura]?.label || "—"}</div>
                    <div><span style={{ color: "#94a3b8" }}>Responsable: </span>{responsableNombre(selected.responsable_id) || "—"}</div>
                    <div><span style={{ color: "#94a3b8" }}>Presupuesto: </span>{selected.presupuesto_estimado ? fmt(selected.presupuesto_estimado) : "—"}</div>
                    <div><span style={{ color: "#94a3b8" }}>Probabilidad: </span>{selected.probabilidad_cierre || 0}%</div>
                  </div>
                </div>
              </section>

              <section style={{ ...panelSection, borderColor: selected.fecha_proxima_accion ? "#fde68a" : "#e5e7eb", background: selected.fecha_proxima_accion ? "#fffbeb" : "#fff" }}>
                <h3 style={sectionTitle}>Próxima acción</h3>
                <div style={{ fontSize: 13, color: selected.fecha_proxima_accion ? "#92400e" : "#94a3b8", fontWeight: selected.fecha_proxima_accion ? 800 : 400 }}>{selected.fecha_proxima_accion || "Sin próxima acción definida"}</div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Seguimiento</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input style={{ ...inp, flex: 1, fontSize: 12 }} value={nuevaNota} placeholder="Agregar nota..." onChange={e => setNuevaNota(e.target.value)} onKeyDown={e => e.key === "Enter" && agregarNota()} />
                  <button onClick={agregarNota} className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>+</button>
                </div>
                <div style={{ maxHeight: 190, overflowY: "auto", display: "grid", gap: 8 }}>
                  {notas.length === 0 ? <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 10 }}>Sin notas aun</div> : notas.map((nota: any) => (
                    <div key={nota.id} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, color: "#334155" }}>{nota.contenido}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{new Date(nota.created_at).toLocaleDateString("es-PE")}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={panelSection}>
                <h3 style={sectionTitle}>Acciones</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <button onClick={() => abrirEditar(selected)} className="btn-secondary" style={{ fontSize: 13, width: "100%" }}>Editar</button>
                  {!selected.cliente_id && <button onClick={() => convertirACliente(selected, true)} className="btn-primary" style={{ fontSize: 13, width: "100%" }}>Convertir a cliente</button>}
                  {selectedClienteId && <button onClick={() => router.push(`/proyectos/nuevo?cliente_id=${selectedClienteId}`)} className="btn-primary" style={{ fontSize: 13, width: "100%" }}>Crear proyecto</button>}
                  <button disabled className="btn-secondary" style={{ fontSize: 13, width: "100%", opacity: .55, cursor: "not-allowed" }}>Crear propuesta</button>
                  <button onClick={() => archivarLead(selected)} className="btn-secondary" style={{ fontSize: 13, width: "100%" }}>Archivar</button>
                  <button onClick={() => eliminarLead(selected)} style={{ width: "100%", padding: "8px", background: "#fff", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Eliminar</button>
                </div>
              </section>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
