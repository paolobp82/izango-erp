"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState, DragEvent } from "react"
import {
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  Percent,
  Search,
  TrendingUp,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import {
  V2Button,
  V2Drawer,
  V2FormField,
  V2Input,
  V2KpiCard,
  V2Modal,
  V2PageHeader,
  V2SectionCard,
  V2Select,
  V2Skeleton,
} from "@/components/v2/system"
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
  cotizacionVigenteProyecto,
  estadoCobroFactura,
  facturaVigenteProyecto,
  totalCotizacionComercial,
} from "@/lib/comercial/cotizaciones"
import { sincronizarLeadPorProyecto } from "@/lib/comercial/sincronizacion"
import {
  filtrarPorAlcance,
  puedeEjecutarAccion,
  puedeVerModulo,
  type AccionPermiso,
} from "@/lib/permisos"

// Custom Components
import { CRMFilterSection, type AppliedFilters } from "./components/CRMFilterSection"
import { CRMKanbanBoard } from "./components/CRMKanbanBoard"
import { CRMLeadCard } from "./components/CRMLeadCard"

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

function normalizarBusqueda(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

const emptyForm = {
  razon_social: "",
  ruc: "",
  nombre_contacto: "",
  email_contacto: "",
  telefono_contacto: "",
  direccion: "",
  cargo_contacto: "",
  origen: "",
  estado: "nuevo",
  temperatura: "frio",
  industria: "",
  presupuesto_estimado: "",
  probabilidad_cierre: 0,
  fecha_proxima_accion: "",
  notas: "",
  responsable_id: "",
  cliente_id: "",
  periodo_pipeline: periodoActual(),
  proyecto_id: "",
  referencias_cotizacion: "",
  crear_cliente: false,
}

const emptyFilters: AppliedFilters = {
  responsableId: "",
  clienteId: "",
  estado: "",
  origen: "",
  periodo: "actual",
  temperatura: "",
  montoMin: "",
  montoMax: "",
  soloMisLeads: false,
}

export default function CRMPage() {
  const supabase = createClient()
  const router = useRouter()

  // Data sets
  const [leads, setLeads] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [responsables, setResponsables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Layout & modals states
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [nuevaNota, setNuevaNota] = useState("")
  const [notas, setNotas] = useState<any[]>([])
  const [clientesConvertidos, setClientesConvertidos] = useState<Record<string, { id: string; razon_social: string }>>({})
  const [perfilActual, setPerfilActual] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // View States
  const [density, setDensity] = useState<"compacta" | "normal" | "expandida">("compacta")
  const [orderBy, setOrderBy] = useState<"actualizacion" | "monto" | "probabilidad">("actualizacion")
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({})

  // Filters State
  const [busqueda, setBusqueda] = useState("")
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({ ...emptyFilters })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
        .select(
          "*, cliente:clientes(id, razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto, nombre_contacto_admin, email_contacto_admin, telefono_contacto_admin), proyecto:proyectos(id, codigo, nombre, estado, cliente_id, deleted_at, cliente:clientes(id, razon_social))"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("clientes")
        .select(
          "id, razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto, nombre_contacto_admin, email_contacto_admin, telefono_contacto_admin, banco_1, numero_cuenta_1, cci_1"
        )
        .order("razon_social"),
      supabase.from("perfiles").select("id, nombre, apellido, perfil").eq("activo", true).order("apellido"),
      supabase
        .from("proyectos")
        .select("id, codigo, nombre, estado, cliente_id, deleted_at, cliente:clientes(id, razon_social)")
        .is("deleted_at", null)
        .order("codigo", { ascending: false }),
      supabase
        .from("cotizaciones")
        .select(
          "id, proyecto_id, version, estado, created_at, updated_at, total_cliente, subtotal_precio_cliente, subtotal_con_fee, igv_monto, fee_agencia_pct, fee_activo, igv_pct, descuento_pct, items:cotizacion_items(precio_cliente,incluir_en_total)"
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("facturas")
        .select(
          "id, proyecto_id, numero_factura, estado, tipo_factura, fecha_emision, fecha_abono, subtotal, igv, monto_final_abonado, updated_at, created_at"
        )
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
    const { data, error } = await supabase
      .from("crm_notas")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
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
      razon_social: normalizado.razon_social || "",
      ruc: normalizado.ruc || "",
      nombre_contacto: normalizado.nombre_contacto || "",
      email_contacto: normalizado.email_contacto || "",
      telefono_contacto: normalizado.telefono_contacto || "",
      direccion: normalizado.direccion || "",
      cargo_contacto: normalizado.cargo_contacto || "",
      origen: normalizado.origen || "",
      estado: normalizado.estado || "nuevo",
      temperatura: normalizado.temperatura || "frio",
      industria: normalizado.industria || "",
      presupuesto_estimado: normalizado.presupuesto_estimado || "",
      probabilidad_cierre: normalizado.probabilidad_cierre || 0,
      fecha_proxima_accion: normalizado.fecha_proxima_accion || "",
      notas: normalizado.notas || "",
      responsable_id: normalizado.responsable_id || "",
      cliente_id: normalizado.cliente_id || "",
      periodo_pipeline: normalizado.periodo_pipeline || periodoActual(),
      proyecto_id: normalizado.proyecto_id || "",
      referencias_cotizacion: normalizado.referencias_cotizacion || "",
      crear_cliente: false,
    })
    setShowForm(true)
  }

  function aplicarCliente(clienteId: string) {
    const cliente = clientes.find((c) => c.id === clienteId)
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
    const proyecto = proyectos.find((p) => p.id === proyectoId)
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
    if (
      !validarReglaCRM(
        editando ? "editar_lead" : "crear_lead",
        editando ? { ...editando, ...form } : form,
        { editando: Boolean(editando) }
      )
    )
      return
    if (!form.razon_social) {
      alert("Razón social es obligatoria")
      return
    }
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
      periodo_pipeline: form.periodo_pipeline || pipelinePeriodoPorForm(form.periodo_pipeline),
      referencias_cotizacion: String(form.referencias_cotizacion || "").trim() || null,
      archivado: false,
      notas: form.notes || form.notas || null,
    }

    const { data, error } = editando
      ? await supabase.from("crm_leads").update(payload).eq("id", editando.id).select().single()
      : await supabase.from("crm_leads").insert({ ...payload, entidad: "peru" }).select().single()

    setSaving(false)
    if (error) {
      alert("No se pudo guardar el lead: " + error.message)
      return
    }
    await registrarAccion({
      accion: editando ? "editar" : "crear",
      modulo: "crm",
      entidad_tipo: "lead",
      entidad_id: data?.id,
      descripcion: (editando ? "Lead editado: " : "Lead creado: ") + form.razon_social,
    })
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

  function pipelinePeriodoPorForm(val: string) {
    if (!val) return periodoActual()
    const regex = /^\d{4}-\d{2}$/
    return regex.test(val) ? val : periodoActual()
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !selected) return
    if (!validarAccionCRM("editar", selected)) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from("crm_notas")
      .insert({ lead_id: selected.id, contenido: nuevaNota, created_by: user?.id })
    if (error) {
      alert("No se pudo agregar la nota: " + error.message)
      return
    }
    setNuevaNota("")
    loadNotas(selected.id)
  }

  async function cambiarEstado(leadId: string, estado: string) {
    if (!ESTADOS[estado]) return false
    const lead = leads.find((l) => l.id === leadId) || selected
    if (!validarAccionCRM("editar", lead)) return false
    const estadoActual = lead?.estado
    if (!lifecycleEngine.canTransition("crm", estadoActual, estado)) {
      alert(
        `Transición no permitida: ${ESTADOS[estadoActual]?.label || estadoActual} → ${
          ESTADOS[estado]?.label || estado
        }`
      )
      return false
    }
    if (!validarReglaCRM("cambiar_estado", lead, { desde: estadoActual, hacia: estado })) return false
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
    if (error) {
      alert("No se pudo cambiar el estado: " + error.message)
      return false
    }

    // Update local list
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...payload } : l)))
    if (selected?.id === leadId) setSelected((prev: any) => ({ ...prev, ...payload }))

    await registrarAccion({
      accion: "cambiar_estado",
      modulo: "crm",
      entidad_tipo: "lead",
      entidad_id: leadId,
      descripcion: `Estado cambiado: ${ESTADOS[estadoActual]?.label || estadoActual} → ${ESTADOS[estado]?.label}`,
    })

    return true
  }

  async function eliminarLead(lead: any) {
    if (!validarAccionCRM("eliminar", lead)) return
    if (!validarReglaCRM("eliminar_lead", lead)) return
    if (!confirm("¿Eliminar lead " + lead.razon_social + "?")) return
    const { error } = await supabase.from("crm_leads").delete().eq("id", lead.id)
    if (error) {
      alert("No se pudo eliminar el lead: " + error.message)
      return
    }
    if (selected?.id === lead.id) setSelected(null)
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    await registrarAccion({
      accion: "eliminar",
      modulo: "crm",
      entidad_tipo: "lead",
      entidad_id: lead.id,
      descripcion: "Lead eliminado: " + lead.razon_social,
    })
  }

  async function convertirACliente(lead = selected, confirmar = true) {
    if (!lead) return null
    if (!validarAccionCRM("convertir", lead)) return null
    if (!validarReglaCRM("convertir_cliente", lead)) return null
    if (lead.cliente_id) {
      alert("El lead ya está vinculado a un cliente.")
      return lead.cliente_id
    }
    if (confirmar && !confirm(`¿Convertir lead ${lead.razon_social} a Cliente?`)) return null
    const cliente = await buscarOCrearCliente(lead)
    if (cliente) {
      const { error } = await supabase.from("crm_leads").update({ cliente_id: cliente.id }).eq("id", lead.id)
      if (error) {
        console.error("Error vinculando lead a cliente convertido", error)
      } else {
        setClientesConvertidos((prev) => ({ ...prev, [lead.id]: { id: cliente.id, razon_social: cliente.razon_social } }))
        load()
      }
      return cliente.id
    }
    return null
  }

  async function buscarOCrearCliente(datos: any) {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id, razon_social")
      .eq("razon_social", datos.razon_social)
      .is("deleted_at", null)
      .maybeSingle()
    if (existente) return existente

    const { data: creado, error } = await supabase
      .from("clientes")
      .insert({
        razon_social: datos.razon_social,
        ruc: datos.ruc || null,
        direccion: datos.direccion || null,
        nombre_contacto: datos.nombre_contacto || null,
        email_contacto: datos.email_contacto || null,
        telefono_contacto: datos.telefono_contacto || null,
        entidad: "peru",
        activo: true,
      })
      .select("id, razon_social")
      .single()

    if (error) {
      alert("Error al crear cliente: " + error.message)
      return null
    }
    await registrarAccion({
      accion: "crear",
      modulo: "clientes",
      entidad_tipo: "cliente",
      entidad_id: creado?.id,
      descripcion: "Cliente creado desde CRM: " + datos.razon_social,
    })
    return creado
  }

  async function archivarLead(lead: any) {
    if (!validarAccionCRM("editar", lead)) return
    if (!validarReglaCRM("archivar_lead", lead)) return
    if (!confirm(`¿Archivar lead ${lead.razon_social}?`)) return
    const { error } = await supabase.from("crm_leads").update({ archivado: true }).eq("id", lead.id)
    if (error) {
      alert("No se pudo archivar el lead: " + error.message)
      return
    }
    if (selected?.id === lead.id) setSelected(null)
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    await registrarAccion({
      accion: "editar",
      modulo: "crm",
      entidad_tipo: "lead",
      entidad_id: lead.id,
      descripcion: "Lead archivado: " + lead.razon_social,
    })
  }

  async function archivarCerradosDelMes() {
    if (!puedeCrearCRM) {
      alert("No tienes permisos suficientes.")
      return
    }
    const mes = periodoActual()
    const cerrados = leads.filter(
      (l) => l.periodo_pipeline === mes && ["ganado", "perdido"].includes(l.estado) && !l.archivado
    )
    if (cerrados.length === 0) {
      alert("No hay leads ganados o perdidos sin archivar en el periodo actual.")
      return
    }
    if (!confirm(`¿Archivar ${cerrados.length} leads ganados/perdidos del mes?`)) return
    const ids = cerrados.map((l) => l.id)
    const { error } = await supabase.from("crm_leads").update({ archivado: true }).in("id", ids)
    if (error) {
      alert("Error al archivar leads: " + error.message)
      return
    }
    alert(`${cerrados.length} leads archivados correctamente.`)
    load()
  }

  async function importarLeads(registros: any[]) {
    let exitosos = 0
    const errores: string[] = []

    for (const r of registros) {
      const payload = {
        razon_social: r.razon_social || r.Empresa,
        ruc: r.ruc || r.RUC || null,
        nombre_contacto: r.nombre_contacto || r.Contacto || null,
        email_contacto: r.email_contacto || r.Email || null,
        telefono_contacto: r.telefono_contacto || r.Telefono || null,
        direccion: r.direccion || r.Direccion || null,
        cargo_contacto: r.cargo_contacto || r.Cargo || null,
        origen: r.origen || r.Origen || null,
        estado: r.estado || r.Estado || "nuevo",
        temperatura: r.temperatura || r.Temperatura || "frio",
        industria: r.industria || r.Industria || null,
        presupuesto_estimado: r.presupuesto_estimado || r.Presupuesto ? Number(r.presupuesto_estimado || r.Presupuesto) : null,
        probabilidad_cierre: Number(r.probabilidad_cierre || r.Probabilidad) || 0,
        fecha_proxima_accion: r.fecha_proxima_accion || r.Fecha_Contacto || null,
        responsable_id: r.responsable_id || null,
        periodo_pipeline: r.periodo_pipeline || r.Periodo || periodoActual(),
        referencias_cotizacion: r.referencias_cotizacion || r.Referencia || null,
        entidad: "peru",
        archivado: false,
      }

      const result = businessRuleEngine.evaluate("crm", "crear_lead", {
        action: "crear_lead",
        record: payload,
        user: perfilActual,
      })
      if (!result.allowed) {
        errores.push(
          (r.razon_social || "Lead sin nombre") + ": " + (result.reason || "No se puede importar este lead.")
        )
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

  // Derived arrays
  const periodos = useMemo(() => {
    const valores = Array.from(new Set(leads.map((l) => l.periodo_pipeline || periodoActual()).filter(Boolean)))
    return valores.sort().reverse()
  }, [leads])

  const leadsPeriodo = useMemo(() => {
    return leads.filter((l) => {
      if (appliedFilters.periodo === "todos") return true
      const periodo = appliedFilters.periodo === "actual" ? periodoActual() : appliedFilters.periodo
      return l.periodo_pipeline === periodo && !l.archivado
    })
  }, [leads, appliedFilters.periodo])

  const filtrados = useMemo(() => {
    return leadsPeriodo.filter((l) => {
      if (appliedFilters.estado && l.estado !== appliedFilters.estado) return false
      if (appliedFilters.temperatura && l.temperatura !== appliedFilters.temperatura) return false
      if (appliedFilters.responsableId && l.responsable_id !== appliedFilters.responsableId) return false
      if (appliedFilters.clienteId && l.cliente_id !== appliedFilters.clienteId) return false
      if (appliedFilters.origen && l.origen !== appliedFilters.origen) return false
      if (appliedFilters.soloMisLeads && l.responsable_id !== currentUserId) return false
      if (appliedFilters.montoMin && (Number(l.presupuesto_estimado) || 0) < Number(appliedFilters.montoMin)) return false
      if (appliedFilters.montoMax && (Number(l.presupuesto_estimado) || 0) > Number(appliedFilters.montoMax)) return false

      if (busqueda) {
        const q = busqueda.toLowerCase()
        const texto = [
          l.razon_social,
          l.ruc,
          l.nombre_contacto,
          l.email_contacto,
          l.telefono_contacto,
          l.direccion,
          l.proyecto?.codigo,
          l.proyecto?.nombre,
          l.referencias_cotizacion,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        const textoNormalizado = normalizarBusqueda(texto)
        const qNormalizado = normalizarBusqueda(q)
        if (!texto.includes(q) && (!qNormalizado || !textoNormalizado.includes(qNormalizado))) return false
      }
      return true
    })
  }, [leadsPeriodo, appliedFilters, busqueda, currentUserId])

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (appliedFilters.estado) count++
    if (appliedFilters.temperatura) count++
    if (appliedFilters.periodo !== "actual") count++
    if (appliedFilters.responsableId) count++
    if (appliedFilters.clienteId) count++
    if (appliedFilters.origen) count++
    if (appliedFilters.soloMisLeads) count++
    if (appliedFilters.montoMin || appliedFilters.montoMax) count++
    if (busqueda) count++
    return count
  }, [appliedFilters, busqueda])

  // KPIs Calculations
  const leadsActivos = useMemo(() => {
    return leadsPeriodo.filter((l) => !["ganado", "perdido"].includes(l.estado))
  }, [leadsPeriodo])

  const totalPipeline = useMemo(() => {
    return leadsActivos.reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)
  }, [leadsActivos])

  const totalGanado = useMemo(() => {
    return leadsPeriodo.filter((l) => l.estado === "ganado").reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)
  }, [leadsPeriodo])

  const totalPerdido = useMemo(() => {
    return leadsPeriodo.filter((l) => l.estado === "perdido").reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)
  }, [leadsPeriodo])

  const cierreEsperado = useMemo(() => {
    return leadsActivos.reduce(
      (s, l) => s + (Number(l.presupuesto_estimado) || 0) * ((Number(l.probabilidad_cierre) || 0) / 100),
      0
    )
  }, [leadsActivos])

  const tasaConversion = useMemo(() => {
    const totalMes = leadsPeriodo.length
    if (totalMes === 0) return 0
    const ganadosMes = leadsPeriodo.filter((l) => l.estado === "ganado").length
    return Math.round((ganadosMes / totalMes) * 100)
  }, [leadsPeriodo])

  const propuestasAbiertas = useMemo(() => {
    return leadsPeriodo.filter((l) => ["propuesta", "negociacion"].includes(l.estado))
  }, [leadsPeriodo])

  const vencenEstaSemana = useMemo(() => {
    const hoy = new Date()
    const finSem = new Date()
    finSem.setDate(hoy.getDate() + 7)
    return leadsPeriodo.filter((l) => {
      if (!l.fecha_proxima_accion) return false
      const d = new Date(l.fecha_proxima_accion)
      return d >= hoy && d <= finSem
    }).length
  }, [leadsPeriodo])

  // Column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    ESTADOS_PIPELINE.forEach((k) => {
      totals[k] = filtrados.filter((l) => l.estado === k).reduce((s, l) => s + (Number(l.presupuesto_estimado) || 0), 0)
    })
    return totals
  }, [filtrados])

  // Select configurations
  const periodosOptions = useMemo(() => {
    return [
      { label: "Pipeline actual", value: "actual" },
      { label: "Todos los periodos", value: "todos" },
      ...periodos
        .filter((p) => p !== periodoActual())
        .map((p) => ({ label: p, value: p })),
    ]
  }, [periodos])

  const filtroEstadoOptions = useMemo(() => {
    return [
      { label: "Todos los estados", value: "" },
      ...ESTADOS_PIPELINE.map((k) => ({ label: ESTADOS[k].label, value: k })),
    ]
  }, [])

  const filtroTempOptions = useMemo(() => {
    return [
      { label: "Todas las temp.", value: "" },
      ...Object.keys(TEMPERATURAS).map((k) => {
        let label = "Baja (Frío)"
        if (k === "caliente") label = "Alta (Caliente)"
        else if (k === "tibio") label = "Media (Tibio)"
        return { label, value: k }
      }),
    ]
  }, [])

  const clienteOptions = useMemo(() => {
    return [
      { label: "Todos los clientes", value: "" },
      ...clientes.map((c) => ({ label: c.razon_social, value: c.id })),
    ]
  }, [clientes])

  const responsableOptions = useMemo(() => {
    const comerciales = responsables.filter((r) => r.perfil === "comercial")
    return [
      { label: "Todos los comerciales", value: "" },
      ...comerciales.map((r) => ({ label: `${r.nombre || ""} ${r.apellido || ""}`.trim(), value: r.id })),
    ]
  }, [responsables])

  const origenOptions = useMemo(() => {
    return [
      { label: "Todos los orígenes", value: "" },
      ...ORIGENES.map((o) => ({ label: o, value: o })),
    ]
  }, [])

  const industriaOptions = useMemo(() => {
    return [
      { label: "Seleccionar industria...", value: "" },
      ...INDUSTRIAS.map((i) => ({ label: i, value: i })),
    ]
  }, [])

  const proyectoOptions = useMemo(() => {
    return [
      { label: "Vincular a proyecto...", value: "" },
      ...proyectos.map((p) => ({ label: proyectoLabel(p), value: p.id })),
    ]
  }, [proyectos, cotizaciones])

  const ESTADOS_COMPLETOS = useMemo(() => {
    return ESTADOS_PIPELINE.map((k) => ({
      key: k,
      label: ESTADOS[k].label,
      color: ESTADOS[k].color,
    }))
  }, [])

  // Action Permissions
  const puedeCrearCRM = puedeAccionCRM("crear")
  const puedeEditarCRM = puedeAccionCRM("editar")

  const headerActions = (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {/* Acciones rápidas dropdown */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value === "archivar_cerrados") {
            archivarCerradosDelMes()
          }
          e.target.value = ""
        }}
        style={{
          padding: "0 12px",
          border: "1px solid var(--v2-border)",
          borderRadius: "var(--v2-radius)",
          background: "var(--v2-surface)",
          color: "var(--v2-text)",
          fontSize: "12px",
          fontWeight: 900,
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
          height: "32px",
          boxSizing: "border-box",
        }}
      >
        <option value="" disabled>Acciones rápidas</option>
        <option value="archivar_cerrados">Archivar cerrados del mes</option>
      </select>

      {/* Import / Export component */}
      {puedeCrearCRM && (
        <ImportExport
          modulo="crm_leads"
          campos={[
            { key: "razon_social", label: "Empresa", requerido: true },
            { key: "ruc", label: "RUC" },
            { key: "nombre_contacto", label: "Contacto" },
            { key: "email_contacto", label: "Email" },
            { key: "telefono_contacto", label: "Telefono" },
            { key: "direccion", label: "Direccion" },
            { key: "cargo_contacto", label: "Cargo" },
            { key: "origen", label: "Origen" },
            { key: "estado", label: "Estado" },
            { key: "temperatura", label: "Temperatura" },
            { key: "industria", label: "Industria" },
            { key: "presupuesto_estimado", label: "Presupuesto" },
            { key: "probabilidad_cierre", label: "Probabilidad" },
            { key: "fecha_proxima_accion", label: "Fecha_Contacto" },
            { key: "referencias_cotizacion", label: "Referencia" },
          ]}
          datos={leads}
          onImportar={importarLeads}
          variant="v2"
        />
      )}

      {/* Nuevo Lead button */}
      {puedeCrearCRM && (
        <V2Button onClick={abrirNuevo} size="compact">
          + Nuevo Lead
        </V2Button>
      )}
    </div>
  )

  const kpiSection = (
    <>
      <V2KpiCard
        icon={<CircleDollarSign size={16} />}
        label="Pipeline Comercial"
        value={fmt(totalPipeline)}
        meta={`${leadsActivos.length} leads`}
        density="compact"
      />
      <V2KpiCard
        icon={<TrendingUp size={16} />}
        label="Cierre Esperado"
        value={fmt(cierreEsperado)}
        meta={`${totalPipeline > 0 ? ((cierreEsperado / totalPipeline) * 100).toFixed(1) : "0.0"}% del pipeline`}
        density="compact"
      />
      <V2KpiCard
        icon={<Clock3 size={16} />}
        label="Propuestas Abiertas"
        value={String(propuestasAbiertas.length)}
        meta={`${vencenEstaSemana} vencen esta semana`}
        trend={vencenEstaSemana > 0 ? "negative" : "neutral"}
        trendLabel={vencenEstaSemana > 0 ? `${vencenEstaSemana} alerta` : undefined}
        density="compact"
      />
      <V2KpiCard
        icon={<BriefcaseBusiness size={16} />}
        label="Negocios Ganados"
        value={fmt(totalGanado)}
        meta={`${leadsPeriodo.filter((l) => l.estado === "ganado").length} lead`}
        trend="positive"
        trendLabel="Este mes"
        density="compact"
      />
      <V2KpiCard
        icon={<Search size={16} />}
        label="Negocios Perdidos"
        value={fmt(totalPerdido)}
        meta={`${leadsPeriodo.filter((l) => l.estado === "perdido").length} leads`}
        trend="neutral"
        trendLabel="Este mes"
        density="compact"
      />
      <V2KpiCard
        icon={<Percent size={16} />}
        label="Tasa de Conversión"
        value={`${tasaConversion}%`}
        meta={`${leadsPeriodo.filter((l) => l.estado === "ganado").length} / ${leadsPeriodo.length} leads`}
        trend="positive"
        trendLabel="Este mes"
        density="compact"
      />
    </>
  )

  const totalCollapsed = ESTADOS_PIPELINE.filter((k) => collapsedColumns[k]).length
  const allCollapsed = totalCollapsed === ESTADOS_PIPELINE.length

  const controlsRow = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "4px",
        fontSize: "12px",
        borderBottom: "1px solid var(--v2-border-soft)",
        paddingBottom: "4px",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--v2-muted)" }}>Vista:</span>
          <span style={{ fontWeight: 800, color: "var(--v2-text)" }}>Pipeline</span>
        </div>

        {/* Compacta / Normal / Expandida toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--v2-surface-soft)",
            borderRadius: "var(--v2-radius-sm)",
            padding: "2px",
          }}
        >
          {(["compacta", "normal", "expandida"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDensity(mode)}
              style={{
                padding: "3px 8px",
                borderRadius: "var(--v2-radius-sm)",
                border: "none",
                fontSize: "10.5px",
                fontWeight: density === mode ? 900 : 600,
                background: density === mode ? "var(--v2-surface)" : "none",
                color: density === mode ? "var(--v2-text)" : "var(--v2-muted)",
                cursor: "pointer",
                transition: "all 0.1s ease",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Selector "Pipeline actual" */}
        <div style={{ width: "135px" }}>
          <V2Select
            options={periodosOptions}
            value={appliedFilters.periodo}
            onChange={(e) => setAppliedFilters((prev) => ({ ...prev, periodo: e.target.value }))}
            compact
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--v2-muted)" }}>Ordenar por:</span>
          <V2Select
            options={[
              { label: "Fecha de actualización", value: "actualizacion" },
              { label: "Monto", value: "monto" },
              { label: "Probabilidad", value: "probabilidad" },
            ]}
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as any)}
            compact
          />
        </div>

        <button
          type="button"
          onClick={allCollapsed ? handleExpandAll : handleCollapseAll}
          style={{
            background: "none",
            border: "none",
            color: "var(--v2-subtle)",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontFamily: "inherit",
          }}
        >
          {allCollapsed ? "Expandir etapas" : "Colapsar etapas"}
        </button>
      </div>
    </div>
  )

  function renderCard(lead: any) {
    const proyecto = lead.proyecto || proyectos.find((p) => p.id === lead.proyecto_id)
    const cotizacionVigente = cotizacionVigenteProyecto(lead.proyecto_id, cotizaciones)
    const facturaVigente = facturaVigenteProyecto(lead.proyecto_id, facturas)
    const totalCotLabel = cotizacionVigente ? fmt(totalCotizacionComercial(cotizacionVigente)) : ""
    const estadoCobroFactLabel = facturaVigente ? estadoCobroFactura(facturaVigente) : ""

    return (
      <CRMLeadCard
        key={lead.id}
        lead={lead}
        responsables={responsables}
        selected={selected && selected.id === lead.id}
        density={density}
        onClick={() => {
          setSelected(lead)
          loadNotas(lead.id)
        }}
        puedeEditar={puedeEditarCRM}
        onFastWin={() => cambiarEstado(lead.id, "ganado")}
        proyecto={proyecto}
        cotizacionVigente={cotizacionVigente}
        facturaVigente={facturaVigente}
        totalCotizacionLabel={totalCotLabel}
        estadoCobroFacturaLabel={estadoCobroFactLabel}
        onDragStart={handleDragStart}
      />
    )
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, leadId: string) {
    if (!puedeEditarCRM) return
    e.dataTransfer.setData("text/plain", leadId)
  }

  function handleToggleCollapseColumn(key: string) {
    setCollapsedColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function handleCollapseAll() {
    const updated: Record<string, boolean> = {}
    ESTADOS_PIPELINE.forEach((k) => {
      updated[k] = true
    })
    setCollapsedColumns(updated)
  }

  function handleExpandAll() {
    setCollapsedColumns({})
  }

  function responsableNombre(id?: string | null) {
    const r = responsables.find((p) => p.id === id)
    return r ? `${r.nombre || ""} ${r.apellido || ""}`.trim() : ""
  }

  return (
    <div style={{ display: "grid", gap: "12px", width: "100%" }}>
        {/* Cabecera */}
        <V2PageHeader
          eyebrow="CRM COMERCIAL"
          title="Gestión de Oportunidades"
          subtitle="Seguimiento de prospectos y control de leads comerciales."
          actions={headerActions}
        />

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            width: "100%",
          }}
        >
          {kpiSection}
        </div>

        {/* Barra de Filtros rápidos y Drawer */}
        <CRMFilterSection
          appliedFilters={appliedFilters}
          setAppliedFilters={setAppliedFilters}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          activeFiltersCount={activeFiltersCount}
          responsableOptions={responsableOptions}
          clienteOptions={clienteOptions}
          estadoOptions={filtroEstadoOptions}
          origenOptions={origenOptions}
          temperaturaOptions={filtroTempOptions}
        />

        {/* Controles de vista y densidad */}
        {controlsRow}

        {/* Tablero Kanban */}
        {loading ? (
          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <V2Skeleton key={i} height={400} />
            ))}
          </div>
        ) : (
          <CRMKanbanBoard
            estados={ESTADOS_COMPLETOS}
            leadsFiltrados={filtrados}
            renderCard={renderCard}
            onLeadDrop={cambiarEstado}
            puedeEditar={puedeEditarCRM}
            density={density}
            collapsedColumns={collapsedColumns}
            onToggleCollapseColumn={handleToggleCollapseColumn}
            columnTotals={columnTotals}
            onAddLead={abrirNuevo}
          />
        )}

        {/* Modal de Creación / Edición */}
        {showForm && (
          <V2Modal
            open={showForm}
            onClose={() => {
              setShowForm(false)
              setEditando(null)
            }}
            title={editando ? "Editar Lead" : "Nuevo Lead"}
            footer={
              <div style={{ display: "flex", justifySelf: "end", gap: "8px" }}>
                <V2Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditando(null)
                  }}
                >
                  Cancelar
                </V2Button>
                <V2Button onClick={guardar} loading={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </V2Button>
              </div>
            }
          >
            <div style={{ display: "grid", gap: 14 }}>
              <V2FormField label="Cliente existente">
                <V2Select
                  options={clienteOptions}
                  value={form.cliente_id || ""}
                  onChange={(e) => aplicarCliente(e.target.value)}
                />
              </V2FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <V2FormField label="Empresa / nombre" required>
                  <V2Input
                    value={form.razon_social}
                    onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="RUC">
                  <V2Input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
                </V2FormField>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <V2FormField label="Contacto">
                  <V2Input
                    value={form.nombre_contacto}
                    onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Email">
                  <V2Input
                    value={form.email_contacto}
                    onChange={(e) => setForm({ ...form, email_contacto: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Teléfono">
                  <V2Input
                    value={form.telefono_contacto}
                    onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
                  />
                </V2FormField>
              </div>

              <V2FormField label="Dirección">
                <V2Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </V2FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <V2FormField label="Cargo">
                  <V2Input
                    value={form.cargo_contacto}
                    onChange={(e) => setForm({ ...form, cargo_contacto: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Origen">
                  <V2Select
                    options={origenOptions}
                    value={form.origen || ""}
                    onChange={(e) => setForm({ ...form, origen: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Industria">
                  <V2Select
                    options={industriaOptions}
                    value={form.industria || ""}
                    onChange={(e) => setForm({ ...form, industria: e.target.value })}
                  />
                </V2FormField>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <V2FormField label="Estado">
                  <V2Select
                    options={filtroEstadoOptions.filter((o) => o.value !== "")}
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Temperatura">
                  <V2Select
                    options={filtroTempOptions.filter((o) => o.value !== "")}
                    value={form.temperatura}
                    onChange={(e) => setForm({ ...form, temperatura: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Presupuesto est.">
                  <V2Input
                    type="number"
                    value={form.presupuesto_estimado}
                    onChange={(e) => setForm({ ...form, presupuesto_estimado: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Probabilidad %">
                  <V2Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.probabilidad_cierre}
                    onChange={(e) => setForm({ ...form, probabilidad_cierre: Number(e.target.value) })}
                  />
                </V2FormField>
              </div>

              <V2FormField label="Proyecto / presupuesto asociado">
                <V2Select
                  options={proyectoOptions}
                  value={form.proyecto_id || ""}
                  onChange={(e) => aplicarProyecto(e.target.value)}
                />
                {form.proyecto_id && (
                  <div style={{ fontSize: 11, color: "var(--v2-muted)", marginTop: 4 }}>
                    La cotización vigente del proyecto será la fuente del monto cotizado.
                  </div>
                )}
              </V2FormField>

              <V2FormField label="Referencia externa">
                <V2Input
                  type="text"
                  value={form.referencias_cotizacion}
                  placeholder="Ej: código enviado por el cliente o referencia histórica"
                  onChange={(e) => setForm({ ...form, referencias_cotizacion: e.target.value })}
                />
              </V2FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <V2FormField label="Próxima acción">
                  <V2Input
                    type="date"
                    value={form.fecha_proxima_accion}
                    onChange={(e) => setForm({ ...form, fecha_proxima_accion: e.target.value })}
                  />
                </V2FormField>
                <V2FormField label="Periodo pipeline">
                  <V2Input
                    value={form.periodo_pipeline}
                    onChange={(e) => setForm({ ...form, periodo_pipeline: e.target.value })}
                    placeholder="YYYY-MM"
                  />
                </V2FormField>
                <V2FormField label="Responsable">
                  <V2Select
                    options={responsableOptions}
                    value={form.responsable_id || ""}
                    onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                  />
                </V2FormField>
              </div>

              {!form.cliente_id && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--v2-text)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.crear_cliente}
                    onChange={(e) => setForm({ ...form, crear_cliente: e.target.checked })}
                  />
                  Crear también en Clientes al guardar
                </label>
              )}

              <V2FormField label="Notas / seguimiento">
                <textarea
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--v2-border)",
                    borderRadius: "var(--v2-radius)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: "var(--v2-surface)",
                    width: "100%",
                    outline: "none",
                    minHeight: 70,
                    resize: "vertical",
                  }}
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2Modal>
        )}

        {/* Drawer de Detalle de Lead */}
        {selected && (
          <V2Drawer open={!!selected} onClose={() => setSelected(null)} title={selected.razon_social}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "var(--v2-muted)", marginTop: -8, marginBottom: 8 }}>
                {selected.cliente_id ? "Cliente vinculado" : "Sin cliente vinculado"}
              </div>

              <V2SectionCard title="Información Comercial">
                <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                  {selected.ruc && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>RUC: </span>
                      {selected.ruc}
                    </div>
                  )}
                  {selected.nombre_contacto && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Contacto: </span>
                      {selected.nombre_contacto}
                      {selected.cargo_contacto ? " · " + selected.cargo_contacto : ""}
                    </div>
                  )}
                  {selected.email_contacto && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Email: </span>
                      {selected.email_contacto}
                    </div>
                  )}
                  {selected.telefono_contacto && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Tel: </span>
                      {selected.telefono_contacto}
                    </div>
                  )}
                  {selected.direccion && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Dirección: </span>
                      {selected.direccion}
                    </div>
                  )}
                  {selected.origen && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Origen: </span>
                      {selected.origen}
                    </div>
                  )}
                  {selected.industria && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Industria: </span>
                      {selected.industria}
                    </div>
                  )}
                  {selected.periodo_pipeline && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Periodo: </span>
                      {selected.periodo_pipeline}
                    </div>
                  )}
                  {responsableNombre(selected.responsable_id) && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Responsable: </span>
                      {responsableNombre(selected.responsable_id)}
                    </div>
                  )}
                  {selected.fecha_proxima_accion && (
                    <div style={{ fontSize: 13, color: "var(--v2-warning)", fontWeight: 600 }}>
                      Próxima acción: {selected.fecha_proxima_accion}
                    </div>
                  )}
                  {selected.notas && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--v2-muted)" }}>Notas: </span>
                      {selected.notas}
                    </div>
                  )}
                </div>

                {puedeEditarCRM && (
                  <div style={{ marginBottom: 12, borderTop: "1px solid var(--v2-border-soft)", paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--v2-muted)", marginBottom: 8 }}>
                      CAMBIAR ESTADO
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ESTADOS_PIPELINE.map((k) => {
                        const v = ESTADOS[k]
                        return (
                          <button
                            key={k}
                            onClick={() => cambiarEstado(selected.id, k)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                              background: selected.estado === k ? v.color : "var(--v2-surface-soft)",
                              color: selected.estado === k ? "#fff" : v.color,
                              border: "1px solid " + v.color,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selected.presupuesto_estimado > 0 && (
                  <div
                    style={{
                      background: "rgba(3, 227, 115, 0.05)",
                      border: "1px solid rgba(3, 227, 115, 0.1)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--v2-muted)" }}>Presupuesto estimado</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--v2-success)" }}>
                      {fmt(selected.presupuesto_estimado)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--v2-muted)" }}>
                      Prob. cierre: {selected.probabilidad_cierre}%
                    </div>
                  </div>
                )}
              </V2SectionCard>

              {/* Proyecto Asociado */}
              <V2SectionCard title="Proyecto Asociado">
                {selected.proyecto_id ? (
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "var(--v2-muted)" }}>Código: </span>
                      {selected.proyecto?.codigo || "Sin código"}
                    </div>
                    <div>
                      <span style={{ color: "var(--v2-muted)" }}>Nombre: </span>
                      {selected.proyecto?.nombre || "Sin nombre"}
                    </div>
                    <div>
                      <span style={{ color: "var(--v2-muted)" }}>Estado: </span>
                      {selected.proyecto?.estado || "Sin estado"}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--v2-muted)" }}>Sin proyecto asociado.</div>
                )}
              </V2SectionCard>

              {/* Acciones principales de lead */}
              <V2SectionCard title="Acciones de Lead">
                <div style={{ display: "grid", gap: 8 }}>
                  {puedeEditarCRM && (
                    <V2Button variant="secondary" onClick={() => abrirEditar(selected)}>
                      Editar Lead
                    </V2Button>
                  )}
                  {puedeEditarCRM && !selected.cliente_id && (
                    <V2Button onClick={() => convertirACliente(selected, true)}>
                      Convertir a cliente
                    </V2Button>
                  )}
                  {selected.cliente_id && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <V2Button
                        variant="secondary"
                        onClick={() => router.push(`/clientes?id=${selected.cliente_id}`)}
                        style={{ flex: 1 }}
                      >
                        Ver Cliente
                      </V2Button>
                      <V2Button
                        variant="secondary"
                        onClick={() => router.push(`/proyectos/nuevo?cliente_id=${selected.cliente_id}`)}
                        style={{ flex: 1 }}
                      >
                        Crear Proyecto
                      </V2Button>
                    </div>
                  )}
                  {clientesConvertidos[selected.id] && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <V2Button
                        variant="secondary"
                        onClick={() => router.push(`/clientes?id=${clientesConvertidos[selected.id].id}`)}
                        style={{ flex: 1 }}
                      >
                        Ver Cliente
                      </V2Button>
                      <V2Button
                        variant="secondary"
                        onClick={() => router.push(`/proyectos/nuevo?cliente_id=${clientesConvertidos[selected.id].id}`)}
                        style={{ flex: 1 }}
                      >
                        Crear Proyecto
                      </V2Button>
                    </div>
                  )}
                  {puedeEditarCRM && (
                    <V2Button variant="secondary" onClick={() => archivarLead(selected)}>
                      Archivar Lead
                    </V2Button>
                  )}
                  {puedeAccionCRM("eliminar", selected) && (
                    <V2Button
                      variant="secondary"
                      style={{ color: "var(--v2-danger)", borderColor: "var(--v2-danger-bg)" }}
                      onClick={() => eliminarLead(selected)}
                    >
                      Eliminar Lead
                    </V2Button>
                  )}
                </div>
              </V2SectionCard>

              {/* Notas y Seguimiento */}
              <V2SectionCard title="Seguimiento (Notas)">
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <V2Input
                    compact
                    value={nuevaNota}
                    placeholder="Agregar nota..."
                    onChange={(e) => setNuevaNota(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && agregarNota()}
                    style={{ flex: 1 }}
                  />
                  <V2Button onClick={agregarNota}>+</V2Button>
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 8 }}>
                  {notas.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--v2-muted)", textAlign: "center", padding: 12 }}>
                      Sin notas aún
                    </div>
                  ) : (
                    notas.map((nota: any) => (
                      <div
                        key={nota.id}
                        style={{
                          background: "var(--v2-surface-soft)",
                          borderRadius: "var(--v2-radius)",
                          padding: "8px 12px",
                          border: "1px solid var(--v2-border-soft)",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "var(--v2-text)" }}>{nota.contenido}</div>
                        <div style={{ fontSize: 10, color: "var(--v2-muted)", marginTop: 4 }}>
                          {new Date(nota.created_at).toLocaleDateString("es-PE")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </V2SectionCard>
            </div>
          </V2Drawer>
        )}
      </div>
  )
}
