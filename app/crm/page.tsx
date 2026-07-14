"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { Drawer, EmptyState, ExecutiveSummary, FiltersBar, MasterPage, StatusBadge } from "@/components/design-system"
import {
  getCRMEstadosPipeline,
  getCRMEstadosVisuales,
  getCRMIndustrias,
  getCRMOrigenes,
  getCRMTemperaturasVisuales,
} from "@/lib/core/configuration/crm"
import { businessRuleEngine } from "@/lib/core/business-rules"
import { lifecycleEngine } from "@/lib/core/lifecycle"
import {
  estadoCobroFactura,
  facturaVigenteProyecto,
  montoCobradoFacturaComercial,
  totalCotizacionComercial,
  totalFacturaComercial,
  cotizacionVigenteProyecto,
} from "@/lib/comercial/cotizaciones"
import { sincronizarLeadPorProyecto } from "@/lib/comercial/sincronizacion"
import {
  filtrarPorAlcance,
  puedeEjecutarAccion,
  puedeVerModulo,
  type AccionPermiso,
} from "@/lib/permisos"

const ESTADOS = getCRMEstadosVisuales()
const ESTADOS_PIPELINE = getCRMEstadosPipeline()
const TEMPERATURAS = getCRMTemperaturasVisuales()
const ORIGENES = getCRMOrigenes()
const INDUSTRIAS = getCRMIndustrias()

type CRMBusinessRuleKey =
  | "crear_lead"
  | "editar_lead"
  | "eliminar_lead"
  | "convertir_cliente"
  | "archivar_lead"
  | "cambiar_estado"

function periodoActual() {
  return new Date().toISOString().slice(0, 7)
}

function referenciasCotizacion(value?: string | null) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizarBusqueda(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

const emptyForm = {
  razon_social: "", ruc: "", nombre_contacto: "", email_contacto: "",
  telefono_contacto: "", direccion: "", cargo_contacto: "", origen: "", estado: "nuevo",
  temperatura: "frio", industria: "", presupuesto_estimado: "",
  probabilidad_cierre: 0, fecha_proxima_accion: "", notas: "",
  responsable_id: "", cliente_id: "", periodo_pipeline: periodoActual(),
  proyecto_id: "",
  referencias_cotizacion: "",
  crear_cliente: false,
}

export default function CRMPage() {
  const supabase = createClient()
  const router = useRouter()
  const [leads, setLeads] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [responsables, setResponsables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTemp, setFiltroTemp] = useState("")
  const [filtroPeriodo, setFiltroPeriodo] = useState("actual")
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState<any>(emptyForm)
  const [nuevaNota, setNuevaNota] = useState("")
  const [notas, setNotas] = useState<any[]>([])
  const [clientesConvertidos, setClientesConvertidos] = useState<Record<string, { id: string; razon_social: string }>>({})
  const [archivando, setArchivando] = useState(false)
  const [perfilActual, setPerfilActual] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCurrentUserId(null)
      setPerfilActual(null)
      setLeads([])
      setClientes([])
      setProyectos([])
      setCotizaciones([])
      setFacturas([])
      setResponsables([])
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setCurrentUserId(user.id)
    setPerfilActual(perfil)

    if (!puedeVerModulo(perfil, "crm")) {
      setLeads([])
      setClientes([])
      setProyectos([])
      setCotizaciones([])
      setFacturas([])
      setResponsables([])
      setLoading(false)
      return
    }

    const [leadsRes, clientesRes, perfilesRes, proyectosRes, cotizacionesRes, facturasRes] = await Promise.all([
      supabase
        .from("crm_leads")
        .select("*, cliente:clientes(id, razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto, nombre_contacto_admin, email_contacto_admin, telefono_contacto_admin), proyecto:proyectos(id, codigo, nombre, estado, cliente_id, deleted_at, cliente:clientes(id, razon_social))")
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
      supabase
        .from("proyectos")
        .select("id, codigo, nombre, estado, cliente_id, deleted_at, cliente:clientes(id, razon_social)")
        .is("deleted_at", null)
        .order("codigo", { ascending: false }),
      supabase
        .from("cotizaciones")
        .select("id, proyecto_id, version, estado, created_at, updated_at, total_cliente, subtotal_precio_cliente, subtotal_con_fee, igv_monto, fee_agencia_pct, fee_activo, igv_pct, descuento_pct, items:cotizacion_items(precio_cliente,incluir_en_total)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("facturas")
        .select("id, proyecto_id, numero_factura, estado, tipo_factura, fecha_emision, fecha_abono, subtotal, igv, monto_final_abonado, updated_at, created_at")
        .order("updated_at", { ascending: false }),
    ])
    if (leadsRes.error) {
      console.error("Error CRM leads", leadsRes.error)
      setLeads([])
    } else {
      const normalizados = (leadsRes.data || []).map(normalizarLead)
      setLeads(filtrarPorAlcance(normalizados, perfil, "crm", { usuarioId: user.id }))
    }
    if (clientesRes.error) {
      console.error("Error CRM clientes", clientesRes.error)
      setClientes([])
    } else {
      setClientes(clientesRes.data || [])
    }
    if (perfilesRes.error) {
      console.error("Error CRM responsables", perfilesRes.error)
      setResponsables([])
    } else {
      setResponsables(perfilesRes.data || [])
    }
    if (proyectosRes.error) {
      console.error("Error CRM proyectos", proyectosRes.error)
      setProyectos([])
    } else {
      setProyectos(proyectosRes.data || [])
    }
    if (cotizacionesRes.error) {
      console.error("Error CRM cotizaciones", cotizacionesRes.error)
      setCotizaciones([])
    } else {
      setCotizaciones(cotizacionesRes.data || [])
    }
    if (facturasRes.error) {
      console.error("Error CRM facturas", facturasRes.error)
      setFacturas([])
    } else {
      setFacturas(facturasRes.data || [])
    }
    setLoading(false)
  }

  async function loadNotas(leadId: string) {
    const { data, error } = await supabase.from("crm_notas").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
    if (error) {
      console.error("Error CRM notas", error)
      setNotas([])
      return
    }
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
      proyecto_id: lead.proyecto_id || null,
      referencias_cotizacion: String(lead.referencias_cotizacion || "").trim(),
      archivado: Boolean(lead.archivado),
    }
  }

  function puedeAccionCRM(accion: AccionPermiso, registro?: any) {
    return puedeEjecutarAccion(perfilActual, "crm", accion, { usuarioId: currentUserId, registro })
  }

  function validarAccionCRM(accion: AccionPermiso, registro?: any) {
    if (puedeAccionCRM(accion, registro)) return true
    alert("No tienes permiso para realizar esta acción.")
    return false
  }

  function validarReglaCRM(regla: CRMBusinessRuleKey, registro?: any, metadata?: Record<string, unknown>) {
    const result = businessRuleEngine.evaluate("crm", regla, {
      action: regla,
      record: registro || null,
      metadata,
      user: perfilActual,
    })

    if (!result.allowed) {
      alert(result.reason || "No se puede realizar esta acción.")
      return false
    }

    if (result.warnings?.length) {
      return confirm(result.warnings.join("\n") + "\n\n¿Deseas continuar?")
    }

    return true
  }

  function abrirNuevo() {
    if (!validarAccionCRM("crear")) return
    setEditando(null)
    setForm({ ...emptyForm, periodo_pipeline: periodoActual() })
    setShowForm(true)
  }

  function abrirEditar(lead: any) {
    if (!validarAccionCRM("editar", lead)) return
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
      proyecto_id: normalizado.proyecto_id || "",
      referencias_cotizacion: normalizado.referencias_cotizacion || "",
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

  function proyectoLabel(proyecto: any) {
    const cotizacion = cotizacionVigenteProyecto(proyecto?.id, cotizaciones)
    const monto = cotizacion ? fmt(totalCotizacionComercial(cotizacion)) : "Sin cotización"
    return `${proyecto?.codigo || "Sin código"} — ${proyecto?.nombre || "Sin nombre"} — ${monto}`
  }

  function aplicarProyecto(proyectoId: string) {
    if (!proyectoId) {
      setForm((prev: any) => ({ ...prev, proyecto_id: "" }))
      return
    }
    const proyecto = proyectos.find(p => p.id === proyectoId)
    if (!proyecto) {
      setForm((prev: any) => ({ ...prev, proyecto_id: proyectoId }))
      return
    }
    setForm((prev: any) => ({
      ...prev,
      proyecto_id: proyecto.id,
      cliente_id: proyecto.cliente_id || prev.cliente_id,
      razon_social: proyecto.cliente?.razon_social || prev.razon_social,
    }))
  }

  async function guardar() {
    if (!validarAccionCRM(editando ? "editar" : "crear", editando || form)) return
    if (!validarReglaCRM(editando ? "editar_lead" : "crear_lead", editando ? { ...editando, ...form } : form, { editando: Boolean(editando) })) return
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
      proyecto_id: form.proyecto_id || null,
      periodo_pipeline: form.periodo_pipeline || periodoActual(),
      referencias_cotizacion: String(form.referencias_cotizacion || "").trim() || null,
      archivado: false,
      notas: form.notas || null,
    }

    const { data, error } = editando
      ? await supabase.from("crm_leads").update(payload).eq("id", editando.id).select().single()
      : await supabase.from("crm_leads").insert({ ...payload, entidad: "peru" }).select().single()

    setSaving(false)
    if (error) { alert("No se pudo guardar el lead: " + error.message); return }
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "crm", entidad_tipo: "lead", entidad_id: data?.id, descripcion: (editando ? "Lead editado: " : "Lead creado: ") + form.razon_social })
    if (payload.proyecto_id) {
      await sincronizarLeadPorProyecto({
        supabase,
        proyectoId: payload.proyecto_id,
        evento: "proyecto_vinculado",
      })
    }
    setShowForm(false)
    load()
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !selected) return
    if (!validarAccionCRM("editar", selected)) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("crm_notas").insert({ lead_id: selected.id, contenido: nuevaNota, created_by: user?.id })
    if (error) { alert("No se pudo agregar la nota: " + error.message); return }
    setNuevaNota("")
    loadNotas(selected.id)
  }

  async function cambiarEstado(leadId: string, estado: string) {
    if (!ESTADOS[estado]) return
    const lead = leads.find(l => l.id === leadId) || selected
    if (!validarAccionCRM("editar", lead)) return
    const estadoActual = lead?.estado
    if (!lifecycleEngine.canTransition("crm", estadoActual, estado)) {
      alert(`Transición no permitida: ${ESTADOS[estadoActual]?.label || estadoActual} → ${ESTADOS[estado]?.label || estado}`)
      return
    }
    if (!validarReglaCRM("cambiar_estado", lead, { desde: estadoActual, hacia: estado })) return
    let clienteId = lead?.cliente_id || null
    if (estado === "ganado" && lead && !clienteId) {
      const cliente = await buscarOCrearCliente(lead)
      clienteId = cliente?.id || null
      if (!clienteId) {
        alert("No se pudo convertir el lead a ganado porque no se pudo vincular o crear el cliente.")
        return false
      }
    }
    const payload: any = { estado }
    if (clienteId) payload.cliente_id = clienteId
    const { error } = await supabase.from("crm_leads").update(payload).eq("id", leadId)
    if (error) { alert("No se pudo cambiar el estado: " + error.message); return false }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...payload } : l))
    if (selected?.id === leadId) setSelected((prev: any) => ({ ...prev, ...payload }))
    return true
  }

  async function eliminarLead(lead: any) {
    if (!validarAccionCRM("eliminar", lead)) return
    if (!validarReglaCRM("eliminar_lead", lead)) return
    if (!confirm("¿Eliminar lead " + lead.razon_social + "?")) return
    const { error } = await supabase.from("crm_leads").delete().eq("id", lead.id)
    if (error) { alert("No se pudo eliminar el lead: " + error.message); return }
    if (selected?.id === lead.id) setSelected(null)
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    await registrarAccion({ accion: "eliminar", modulo: "crm", entidad_tipo: "lead", entidad_id: lead.id, descripcion: "Lead eliminado: " + lead.razon_social })
  }

  async function convertirACliente(lead = selected, confirmar = true) {
    if (!lead) return null
    if (!validarAccionCRM("convertir", lead)) return null
    if (!validarReglaCRM("convertir_cliente", lead)) return null
    if (lead.cliente_id) {
      const cambioOk = await cambiarEstado(lead.id, "ganado")
      return cambioOk ? lead.cliente : null
    }
    if (!lifecycleEngine.canTransition("crm", lead.estado, "ganado")) {
      alert(`Transición no permitida: ${ESTADOS[lead.estado]?.label || lead.estado} → ${ESTADOS.ganado?.label || "ganado"}`)
      return null
    }
    if (!validarReglaCRM("cambiar_estado", lead, { desde: lead.estado, hacia: "ganado" })) return null
    if (confirmar && !confirm("Convertir " + lead.razon_social + " a cliente?")) return null
    const cliente = await buscarOCrearCliente(lead)
    if (!cliente) return null
    const { error } = await supabase.from("crm_leads").update({ estado: "ganado", cliente_id: cliente.id }).eq("id", lead.id)
    if (error) { alert("No se pudo convertir el lead a cliente: " + error.message); return null }
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
    if (!validarAccionCRM("editar", lead)) return
    if (!validarReglaCRM("archivar_lead", lead)) return
    if (!confirm("¿Archivar lead " + lead.razon_social + "?")) return
    const { error } = await supabase.from("crm_leads").update({ archivado: true }).eq("id", lead.id)
    if (error) { alert("No se pudo archivar: " + error.message); return }
    if (selected?.id === lead.id) setSelected(null)
    load()
  }

  async function archivarCerradosDelMes() {
    if (!validarAccionCRM("editar")) return
    const periodo = filtroPeriodo === "actual" || filtroPeriodo === "todos" ? periodoActual() : filtroPeriodo
    if (!validarReglaCRM("archivar_lead", null, { periodo, masivo: true })) return
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

  async function importarLeads(registros: any[]) {
    if (!validarAccionCRM("crear")) return { exitosos: 0, errores: ["No tienes permiso para realizar esta acción."] }

    let exitosos = 0
    const errores: string[] = []

    for (const r of registros) {
      const payload = {
        ...r,
        entidad: "peru",
        estado: ESTADOS[r.estado] ? r.estado : "nuevo",
        temperatura: TEMPERATURAS[r.temperatura] ? r.temperatura : "frio",
        periodo_pipeline: r.periodo_pipeline || periodoActual(),
        proyecto_id: /^[0-9a-f-]{36}$/i.test(String(r.proyecto_id || "")) ? String(r.proyecto_id) : null,
        referencias_cotizacion: String(r.referencias_cotizacion || "").trim() || null,
        archivado: false,
      }
      const result = businessRuleEngine.evaluate("crm", "crear_lead", {
        action: "crear_lead",
        record: payload,
        user: perfilActual,
      })
      if (!result.allowed) {
        errores.push((r.razon_social || "Lead sin nombre") + ": " + (result.reason || "No se puede importar este lead."))
        continue
      }

      const { error } = await supabase.from("crm_leads").insert(payload)
      if (error) errores.push((r.razon_social || "Lead sin nombre") + ": " + error.message)
      else exitosos++
    }

    load()
    return { exitosos, errores }
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

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
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const texto = [l.razon_social, l.ruc, l.nombre_contacto, l.email_contacto, l.telefono_contacto, l.direccion, l.proyecto?.codigo, l.proyecto?.nombre, l.referencias_cotizacion].filter(Boolean).join(" ").toLowerCase()
      const textoNormalizado = normalizarBusqueda(texto)
      const qNormalizado = normalizarBusqueda(q)
      if (!texto.includes(q) && (!qNormalizado || !textoNormalizado.includes(qNormalizado))) return false
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
  const selectedProject = selected ? (selected.proyecto || proyectos.find(p => p.id === selected.proyecto_id)) : null
  const selectedQuote = selected ? cotizacionVigenteProyecto(selected.proyecto_id, cotizaciones) : null
  const selectedInvoice = selected ? facturaVigenteProyecto(selected.proyecto_id, facturas) : null

  const leadsPorEstado = (estado: string) => filtrados.filter(l => l.estado === estado)

  const valorPorEstado = (estado: string) =>
    leadsPorEstado(estado).reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)

  const responsableNombre = (id?: string | null) => {
    const r = responsables.find(p => p.id === id)
    return r ? `${r.nombre || ""} ${r.apellido || ""}`.trim() : ""
  }

  if (loading) return <MasterPage title="CRM Comercial" subtitle="Cargando oportunidades comerciales..."><EmptyState title="Cargando..." /></MasterPage>
  if (!puedeVerModulo(perfilActual, "crm")) {
    return <MasterPage title="CRM Comercial"><EmptyState title="Acceso restringido" description="No tienes permiso para ver este modulo." /></MasterPage>
  }

  const puedeCrearCRM = puedeAccionCRM("crear")
  const puedeEditarCRM = puedeAccionCRM("editar")
  const puedeEliminarCRM = puedeAccionCRM("eliminar")
  const puedeConvertirCRM = puedeAccionCRM("convertir")

  return (
    <MasterPage
      title="CRM Comercial"
      subtitle={`Gestion de oportunidades comerciales · ${leadsPeriodo.length} leads`}
      actions={
        <>
          {puedeCrearCRM && <ImportExport modulo="crm_leads" campos={[{key:"razon_social",label:"Razón social",requerido:true},{key:"ruc",label:"RUC"},{key:"nombre_contacto",label:"Nombre contacto"},{key:"email_contacto",label:"Email"},{key:"telefono_contacto",label:"Teléfono"},{key:"direccion",label:"Dirección"},{key:"cargo_contacto",label:"Cargo"},{key:"origen",label:"Origen"},{key:"industria",label:"Industria"},{key:"temperatura",label:"Temperatura"},{key:"presupuesto_estimado",label:"Presupuesto estimado"},{key:"probabilidad_cierre",label:"Probabilidad %"},{key:"proyecto_id",label:"Proyecto ID (UUID)"},{key:"referencias_cotizacion",label:"Referencia externa"},{key:"periodo_pipeline",label:"Periodo pipeline"}]} datos={leads} onImportar={importarLeads} />}
          {puedeCrearCRM && <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo lead</button>}
        </>
      }
    >

      <div style={{ marginBottom: 24 }}>
        <ExecutiveSummary
          columns={5}
          items={[
            { label: "Pipeline Comercial", value: fmt(totalPipeline), subtitle: `${leadsActivos.length} oportunidades activas`, tone: "success" },
            { label: "Cierre esperado", value: fmt(cierreEsperado), subtitle: "Presupuesto x probabilidad", tone: "info" },
            { label: "Propuestas abiertas", value: propuestasAbiertas.length, subtitle: fmt(propuestasAbiertas.reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)), tone: "warning" },
            { label: "Negocios Ganados", value: fmt(totalGanado), subtitle: `${leadsPeriodo.filter(l => l.estado === "ganado").length} clientes`, tone: "success" },
            { label: "Conversion", value: tasaConversion + "%", subtitle: `${leadsCalientes.length} leads calientes`, tone: "danger" },
          ]}
        />
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar lead" : "Nuevo lead"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Cliente existente</label>
                <select style={inp} value={form.cliente_id} onChange={e => aplicarCliente(e.target.value)}>
                  <option value="">Sin cliente vinculado</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Empresa / nombre *</label><input style={inp} value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></div>
                <div><label style={lbl}>RUC</label><input style={inp} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Contacto</label><input style={inp} value={form.nombre_contacto} onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Email</label><input style={inp} value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} /></div>
                <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono_contacto} onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Dirección</label><input style={inp} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
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
                    {ESTADOS_PIPELINE.map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}
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
              <div>
                <label style={lbl}>Proyecto / presupuesto asociado</label>
                <select style={inp} value={form.proyecto_id} onChange={e => aplicarProyecto(e.target.value)}>
                  <option value="">Sin proyecto asociado</option>
                  {proyectos.map(proyecto => <option key={proyecto.id} value={proyecto.id}>{proyectoLabel(proyecto)}</option>)}
                </select>
                {form.proyecto_id && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    La cotización vigente del proyecto será la fuente del monto cotizado.
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Referencia externa</label>
                <input
                  type="text"
                  style={inp}
                  value={form.referencias_cotizacion}
                  placeholder="Ej: código enviado por el cliente o referencia histórica"
                  onChange={e => setForm({ ...form, referencias_cotizacion: e.target.value })}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  Campo compatible con registros anteriores; no se usa para KPIs.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Próxima acción</label><input type="date" style={inp} value={form.fecha_proxima_accion} onChange={e => setForm({ ...form, fecha_proxima_accion: e.target.value })} /></div>
                <div><label style={lbl}>Periodo pipeline</label><input style={inp} value={form.periodo_pipeline} onChange={e => setForm({ ...form, periodo_pipeline: e.target.value })} placeholder="YYYY-MM" /></div>
                <div>
                  <label style={lbl}>Responsable</label>
                  <select style={inp} value={form.responsable_id} onChange={e => setForm({ ...form, responsable_id: e.target.value })}>
                    <option value="">Sin responsable</option>
                    {responsables.map(r => <option key={r.id} value={r.id}>{r.apellido} {r.nombre}</option>)}
                  </select>
                </div>
              </div>
              {!form.cliente_id && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                  <input type="checkbox" checked={form.crear_cliente} onChange={e => setForm({ ...form, crear_cliente: e.target.checked })} />
                  Crear también en Clientes al guardar
                </label>
              )}
              <div><label style={lbl}>Notas / seguimiento</label><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear lead"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <div>
          <div style={{ marginBottom: 16 }}>
            <FiltersBar
              actions={
                <>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtrados.length} resultados</span>
                  {puedeEditarCRM && <button onClick={archivarCerradosDelMes} disabled={archivando} className="btn-secondary" style={{ fontSize: 13 }}>{archivando ? "Archivando..." : "Archivar cerrados del mes"}</button>}
                  {puedeCrearCRM && <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo lead</button>}
                </>
              }
            >
              <input style={{ ...inp, width: 220 }} placeholder="Buscar lead..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              <select style={{ ...inp, width: "auto" }} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                <option value="actual">Pipeline actual</option>
                <option value="todos">Todos</option>
                {periodos.filter(p => p !== periodoActual()).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                {ESTADOS_PIPELINE.map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
                <option value="">Todas las temp.</option>
                {Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(filtroEstado || filtroTemp || busqueda || filtroPeriodo !== "actual") && (
                <button onClick={() => { setFiltroEstado(""); setFiltroTemp(""); setBusqueda(""); setFiltroPeriodo("actual") }}
                  style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Limpiar</button>
              )}
            </FiltersBar>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 18, background: "#fff", padding: 12, boxShadow: "0 10px 24px rgba(15,23,42,.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, color: "#64748b", fontSize: 12 }}>
              <span>Pipeline de 7 etapas</span>
              <span>Desplázate horizontalmente para ver todo el flujo</span>
            </div>
            <div style={{ overflowX: "auto", paddingBottom: 10, scrollbarGutter: "stable" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 280px)", gap: 16, width: "max-content" }}>
              {ESTADOS_PIPELINE.map(estado => {
                const ec = ESTADOS[estado]
                const lista = leadsPorEstado(estado)
                return (
                  <div key={estado} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 28px rgba(15,23,42,.04)" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: ec.color }} />
                          <div style={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>{ec.label}</div>
                        </div>
                        <StatusBadge label={String(lista.length)} type={estado} />
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{fmt(valorPorEstado(estado))}</div>
                    </div>

                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, minHeight: 360 }}>
                      {lista.length === 0 ? (
                        <EmptyState title="Sin leads" description="No hay oportunidades en esta etapa." />
                      ) : lista.map(lead => {
                        const tc = TEMPERATURAS[lead.temperatura] || { color: "#6b7280", label: lead.temperatura }
                        const responsable = responsableNombre(lead.responsable_id)
                        const proyecto = lead.proyecto || proyectos.find(p => p.id === lead.proyecto_id)
                        const cotizacionVigente = cotizacionVigenteProyecto(lead.proyecto_id, cotizaciones)
                        const facturaVigente = facturaVigenteProyecto(lead.proyecto_id, facturas)
                        const referencias = referenciasCotizacion(lead.referencias_cotizacion)
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
                                {lead.cliente_id && <div style={{ fontSize: 11, color: "#0F6E56", marginTop: 2, fontWeight: 700 }}>Cliente vinculado</div>}
                              </div>
                              {puedeEditarCRM && (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={e => { e.stopPropagation(); abrirEditar(lead) }}
                                    style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "4px 7px", fontSize: 11, cursor: "pointer", color: "#374151" }}>
                                    Editar
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); cambiarEstado(lead.id, "ganado") }}
                                    style={{ border: "1px solid #bbf7d0", background: "#fff", borderRadius: 8, padding: "4px 7px", fontSize: 11, cursor: "pointer", color: "#15803d" }}>
                                    Ganar
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#4b5563" }}>
                              {lead.nombre_contacto && <div>Contacto: {lead.nombre_contacto}</div>}
                              {(lead.telefono_contacto || lead.email_contacto) && <div>{lead.telefono_contacto || lead.email_contacto}</div>}
                              {proyecto && (
                                <div style={{ display: "grid", gap: 3, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 8px" }}>
                                  <a href={`/proyectos/${proyecto.id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 800, color: "#0F6E56", textDecoration: "none" }}>
                                    Proyecto: {proyecto.codigo || proyecto.nombre}
                                  </a>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>
                                    {cotizacionVigente ? `Cotización: V${cotizacionVigente.version || "-"} · ${fmt(totalCotizacionComercial(cotizacionVigente))}` : "Sin cotización registrada"}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>
                                    {facturaVigente ? `Factura: ${facturaVigente.numero_factura || facturaVigente.id} · ${estadoCobroFactura(facturaVigente)}` : "Sin factura registrada"}
                                  </div>
                                </div>
                              )}
                              {referencias.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {referencias.slice(0, 3).map(ref => (
                                    <span
                                      key={ref}
                                      title={ref}
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#0F6E56",
                                        background: "#ecfdf5",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: 999,
                                        padding: "2px 7px"
                                      }}
                                    >
                                      {ref}
                                    </span>
                                  ))}
                                  {referencias.length > 3 && (
                                    <span
                                      title={referencias.slice(3).join(", ")}
                                      style={{ fontSize: 10, fontWeight: 700, color: "#0F6E56", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 7px" }}
                                    >
                                      +{referencias.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <span>{lead.presupuesto_estimado ? fmt(lead.presupuesto_estimado) : "Sin presupuesto"}</span>
                                <strong style={{ color: lead.probabilidad_cierre >= 70 ? "#0F6E56" : lead.probabilidad_cierre >= 40 ? "#ca8a04" : "#6b7280" }}>
                                  {lead.probabilidad_cierre || 0}%
                                </strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                <StatusBadge label={tc.label} type={lead.temperatura} />
                                {lead.fecha_proxima_accion && <span style={{ color: "#d97706", fontSize: 11 }}>Próx. {lead.fecha_proxima_accion}</span>}
                              </div>
                              {responsable && <div style={{ fontSize: 11, color: "#64748b" }}>Responsable: {responsable}</div>}
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
        </div>

        <Drawer
          open={Boolean(selected)}
          title={selected?.razon_social || "Detalle lead"}
          subtitle={selected?.cliente_id ? "Cliente vinculado" : "Sin cliente vinculado"}
          onClose={() => setSelected(null)}
          width={420}
        >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card">
              <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Cliente existente: </span>{selected.cliente_id ? "Sí" : "No"}</div>
                {selected.ruc && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>RUC: </span>{selected.ruc}</div>}
                {selected.nombre_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Contacto: </span>{selected.nombre_contacto}{selected.cargo_contacto ? " · " + selected.cargo_contacto : ""}</div>}
                {selected.email_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Email: </span>{selected.email_contacto}</div>}
                {selected.telefono_contacto && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Tel: </span>{selected.telefono_contacto}</div>}
                {selected.direccion && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Dirección: </span>{selected.direccion}</div>}
                {selected.origen && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Origen: </span>{selected.origen}</div>}
                {selected.industria && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Industria: </span>{selected.industria}</div>}
                {selected.periodo_pipeline && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Periodo: </span>{selected.periodo_pipeline}</div>}
                {responsableNombre(selected.responsable_id) && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Responsable: </span>{responsableNombre(selected.responsable_id)}</div>}
                {selected.fecha_proxima_accion && <div style={{ fontSize: 13, color: "#d97706", fontWeight: 600 }}>Próxima acción: {selected.fecha_proxima_accion}</div>}
                {selected.notas && <div style={{ fontSize: 13 }}><span style={{ color: "#9ca3af" }}>Notas: </span>{selected.notas}</div>}
              </div>
              {puedeEditarCRM && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>CAMBIAR ESTADO</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ESTADOS_PIPELINE.map(k => {
                    const v = ESTADOS[k]
                    return (
                      <button key={k} onClick={() => cambiarEstado(selected.id, k)}
                        style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: selected.estado === k ? v.color : v.bg,
                          color: selected.estado === k ? "#fff" : v.color,
                          border: "1px solid " + v.color }}>
                        {v.label}
                      </button>
                    )
                  })}
                  </div>
                </div>
              )}
              {selected.presupuesto_estimado > 0 && (
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Presupuesto estimado</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0F6E56" }}>{fmt(selected.presupuesto_estimado)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Prob. cierre: {selected.probabilidad_cierre}%</div>
                </div>
              )}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>PROYECTO ASOCIADO</div>
                {selectedProject ? (
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div><span style={{ color: "#9ca3af" }}>Código: </span>{selectedProject.codigo || "Sin código"}</div>
                    <div><span style={{ color: "#9ca3af" }}>Nombre: </span>{selectedProject.nombre || "Sin nombre"}</div>
                    <div><span style={{ color: "#9ca3af" }}>Cliente: </span>{selectedProject.cliente?.razon_social || selected.cliente?.razon_social || "Sin cliente"}</div>
                    <div><span style={{ color: "#9ca3af" }}>Estado: </span>{selectedProject.estado || "Sin estado"}</div>
                    <div><span style={{ color: "#9ca3af" }}>Cotización vigente: </span>{selectedQuote ? `V${selectedQuote.version || "-"} · ${fmt(totalCotizacionComercial(selectedQuote))}` : "Sin cotización registrada"}</div>
                    {selectedQuote && <div><span style={{ color: "#9ca3af" }}>Estado cotización: </span>{selectedQuote.estado || "Sin estado"}</div>}
                    <div><span style={{ color: "#9ca3af" }}>Factura: </span>{selectedInvoice ? `${selectedInvoice.numero_factura || selectedInvoice.id} · ${fmt(totalFacturaComercial(selectedInvoice))}` : "Sin factura registrada"}</div>
                    <div><span style={{ color: "#9ca3af" }}>Cobranza: </span>{selectedInvoice ? `${estadoCobroFactura(selectedInvoice)} · cobrado ${fmt(montoCobradoFacturaComercial(selectedInvoice))}` : "Sin cobranza"}</div>
                    <div style={{ display: "grid", gridTemplateColumns: selectedQuote ? "1fr 1fr" : "1fr", gap: 8, marginTop: 4 }}>
                      <button onClick={() => router.push(`/proyectos/${selectedProject.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver proyecto</button>
                      {selectedQuote && <button onClick={() => router.push(`/proyectos/${selectedProject.id}/cotizaciones/${selectedQuote.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver cotización</button>}
                      {selectedInvoice && <button onClick={() => router.push(`/facturacion?proyecto_id=${selectedProject.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver factura</button>}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Sin proyecto asociado.</div>
                )}
              </div>
              {referenciasCotizacion(selected.referencias_cotizacion).length > 0 && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>REFERENCIA EXTERNA</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {referenciasCotizacion(selected.referencias_cotizacion).map(ref => (
                      <span key={ref} title={ref} style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "3px 8px" }}>
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gap: 8 }}>
                {puedeEditarCRM && <button onClick={() => abrirEditar(selected)} className="btn-secondary" style={{ fontSize: 13, width: "100%" }}>Editar</button>}
                {puedeConvertirCRM && !selected.cliente_id && (
                  <button onClick={() => convertirACliente(selected, true)}
                    style={{ width: "100%", padding: "8px", background: "#0F6E56", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Convertir a cliente
                  </button>
                )}
                <button disabled title="Próximamente" className="btn-secondary" style={{ fontSize: 13, width: "100%", opacity: .55, cursor: "not-allowed" }}>Crear cotización</button>
                {puedeEditarCRM && <button onClick={() => archivarLead(selected)} className="btn-secondary" style={{ fontSize: 13, width: "100%" }}>Archivar</button>}
                {puedeEliminarCRM && <button onClick={() => eliminarLead(selected)}
                  style={{ width: "100%", padding: "8px", background: "#fff", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Eliminar
                </button>}
              </div>
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
        </Drawer>
      </div>
    </MasterPage>
  )
}
