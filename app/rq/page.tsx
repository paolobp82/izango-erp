"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/immutability, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { enviarAlerta } from "@/lib/alertas"
import { rqCodigo } from "@/lib/rq-code"
import { rqIgvDetalle, rqTratamientoIgv, rqTratamientoIgvLabel } from "@/lib/rq-igv"
import { estadoRQTrasEdicion, mensajeEdicionRQPorEstado, puedeEditarRQPorEstado, requiereReaprobacionRQ } from "@/lib/permisos/rq"
import { filtrarPorAlcance, puedeEjecutarAccion, puedeVerModulo, type AccionPermiso } from "@/lib/permisos"
import { getRQEstadosVisuales } from "@/lib/core/configuration"
import { lifecycleEngine } from "@/lib/core/lifecycle"
import { businessRuleEngine } from "@/lib/core/business-rules"
import { estadoMigracionRQ, motivoEstadoMigracion } from "@/lib/rq-migracion"
import { SYSTEM_COLUMNS } from "@/lib/core/configuration"
import { buildCreateRQPPayload, buildUpdateRQPFinancialPayload, crearRQManualService } from "@/lib/services/rqp"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Badge,
  V2Button,
  V2DataTable,
  V2Dropdown,
  V2EmptyState,
  V2FormField,
  V2IconButton,
  V2Input,
  V2KpiCard,
  V2LoadingState,
  V2PageHeader,
  V2Pagination,
  V2Popover,
  V2Select,
  V2StatusDot,
  V2Tooltip,
  type V2DataTableColumn,
} from "@/components/v2/system"
import { V2ActiveFilterChip, V2FilterBar, V2FilterDrawer } from "@/components/v2/filters"
import { Clock, ShieldCheck, CalendarClock, Wallet, MoreVertical } from "lucide-react"
import { RQForm } from "./components/RQForm"
import {
  BANCOS_PAGO,
  MEDIOS_PAGO,
  ESTADOS_CANCELABLES_RQP,
  ROLES_CANCELAR_RQP,
} from "./config/constants"
import styles from "./RQ.module.css"

function estadoRQVariant(estado: string): "warning" | "information" | "primary" | "success" | "danger" | "neutral" {
  if (estado === "pendiente_aprobacion") return "warning"
  if (estado === "aprobado_produccion") return "information"
  if (estado === "aprobado" || estado === "programado") return "primary"
  if (estado === "pagado") return "success"
  if (estado === "rechazado") return "danger"
  return "neutral"
}

function estadoRQDotTone(estado: string): "warning" | "info" | "success" | "danger" | "neutral" {
  if (estado === "pendiente_aprobacion") return "warning"
  if (estado === "pagado") return "success"
  if (estado === "rechazado") return "danger"
  if (estado === "cancelado") return "neutral"
  return "info"
}

function estadoPagoVariant(key: string): "success" | "danger" | "warning" | "information" | "neutral" | "outlined" {
  if (key === "pagado") return "success"
  if (key === "vencido") return "danger"
  if (key === "vence_hoy") return "warning"
  if (key === "programado") return "information"
  if (key === "anulado") return "outlined"
  return "neutral"
}

const ESTADO_PAGO_LABELS: Record<string, string> = {
  sin_programar: "Sin programar",
  programado: "Programado",
  vence_hoy: "Vence hoy",
  vencido: "Vencido",
  pagado: "Pagado",
  anulado: "Anulado",
}

const CONDICION_LABELS: Record<string, string> = { contado: "Contado", credito: "Crédito", adelanto: "Adelanto" }


const ESTADOS: Record<string, any> = getRQEstadosVisuales()

const RQ_COLUMNS_CONFIG = SYSTEM_COLUMNS
  .filter((col: any) => col.module === "rq" && col.visible)
  .sort((a: any, b: any) => a.order - b.order)

const rqColumnLabel = (column: string, fallback: string) =>
  String(RQ_COLUMNS_CONFIG.find((col: any) => col.column === column)?.metadata?.label || fallback)

const FLUJO = [
  { estado: "pendiente_aprobacion", label: "Creado", siguiente: "aprobado_produccion", accion: "Aprobar (Produccion)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  { estado: "aprobado_produccion", label: "Aprobado Produccion", siguiente: "aprobado", accion: "Aprobar (GG)", roles: ["gerente_general", "superadmin"] },
  { estado: "aprobado", label: "Aprobado GG", siguiente: "programado", accion: "Programar pago", roles: ["controller", "superadmin"] },
  { estado: "programado", label: "Programado pago", siguiente: "pagado", accion: "Confirmar pago", roles: ["controller", "superadmin"] },
  { estado: "pagado", label: "Pagado", siguiente: null, accion: null, roles: [] },
]

const FORM_RQ_VACIO = {
  descripcion: "",
  proveedor_id: "",
  monto_solicitado: "",
  tratamiento_igv: "incluye_igv",
  proyecto_id: "",
  tipo_pago: "contado",
  condicion_comercial: "contado",
  medio_pago: "Transferencia",
  es_excepcion: false,
  motivo_excepcion: "",
  dias_credito: "",
  fecha_necesidad_pago: "",
  fecha_pago: "",
  voucher_url: "",
  nota_pago: "",
  numero_operacion: "",
  banco_pago: "",
  tipo_transferencia: "Transferencia",
}

export default function RQPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstados, setFiltroEstados] = useState<string[]>([])
  const [busquedaRQ, setBusquedaRQ] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [incluirProyectosEliminados, setIncluirProyectosEliminados] = useState(false)
  const [proveedores, setProveedores] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [migrationLogs, setMigrationLogs] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [toastMsg, setToastMsg] = useState("")
  const [toastType, setToastType] = useState<"success" | "error">("success")
  const [showNuevoRQ, setShowNuevoRQ] = useState(false)
const [proyectos, setProyectos] = useState<any[]>([])
const [formRQ, setFormRQ] = useState(FORM_RQ_VACIO)
const [proveedoresTodos, setProveedoresTodos] = useState<any[]>([])
  const [guardandoRQ, setGuardandoRQ] = useState(false)
  const [errorNuevoRQ, setErrorNuevoRQ] = useState("")
  const [showEditarRQ, setShowEditarRQ] = useState(false)
  const [formEditarRQ, setFormEditarRQ] = useState(FORM_RQ_VACIO)
  const [fechaPago, setFechaPago] = useState("")
  const [filtroTipoPago, setFiltroTipoPago] = useState("")
const [filtroExcepcion, setFiltroExcepcion] = useState("todos")
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("")
  const [filtroFechaNecesidadDesde, setFiltroFechaNecesidadDesde] = useState("")
  const [filtroFechaNecesidadHasta, setFiltroFechaNecesidadHasta] = useState("")
  const [filtroArchivado, setFiltroArchivado] = useState<"activos" | "archivados" | "todos">("activos")
  const [datosPago, setDatosPago] = useState({
    voucher_url: "", numero_operacion: "", banco_pago: "", tipo_transferencia: "Transferencia", nota_pago: ""
  })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [datosRendicion, setDatosRendicion] = useState({
    monto_rendido: "",
    monto_devolucion: "",
    fecha_rendicion: "",
    observacion_rendicion: ""
  })
  const [guardandoRendicion, setGuardandoRendicion] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tempTipoPago, setTempTipoPago] = useState("")
  const [tempEstadoPago, setTempEstadoPago] = useState("")
  const [tempFechaNecesidadDesde, setTempFechaNecesidadDesde] = useState("")
  const [tempFechaNecesidadHasta, setTempFechaNecesidadHasta] = useState("")
  const [tempExcepcion, setTempExcepcion] = useState("todos")
  const [tempIncluirProyectosEliminados, setTempIncluirProyectosEliminados] = useState(false)
  const [tempProyecto, setTempProyecto] = useState("")
  const POR_PAGINA = 50

  useEffect(() => { load() }, [])

  useEffect(() => {
    setPagina(1)
  }, [busquedaRQ, filtroEstados, filtroProveedor, filtroProyecto, filtroTipoPago, filtroExcepcion, filtroEstadoPago, filtroFechaNecesidadDesde, filtroFechaNecesidadHasta, incluirProyectosEliminados, filtroArchivado])

  async function load() {
    const params = new URLSearchParams(window.location.search)
    const proyectoIdParam = params.get("proyecto_id") || ""
    const rqIdParam = params.get("rq_id") || ""
    const viewParam = params.get("view") || ""
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPerfil(null)
      setRqs([])
      setLoading(false)
      return
    }
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)
    if (!puedeVerModulo(p, "rq")) {
      setRqs([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from("requerimientos_pago")
      .select("*, proyecto:proyectos(id, nombre, codigo, deleted_at, productor_id, productor:perfiles!productor_id(id, nombre, apellido)), proveedor:proveedores(nombre, banco, numero_cuenta, tipo_pago)")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error cargando RQ", error)
      mostrarToast("No se pudieron cargar los RQ", "error")
    }
    const loadedRqs = filtrarPorAlcance(data || [], p, "rq", { usuarioId: user.id })
    setRqs(loadedRqs)
    const rqIds = loadedRqs.map((rq: any) => rq.id).filter(Boolean)
    if (rqIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from("rq_version_migration_log")
        .select("rq_id,rq_diferencia_id,accion,metadata,created_at")
        .or(`rq_id.in.(${rqIds.join(",")}),rq_diferencia_id.in.(${rqIds.join(",")})`)
      if (logsError) {
        console.error("No se pudo cargar rq_version_migration_log:", logsError)
        setMigrationLogs([])
      } else {
        setMigrationLogs(logs || [])
      }
    } else {
      setMigrationLogs([])
    }
    const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre, estado, productor_id").is("deleted_at", null).order("codigo")
    setProyectos(filtrarPorAlcance(projs || [], p, "proyectos", { usuarioId: user.id }))
    const { data: provsTodos } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre")
    setProveedoresTodos(provsTodos || [])
    const provIds = [...new Set(loadedRqs.map((r: any) => r.proveedor_id).filter(Boolean))]
    if (provIds.length > 0) {
      const { data: provs } = await supabase.from("proveedores").select("id, nombre").in("id", provIds)
      setProveedores(provs || [])
    }
    if (proyectoIdParam) {
      setFiltroProyecto(proyectoIdParam)
      setFormRQ(prev => ({ ...prev, proyecto_id: proyectoIdParam }))
      setShowNuevoRQ(viewParam !== "list")
    }
    if (rqIdParam) {
      const rqSeleccionado = loadedRqs.find((r: any) => r.id === rqIdParam)
      if (rqSeleccionado) {
        setSelected(rqSeleccionado)
        setDatosPago({
          voucher_url: rqSeleccionado.voucher_url || "",
          numero_operacion: rqSeleccionado.numero_operacion || "",
          banco_pago: rqSeleccionado.banco_pago || "",
          tipo_transferencia: rqSeleccionado.tipo_transferencia || "Transferencia",
          nota_pago: rqSeleccionado.nota_pago || "",
        })
        setDatosRendicion({
          monto_rendido: rqSeleccionado.monto_rendido ? String(rqSeleccionado.monto_rendido) : "",
          monto_devolucion: rqSeleccionado.monto_devolucion ? String(rqSeleccionado.monto_devolucion) : "",
          fecha_rendicion: rqSeleccionado.fecha_rendicion || "",
          observacion_rendicion: rqSeleccionado.observacion_rendicion || "",
        })
      }
    }
    setLoading(false)
  }

  function mostrarToast(mensaje: string, tipo: "success" | "error" = "success") {
    setToastMsg(mensaje)
    setToastType(tipo)
    setTimeout(() => setToastMsg(""), 4000)
  }

  async function cambiarEstado(id: string, estado: string, extra?: any) {
    const rqActual = rqs.find(r => r.id === id)
    if (!rqActual) return
    const accionPermiso = accionPermisoPorEstado(estado)
    const regla = reglaPorEstado(estado)
    if (!validarAccionRQ(accionPermiso, rqActual)) return
    if (!lifecycleEngine.canTransition("rq", rqActual.estado, estado)) {
      alert(`Transición no permitida: ${ESTADOS[rqActual.estado]?.label || rqActual.estado} → ${ESTADOS[estado]?.label || estado}`)
      return
    }
    if (!validarReglaRQ(regla, rqActual, { desde: rqActual.estado, hacia: estado })) return
    if (rqPerteneceAProyectoEliminado(rqActual)) {
      alert("Este RQ pertenece a un proyecto eliminado y no puede procesarse.")
      return
    }

    if (estado === "pagado") {
      const rq = rqActual
      if (rq?.proyecto_id) {
        const otrosRqs = rqs.filter(r => r.proyecto_id === rq.proyecto_id && r.id !== id)
        const todosPagados = otrosRqs.every(r => r.estado === "pagado")
        if (todosPagados) {
          await supabase.from("proyectos").update({ estado: "en_curso" }).eq("id", rq.proyecto_id)
        }
      }
    }
    const updates: any = { estado, ...extra }
    if (["aprobado_produccion", "aprobado", "programado", "pagado"].includes(estado)) {
      updates.aprobado_por = perfil?.id
    }

    if (estado === "pagado") {
      updates.fecha_pago = extra?.fecha_pago || fechaPago || new Date().toISOString().split("T")[0]
      updates.voucher_url = datosPago.voucher_url || null
      updates.numero_operacion = datosPago.numero_operacion || null
      updates.banco_pago = datosPago.banco_pago || null
      updates.tipo_transferencia = datosPago.tipo_transferencia || null
      updates.nota_pago = datosPago.nota_pago || null
    }
    const { error } = await supabase.from("requerimientos_pago").update(updates).eq("id", id)
    if (error) {
      console.error("RQ status update error:", error)
      mostrarToast("No se pudo aprobar el RQ", "error")
      alert("No se pudo actualizar el estado del RQ: " + error.message)
      return
    }
    await registrarAccion({
      accion: "cambiar_estado",
      modulo: "rq",
      entidad_id: id,
      entidad_tipo: "rq",
      descripcion: "RQ cambiado a: " + estado,
      datos_nuevos: {
        estado,
        aprobado_por: perfil?.id || null,
        aprobado_por_nombre: `${perfil?.nombre || ""} ${perfil?.apellido || ""}`.trim(),
        fecha_aprobacion: new Date().toISOString()
      }
    })
    if (["aprobado_produccion", "aprobado", "programado", "pagado"].includes(estado)) {
      const codigoRQ = rqActual?.codigo_rq || rqActual?.numero_rq
      mostrarToast(codigoRQ ? `${codigoRQ} aprobado correctamente` : "RQ Aprobado", "success")
    }
    load()
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, estado, ...updates }))
  }

  async function cancelarRQ(rq: any) {
    if (!puedeCancelarRQ(rq)) {
      alert("No tienes permisos para cancelar este RQ o el estado no permite cancelación.")
      return
    }
    if (!lifecycleEngine.canTransition("rq", rq.estado, "cancelado")) {
      alert("Transición no permitida para cancelar este RQ.")
      return
    }
    if (!validarReglaRQ("cancelar", rq, { desde: rq.estado, hacia: "cancelado" })) return

    const codigo = rqCodigo(rq)
    if (!confirm(`¿Cancelar ${codigo}?`)) return

    const updates = {
      estado: "cancelado",
      cancelado_por: perfil?.id || null,
      cancelado_at: new Date().toISOString(),
      motivo_cancelacion: "Cancelado desde módulo RQ",
    }

    const { data: cancelado, error } = await supabase
      .from("requerimientos_pago")
      .update(updates)
      .eq("id", rq.id)
      .in("estado", ESTADOS_CANCELABLES_RQP)
      .select("id, estado")
      .maybeSingle()

    if (error || !cancelado) {
      console.error("Error cancelando RQ", error)
      alert(
        "No se pudo cancelar el RQ." +
        "\nMensaje: " + (error?.message || "No se actualizó ningún registro. Puede ser RLS, estado cambiado o ID no encontrado.") +
        "\nCódigo: " + (error?.code || "—") +
        "\nDetalle: " + (error?.details || "—") +
        "\nHint: " + (error?.hint || "—")
      )
      return
    }

    try {
      await registrarAccion({
        accion: "cancelar",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: codigo + " cancelado",
        datos_nuevos: updates
      })
    } catch (traceError) {
      console.warn("No se pudo registrar trazabilidad de cancelación RQ", traceError)
    }

    setRqs(prev => prev.map((item: any) => item.id === rq.id ? { ...item, ...updates } : item))
    setSelected((prev: any) => prev?.id === rq.id ? { ...prev, ...updates } : prev)
    mostrarToast(codigo + " cancelado correctamente", "success")
    await load()
  }

  async function eliminarRQ(rq: any) {
    if (!rq?.id) {
      alert("No hay RQ seleccionado para eliminar.")
      return
    }
    if (!validarAccionRQ("eliminar", rq)) return
    if (!validarReglaRQ("eliminar", rq)) return

    const codigo = rqCodigo(rq)

    if (rq.estado !== "pendiente_aprobacion") {
      alert("Solo se puede eliminar operativamente un RQ pendiente. Si ya ingresó al flujo, use Cancelar RQ.")
      return
    }

    if (!confirm(`¿Eliminar ${codigo} de la vista operativa? Quedará registrado como cancelado para auditoría.`)) return

    const updates = {
      estado: "cancelado",
      cancelado_por: perfil?.id || null,
      cancelado_at: new Date().toISOString(),
      motivo_cancelacion: "Eliminado operativamente desde módulo RQ",
    }

    const { data: eliminadoOperativo, error } = await supabase
      .from("requerimientos_pago")
      .update(updates)
      .eq("id", rq.id)
      .eq("estado", "pendiente_aprobacion")
      .select("id, estado")
      .maybeSingle()

    if (error || !eliminadoOperativo) {
      console.error("Error eliminando operativamente RQ", error)
      alert(
        "No se pudo eliminar operativamente el RQ." +
        "\nMensaje: " + (error?.message || "No se actualizó ningún registro. Puede ser RLS, estado cambiado o ID no encontrado.") +
        "\nCódigo: " + (error?.code || "—") +
        "\nDetalle: " + (error?.details || "—") +
        "\nHint: " + (error?.hint || "—")
      )
      return
    }

    try {
      await registrarAccion({
        accion: "eliminar_operativo",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: "RQ eliminado operativamente: " + codigo,
        datos_nuevos: updates
      })
    } catch (traceError) {
      console.warn("No se pudo registrar trazabilidad de eliminación operativa RQ", traceError)
    }

    setRqs(prev => prev.filter((item: any) => item.id !== rq.id))
    setSelected(null)
    mostrarToast(codigo + " eliminado de la vista operativa", "success")
    await load()
  }
  async function guardarDatosPago() {
    if (!selected) return
    if (rqPerteneceAProyectoEliminado(selected)) {
      alert("Este RQ pertenece a un proyecto eliminado y no puede procesarse.")
      return
    }
    if (!puedeEditarPago || !validarAccionRQ("pagar", selected)) {
      alert("Solo Controller o Superadmin pueden editar los datos de pago.")
      return
    }
    if (!validarReglaRQ("pagar", selected, { edicionDatosPago: true })) return
    const updates = {
      voucher_url: datosPago.voucher_url || null,
      numero_operacion: datosPago.numero_operacion || null,
      banco_pago: datosPago.banco_pago || null,
      tipo_transferencia: datosPago.tipo_transferencia || null,
      nota_pago: datosPago.nota_pago || null,
    }
    setGuardandoPago(true)
    const { error } = await supabase.from("requerimientos_pago").update(updates).eq("id", selected.id)
    if (error) {
      alert("No se pudieron guardar los datos de pago. Intenta nuevamente.")
      setGuardandoPago(false)
      return
    }
    await registrarAccion({ accion: "editar_datos_pago", modulo: "rq", entidad_id: selected.id, entidad_tipo: "rq", descripcion: "Datos de pago editados: " + rqCodigo(selected), datos_nuevos: updates })
    setSelected((prev: any) => prev ? { ...prev, ...updates } : prev)
    setGuardandoPago(false)
    load()
  }

  async function guardarRendicionRQ() {
    if (!selected) return
    if (!validarAccionRQ("rendir", selected)) {
      alert("Solo Controller o Superadmin pueden registrar rendiciones.")
      return
    }
    if (!validarReglaRQ("rendir", selected)) return
    if (selected.estado !== "pagado") {
      alert("Solo se puede registrar rendición en RQs pagados.")
      return
    }

    const montoRendido = Number(datosRendicion.monto_rendido) || 0
    const montoSolicitado = Number(selected.monto_solicitado) || 0
    const montoDevolucion = datosRendicion.monto_devolucion !== ""
      ? Number(datosRendicion.monto_devolucion) || 0
      : Math.max(0, montoSolicitado - montoRendido)

    if (montoRendido < 0 || montoDevolucion < 0) {
      alert("Los montos de rendición no pueden ser negativos.")
      return
    }

    const updates = {
      monto_rendido: montoRendido,
      monto_devolucion: montoDevolucion,
      fecha_rendicion: datosRendicion.fecha_rendicion || new Date().toISOString().split("T")[0],
      observacion_rendicion: datosRendicion.observacion_rendicion || null,
    }

    setGuardandoRendicion(true)
    const { error } = await supabase.from("requerimientos_pago").update(updates).eq("id", selected.id)
    if (error) {
      alert("No se pudo guardar la rendición: " + error.message)
      setGuardandoRendicion(false)
      return
    }

    await registrarAccion({
      accion: "registrar_rendicion",
      modulo: "rq",
      entidad_id: selected.id,
      entidad_tipo: "rq",
      descripcion: "Rendición registrada: " + rqCodigo(selected),
      datos_nuevos: updates,
    })

    setDatosRendicion({
      monto_rendido: String(updates.monto_rendido || ""),
      monto_devolucion: String(updates.monto_devolucion || ""),
      fecha_rendicion: updates.fecha_rendicion || "",
      observacion_rendicion: updates.observacion_rendicion || "",
    })
    setSelected((prev: any) => prev ? { ...prev, ...updates } : prev)
    setGuardandoRendicion(false)
    load()
  }
  function rolNormalizado() {
    return String(perfil?.perfil || "").trim().toLowerCase()
  }

  function puedeAccionRQ(accion: AccionPermiso, rq?: any) {
    return puedeEjecutarAccion(perfil, "rq", accion, { usuarioId: perfil?.id, registro: rq || null })
  }

  function validarAccionRQ(accion: AccionPermiso, rq?: any) {
    if (puedeAccionRQ(accion, rq)) return true
    alert("No tienes permiso para realizar esta acción.")
    return false
  }

  function validarReglaRQ(regla: string, rq?: any, metadata?: Record<string, unknown>) {
    const result = businessRuleEngine.evaluate("rq", regla, {
      action: regla,
      record: rq || null,
      metadata,
      user: perfil,
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

  function accionPermisoPorEstado(estado: string): AccionPermiso {
    if (estado === "rechazado") return "rechazar"
    if (estado === "cancelado") return "cancelar"
    if (["programado", "pagado"].includes(estado)) return "pagar"
    return "aprobar"
  }

  function reglaPorEstado(estado: string) {
    if (estado === "rechazado") return "rechazar"
    if (estado === "cancelado") return "cancelar"
    if (["programado", "pagado"].includes(estado)) return "pagar"
    return "aprobar"
  }

  function rqPerteneceAProyectoEliminado(rq: any) {
    return Boolean(rq?.proyecto_id && (!rq.proyecto || rq.proyecto?.deleted_at))
  }

  function puedeEditarRQ(rq: any) {
    if (!rq || rqPerteneceAProyectoEliminado(rq)) return false
    return puedeAccionRQ("editar", rq) && puedeEditarRQPorEstado(perfil, rq)
  }

  function mensajeEdicionRQ(rq: any) {
    if (rqPerteneceAProyectoEliminado(rq)) return "Este RQ pertenece a un proyecto eliminado y no puede editarse."
    return mensajeEdicionRQPorEstado(perfil, rq)
  }
  function proyectoBloqueadoEdicion(rq: any) {
    return Boolean(rq?.proyecto_id && rq.estado !== "pendiente_aprobacion")
  }

  function abrirEditarRQ(rq: any) {
    if (!puedeEditarRQ(rq)) return
    setFormEditarRQ({
      descripcion: rq.descripcion || "",
      proveedor_id: rq.proveedor_id || "",
      monto_solicitado: rq.monto_solicitado ? String(rq.monto_solicitado) : "",
      tratamiento_igv: rqTratamientoIgv(rq),
      proyecto_id: rq.proyecto_id || "",
      tipo_pago: rq.tipo_pago || rq.condicion_comercial || "contado",
      condicion_comercial: rq.condicion_comercial || rq.tipo_pago || "contado",
      medio_pago: rq.medio_pago || rq.tipo_transferencia || "Transferencia",
      es_excepcion: Boolean(rq.es_excepcion),
      motivo_excepcion: rq.motivo_excepcion || "",
      dias_credito: rq.dias_credito ? String(rq.dias_credito) : "",
      fecha_necesidad_pago: rq.fecha_necesidad_pago || "",
      fecha_pago: rq.fecha_pago || "",
      voucher_url: rq.voucher_url || "",
      nota_pago: rq.nota_pago || "",
      numero_operacion: rq.numero_operacion || "",
      banco_pago: rq.banco_pago || "",
      tipo_transferencia: rq.tipo_transferencia || "Transferencia",
    })
    setShowEditarRQ(true)
  }

  async function guardarEdicionRQ() {
    if (!selected || !puedeEditarRQ(selected)) return
    if (!validarReglaRQ("editar", selected)) return
    if (!formEditarRQ.descripcion || !formEditarRQ.monto_solicitado) {
      alert("Descripcion y monto son obligatorios")
      return
    }
    if (formEditarRQ.es_excepcion && !String(formEditarRQ.motivo_excepcion || "").trim()) {
      alert("El motivo de la excepción es obligatorio.")
      return
    }
    const prov = proveedoresTodos.find((p: any) => p.id === formEditarRQ.proveedor_id)
    const condicionEdicion = formEditarRQ.condicion_comercial || formEditarRQ.tipo_pago || "contado"
    const updates: any = buildUpdateRQPFinancialPayload({
      descripcion: formEditarRQ.descripcion,
      proveedor_id: formEditarRQ.proveedor_id || null,
      proveedor_nombre: prov?.nombre || "",
      monto_solicitado: Number(formEditarRQ.monto_solicitado),
      tratamiento_igv: formEditarRQ.tratamiento_igv,
      tipo_pago: condicionEdicion,
      condicion_comercial: condicionEdicion,
      medio_pago: formEditarRQ.medio_pago,
      dias_credito: condicionEdicion === "credito" && formEditarRQ.dias_credito ? Number(formEditarRQ.dias_credito) : null,
      fecha_necesidad_pago: formEditarRQ.fecha_necesidad_pago || null,
      fecha_pago: formEditarRQ.fecha_pago || null,
      voucher_url: formEditarRQ.voucher_url || null,
      nota_pago: formEditarRQ.nota_pago || null,
      numero_operacion: formEditarRQ.numero_operacion || null,
      banco_pago: formEditarRQ.banco_pago || null,
      tipo_transferencia: formEditarRQ.tipo_transferencia || null,
      es_excepcion: formEditarRQ.es_excepcion,
      motivo_excepcion: formEditarRQ.es_excepcion ? String(formEditarRQ.motivo_excepcion || "").trim() : null,
      excepcion_solicitada_por: formEditarRQ.es_excepcion
        ? selected.excepcion_solicitada_por || perfil?.id || null
        : null,
      excepcion_solicitada_at: formEditarRQ.es_excepcion
        ? selected.excepcion_solicitada_at || new Date().toISOString()
        : null,
      excepcion_autorizada_por: selected.excepcion_autorizada_por || null,
      excepcion_autorizada_at: selected.excepcion_autorizada_at || null,
    })
    if (!proyectoBloqueadoEdicion(selected)) {
      updates.proyecto_id = formEditarRQ.proyecto_id || null
    }
    const debeReaprobar = requiereReaprobacionRQ(selected, perfil)
    const estadoAnterior = String(selected.estado || "")
    const estadoNuevo = estadoRQTrasEdicion(selected, perfil)
    if (debeReaprobar) {
      updates.estado = estadoNuevo
    }

    const datosAnteriores = {
      descripcion: selected.descripcion || null,
      proveedor_id: selected.proveedor_id || null,
      proveedor_nombre: selected.proveedor_nombre || "",
      monto_solicitado: selected.monto_solicitado ?? null,
      tratamiento_igv: rqTratamientoIgv(selected),
      tipo_pago: selected.tipo_pago || null,
      dias_credito: selected.dias_credito ?? null,
      fecha_pago: selected.fecha_pago || null,
      voucher_url: selected.voucher_url || null,
      nota_pago: selected.nota_pago || null,
      numero_operacion: selected.numero_operacion || null,
      banco_pago: selected.banco_pago || null,
      tipo_transferencia: selected.tipo_transferencia || null,
      proyecto_id: selected.proyecto_id || null,
      estado: selected.estado || null,
    }

    const { data: updated, error } = await supabase
      .from("requerimientos_pago")
      .update(updates)
      .eq("id", selected.id)
      .select("id, estado, descripcion, proveedor_id, proveedor_nombre, proveedor_banco, proveedor_cuenta, proveedor_tipo_pago, monto_solicitado, tratamiento_igv, tipo_pago, condicion_comercial, medio_pago, dias_credito, fecha_necesidad_pago, fecha_pago, voucher_url, nota_pago, numero_operacion, banco_pago, tipo_transferencia, proyecto_id")
      .maybeSingle()

    if (error || !updated) {
      if (error) console.error("RQ update error:", error)
      alert(`No se pudo editar el RQ. ${error?.message || "Revisa los datos e intenta nuevamente."}`)
      return
    }

    await registrarAccion({
      accion: debeReaprobar ? "editar_rq_requiere_reaprobacion" : "editar",
      modulo: "rq",
      entidad_id: selected.id,
      entidad_tipo: "rq",
      descripcion: debeReaprobar
        ? `RQ editado y enviado a reaprobacion: ${rqCodigo(selected)} (${estadoAnterior} -> ${estadoNuevo})`
        : "RQ editado: " + rqCodigo(selected),
      datos_anteriores: datosAnteriores,
      datos_nuevos: updates,
    })
    setSelected((prev: any) => prev ? { ...prev, ...updates, ...updated, proveedor: prov ? { ...(prev.proveedor || {}), nombre: prov.nombre, banco: prov.banco, numero_cuenta: prov.numero_cuenta, tipo_pago: prov.tipo_pago } : prev.proveedor } : prev)
    setShowEditarRQ(false)
    load()
  }

  // El mapeo de mensajes de error de crearRQManual (antes aqui) se movio a
  // lib/services/rqp/rqp.crear-manual.ts junto con el resto de esa funcion.

  async function crearRQManual() {
    setErrorNuevoRQ("")
    setGuardandoRQ(true)
    const resultado = await crearRQManualService({ supabase, formRQ, proyectos, proveedoresTodos, perfil })
    if (!resultado.ok) {
      setErrorNuevoRQ(resultado.error)
      setGuardandoRQ(false)
      return
    }
    console.info("RQ manual creado", {
      proyecto_id: formRQ.proyecto_id,
      proveedor_id: formRQ.proveedor_id,
      rq_id: resultado.creado?.id,
      codigo_rq: resultado.creado?.codigo_rq || resultado.creado?.numero_rq,
    })
    setShowNuevoRQ(false)
    setFormRQ(FORM_RQ_VACIO)
    await load()
    setGuardandoRQ(false)
  }

  function getSiguienteAccion(rq: any) {
    if (rqPerteneceAProyectoEliminado(rq)) return null
    const paso = FLUJO.find(f => f.estado === rq.estado)
    if (!paso || !paso.siguiente) return null
    if (puedeAccionRQ(accionPermisoPorEstado(paso.siguiente), rq)) return { label: paso.accion, nextEstado: paso.siguiente, color: "#0F6E56" }
    return null
  }

  function puedeRechazar(rq: any) {
    if (rqPerteneceAProyectoEliminado(rq)) return false
    if (["pagado", "cerrado", "cancelado", "rechazado"].includes(rq.estado)) return false
    return puedeAccionRQ("rechazar", rq)
  }

  function puedeCancelarRQ(rq: any) {
    if (!rq || rqPerteneceAProyectoEliminado(rq)) return false
    if (["pagado", "cerrado", "cancelado"].includes(rq.estado)) return false
    return puedeAccionRQ("cancelar", rq)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const detalleIgv = (rq: any) => rqIgvDetalle(rq)
  const montoPresupuestadoRQ = (rq: any) => Number(rq?.monto_presupuestado || 0)
  const montoFinalRQ = (rq: any) => Number(detalleIgv(rq).total || rq?.monto_solicitado || 0)
  const fechaYmd = (value: any) => value ? String(value).slice(0, 10) : ""
  const fmtFecha = (value: any) => value ? new Date(String(value)).toLocaleDateString("es-PE") : "—"
  const fechaVencimientoRQ = (rq: any) => {
    const condicion = condicionComercialRQ(rq)
    if (condicion === "credito" && rq?.dias_credito && rq?.created_at) {
      return new Date(new Date(rq.created_at).getTime() + Number(rq.dias_credito || 0) * 86400000).toISOString().slice(0, 10)
    }
    if (condicion === "contado" && rq?.created_at) return fechaYmd(rq.created_at)
    return ""
  }
  const condicionComercialRQ = (rq: any) => String(rq?.condicion_comercial || rq?.tipo_pago || "contado")
  const condicionLabelRQ = (rq: any) => {
    const condicion = condicionComercialRQ(rq)
    const label: Record<string, string> = { contado: "Contado", credito: "Crédito", adelanto: "Adelanto" }
    return label[condicion] || condicion || "—"
  }
  const fechaNecesidadRQ = (rq: any) => fechaYmd(rq?.fecha_necesidad_pago) || fechaVencimientoRQ(rq)
  const fechaProgramadaRQ = (rq: any) => fechaYmd(rq?.fecha_programada_pago)
  const fechaPagoRealRQ = (rq: any) => rq?.estado === "pagado" ? fechaYmd(rq?.fecha_pago) : ""
  // No existe (aun) selector de mes/periodo operativo en /rq (sin parametro de URL, sin estado de UI para elegirlo).
  // Fallback documentado: mes calendario actual, calculado en hora local para no desplazar el mes por UTC.
  const hoyLocal = new Date()
  const mesOperativoActual = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, "0")}`
  const rqEstaArchivado = (rq: any) => {
    if (rq?.estado !== "pagado") return false
    const mesPago = fechaPagoRealRQ(rq).slice(0, 7)
    if (!mesPago) return false
    return mesPago < mesOperativoActual
  }
  const estadoPagoRQ = (rq: any) => {
    const estado = String(rq?.estado || "")
    if (["cancelado", "rechazado"].includes(estado)) return { key: "anulado", label: "Anulado", bg: "#f3f4f6", color: "#6b7280", icon: "●" }
    if (estado === "pagado" || fechaPagoRealRQ(rq)) return { key: "pagado", label: "Pagado", bg: "#dcfce7", color: "#166534", icon: "●" }
    const base = fechaProgramadaRQ(rq) || fechaNecesidadRQ(rq)
    if (!base) return { key: "sin_programar", label: "Sin programar", bg: "#dbeafe", color: "#1e40af", icon: "●" }
    const hoy = new Date().toISOString().slice(0, 10)
    if (base < hoy) return { key: "vencido", label: "Vencido", bg: "#fee2e2", color: "#991b1b", icon: "●" }
    if (base === hoy) return { key: "vence_hoy", label: "Vence hoy", bg: "#ffedd5", color: "#c2410c", icon: "●" }
    return { key: "programado", label: "Programado", bg: "#fef9c3", color: "#92400e", icon: "●" }
  }
  const variacionRQ = (rq: any) => montoFinalRQ(rq) - montoPresupuestadoRQ(rq)
  const origenRQLabel = (rq: any) => rq?.es_adicional ? "RQ Adicional" : rq?.cotizacion_item_id ? "RQ de Proyecto" : "RQ de Proyecto legacy"
  const origenRQDetalle = (rq: any) => rq?.es_adicional
    ? "Fuera del presupuesto aprobado."
    : rq?.cotizacion_item_id
      ? "Vinculado a un ítem de la cotización aprobada."
      : "RQ de proyecto sin vínculo histórico a ítem de cotización."

  const rqsVistaActiva = incluirProyectosEliminados ? rqs : rqs.filter(r => r.estado !== "cancelado" && !rqPerteneceAProyectoEliminado(r))
  const rqsProyectosEliminados = rqs.filter(r => rqPerteneceAProyectoEliminado(r))
  // Activos / Archivados / Todos: misma regla de archivado (pagado + mes de fecha_pago anterior al mes operativo).
  const rqsSegunArchivado = filtroArchivado === "todos"
    ? rqsVistaActiva
    : filtroArchivado === "archivados"
      ? rqsVistaActiva.filter(rqEstaArchivado)
      : rqsVistaActiva.filter(r => !rqEstaArchivado(r))
  // La tabla y los KPIs comparten esta misma base (Activos/Archivados/Todos); los demas filtros
  // (busqueda, estado, proveedor, proyecto, tipo, fechas, excepcion) solo se aplican a la tabla,
  // igual que antes de este sprint.
  const rqsBaseKpi = rqsSegunArchivado
  const filtradosBase = rqsSegunArchivado.filter(r => {
    const textoBusqueda = busquedaRQ.trim().toLowerCase()

    if (textoBusqueda) {
      const searchable = [
        rqCodigo(r),
        r.codigo_rq,
        r.numero_rq,
        r.descripcion,
        r.proveedor_nombre,
        r.proveedor?.nombre,
        r.proyecto?.codigo,
        r.proyecto?.nombre,
        String(r.monto_solicitado || ""),
        r.estado
      ].filter(Boolean).join(" ").toLowerCase()

      const searchableNumerico = searchable.replace(/\D/g, "")
      const textoNumerico = textoBusqueda.replace(/\D/g, "")

      if (!searchable.includes(textoBusqueda) && (!textoNumerico || !searchableNumerico.includes(textoNumerico))) return false
    }

    if (filtroEstados.length > 0 && !filtroEstados.includes(r.estado)) return false
    if (filtroProveedor && r.proveedor_id !== filtroProveedor) return false
    if (filtroProyecto) {
      const proyectoFiltro = proyectos.find((p: any) => p.id === filtroProyecto)
      const coincideId = r.proyecto_id === filtroProyecto
      const coincideCodigo = Boolean(proyectoFiltro?.codigo && r.proyecto?.codigo === proyectoFiltro.codigo)
      if (!coincideId && !coincideCodigo) return false
    }
    if (filtroTipoPago && condicionComercialRQ(r) !== filtroTipoPago) return false
    if (filtroEstadoPago && estadoPagoRQ(r).key !== filtroEstadoPago) return false
    const fechaNecesidad = fechaNecesidadRQ(r)
    if (filtroFechaNecesidadDesde && (!fechaNecesidad || fechaNecesidad < filtroFechaNecesidadDesde)) return false
    if (filtroFechaNecesidadHasta && (!fechaNecesidad || fechaNecesidad > filtroFechaNecesidadHasta)) return false
    if (filtroExcepcion === "solo" && !r.es_excepcion) return false
    if (filtroExcepcion === "sin" && r.es_excepcion) return false
    return true
  })
  const filtrados = filtradosBase
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicioPagina = filtrados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1
  const finPagina = Math.min(paginaActual * POR_PAGINA, filtrados.length)
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const totalPendiente = rqsBaseKpi.filter(r => r.estado === "pendiente_aprobacion").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalAprobado = rqsBaseKpi.filter(r => ["aprobado_produccion", "aprobado"].includes(r.estado)).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalProgramado = rqsBaseKpi.filter(r => r.estado === "programado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalPagado = rqsBaseKpi.filter(r => r.estado === "pagado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3, display: "block" }

  function limpiarFiltros() {
    setFiltroEstados([])
    setFiltroProveedor("")
    setFiltroTipoPago("")
    setFiltroEstadoPago("")
    setFiltroFechaNecesidadDesde("")
    setFiltroFechaNecesidadHasta("")
    setFiltroExcepcion("todos")
    setFiltroProyecto("")
    setIncluirProyectosEliminados(false)
    setFiltroArchivado("activos")
  }

  function limpiarTodoToolbar() {
    limpiarFiltros()
    setBusquedaRQ("")
  }

  function abrirFiltrosAvanzados() {
    setTempTipoPago(filtroTipoPago)
    setTempEstadoPago(filtroEstadoPago)
    setTempFechaNecesidadDesde(filtroFechaNecesidadDesde)
    setTempFechaNecesidadHasta(filtroFechaNecesidadHasta)
    setTempExcepcion(filtroExcepcion)
    setTempIncluirProyectosEliminados(incluirProyectosEliminados)
    setTempProyecto(filtroProyecto)
    setDrawerOpen(true)
  }

  function aplicarFiltrosAvanzados() {
    setFiltroTipoPago(tempTipoPago)
    setFiltroEstadoPago(tempEstadoPago)
    setFiltroFechaNecesidadDesde(tempFechaNecesidadDesde)
    setFiltroFechaNecesidadHasta(tempFechaNecesidadHasta)
    setFiltroExcepcion(tempExcepcion)
    setIncluirProyectosEliminados(tempIncluirProyectosEliminados)
    setFiltroProyecto(tempProyecto)
    setDrawerOpen(false)
  }

  function limpiarFiltrosAvanzados() {
    limpiarFiltros()
    setTempTipoPago("")
    setTempEstadoPago("")
    setTempFechaNecesidadDesde("")
    setTempFechaNecesidadHasta("")
    setTempExcepcion("todos")
    setTempIncluirProyectosEliminados(false)
    setTempProyecto("")
    setDrawerOpen(false)
  }

  const activeFiltersCount =
    (filtroEstados.length > 0 ? 1 : 0) +
    (filtroProveedor ? 1 : 0) +
    (filtroTipoPago ? 1 : 0) +
    (filtroEstadoPago ? 1 : 0) +
    (filtroFechaNecesidadDesde ? 1 : 0) +
    (filtroFechaNecesidadHasta ? 1 : 0) +
    (filtroExcepcion !== "todos" ? 1 : 0) +
    (filtroProyecto ? 1 : 0) +
    (incluirProyectosEliminados ? 1 : 0) +
    (filtroArchivado !== "activos" ? 1 : 0) +
    (busquedaRQ.trim() ? 1 : 0)

  const advancedFiltersCount =
    (filtroTipoPago ? 1 : 0) +
    (filtroEstadoPago ? 1 : 0) +
    (filtroFechaNecesidadDesde ? 1 : 0) +
    (filtroFechaNecesidadHasta ? 1 : 0) +
    (filtroExcepcion !== "todos" ? 1 : 0) +
    (incluirProyectosEliminados ? 1 : 0) +
    (filtroProyecto ? 1 : 0)

  const proyectoFiltradoActual = proyectos.find((p: any) => p.id === filtroProyecto)

  const filtrosActivosChips: Array<{ id: string; label: string; valueLabel: string }> = []
  if (filtroEstados.length > 0) filtrosActivosChips.push({ id: "estados", label: "Estado RQ", valueLabel: filtroEstados.map(k => ESTADOS[k]?.label || k).join(", ") })
  if (filtroProveedor) filtrosActivosChips.push({ id: "proveedor", label: "Proveedor", valueLabel: proveedores.find(p => p.id === filtroProveedor)?.nombre || filtroProveedor })
  if (filtroTipoPago) filtrosActivosChips.push({ id: "condicion", label: "Condición", valueLabel: CONDICION_LABELS[filtroTipoPago] || filtroTipoPago })
  if (filtroEstadoPago) filtrosActivosChips.push({ id: "estadoPago", label: "Estado pago", valueLabel: ESTADO_PAGO_LABELS[filtroEstadoPago] || filtroEstadoPago })
  if (filtroFechaNecesidadDesde || filtroFechaNecesidadHasta) filtrosActivosChips.push({ id: "fechas", label: "F. necesidad", valueLabel: `${filtroFechaNecesidadDesde || "…"} → ${filtroFechaNecesidadHasta || "…"}` })
  if (filtroExcepcion !== "todos") filtrosActivosChips.push({ id: "excepcion", label: "Excepción", valueLabel: filtroExcepcion === "solo" ? "Solo excepciones" : "Sin excepción" })
  if (filtroProyecto) filtrosActivosChips.push({ id: "proyecto", label: "Proyecto", valueLabel: proyectoFiltradoActual?.codigo || "Filtrado" })
  if (incluirProyectosEliminados) filtrosActivosChips.push({ id: "eliminados", label: "Proyectos eliminados", valueLabel: "Incluidos" })
  if (filtroArchivado !== "activos") filtrosActivosChips.push({ id: "archivado", label: "Vista", valueLabel: filtroArchivado === "archivados" ? "Solo archivados" : "Todos (activos + archivados)" })

  function quitarFiltro(id: string) {
    if (id === "estados") setFiltroEstados([])
    if (id === "proveedor") setFiltroProveedor("")
    if (id === "condicion") setFiltroTipoPago("")
    if (id === "estadoPago") setFiltroEstadoPago("")
    if (id === "fechas") { setFiltroFechaNecesidadDesde(""); setFiltroFechaNecesidadHasta("") }
    if (id === "excepcion") setFiltroExcepcion("todos")
    if (id === "proyecto") setFiltroProyecto("")
    if (id === "eliminados") setIncluirProyectosEliminados(false)
    if (id === "archivado") setFiltroArchivado("activos")
  }

  function handleRowClick(rq: any) {
    if (selected?.id === rq.id) { setSelected(null); return }
    setSelected(rq)
    setDatosPago({
      voucher_url: rq.voucher_url || "",
      numero_operacion: rq.numero_operacion || "",
      banco_pago: rq.banco_pago || "",
      tipo_transferencia: rq.tipo_transferencia || "Transferencia",
      nota_pago: rq.nota_pago || "",
    })
    setDatosRendicion({
      monto_rendido: rq.monto_rendido ? String(rq.monto_rendido) : "",
      monto_devolucion: rq.monto_devolucion ? String(rq.monto_devolucion) : "",
      fecha_rendicion: rq.fecha_rendicion || "",
      observacion_rendicion: rq.observacion_rendicion || "",
    })
  }

  const columns: V2DataTableColumn<any>[] = [
    {
      id: "codigo",
      header: "N° RQ",
      minWidth: "110px",
      cell: (rq) => (
        <div style={{ fontWeight: 800, color: "var(--v2-text)" }}>{rqCodigo(rq)}</div>
      ),
    },
    {
      id: "proyecto",
      header: "PROYECTO",
      minWidth: "150px",
      cell: (rq) => {
        const proyectoEliminado = rqPerteneceAProyectoEliminado(rq)
        if (proyectoEliminado) {
          return (
            <div>
              <div style={{ fontWeight: 800, color: "var(--v2-danger)" }}>{rq.proyecto?.codigo || "Proyecto eliminado"}</div>
              <div style={{ fontSize: 11, color: "var(--v2-danger)" }}>{rq.proyecto?.nombre || "No disponible"} · Proyecto eliminado</div>
            </div>
          )
        }
        if (rq.proyecto_id) {
          return (
            <a href={`/proyectos/${rq.proyecto_id}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none", display: "inline-block" }}>
              <div style={{ fontWeight: 700, color: "var(--v2-accent)" }}>{rq.proyecto?.codigo}</div>
              <div style={{ fontSize: 11, color: "var(--v2-muted)" }}>{rq.proyecto?.nombre}</div>
            </a>
          )
        }
        return (
          <div>
            <div style={{ color: "var(--v2-text)" }}>—</div>
            <div style={{ fontSize: 11, color: "var(--v2-subtle)" }}>Sin proyecto</div>
          </div>
        )
      },
    },
    {
      id: "productor",
      header: "PRODUCTOR",
      minWidth: "130px",
      cell: (rq) => (
        <div style={{ color: "var(--v2-text)" }}>{rq.proyecto?.productor ? rq.proyecto.productor.nombre + " " + rq.proyecto.productor.apellido : "—"}</div>
      ),
    },
    {
      id: "proveedor",
      header: "PROVEEDOR",
      minWidth: "140px",
      cell: (rq) => (
        <div style={{ color: "var(--v2-text)", fontWeight: 600 }}>{rq.proveedor_nombre || rq.proveedor?.nombre || "—"}</div>
      ),
    },
    {
      id: "descripcion",
      header: "DESCRIPCIÓN",
      minWidth: "150px",
      cell: (rq) => (
        rq.descripcion ? (
          <V2Tooltip content={rq.descripcion}>
            <div className={styles.descripcionCell}>{rq.descripcion}</div>
          </V2Tooltip>
        ) : (
          <div className={styles.descripcionCell}>—</div>
        )
      ),
    },
    {
      id: "monto",
      header: "MONTO",
      align: "right",
      minWidth: "115px",
      cell: (rq) => (
        <span style={{ fontWeight: 800, color: "var(--v2-text)" }}>{fmt(montoFinalRQ(rq))}</span>
      ),
    },
    {
      id: "condicion",
      header: "CONDICIÓN",
      minWidth: "110px",
      cell: (rq) => {
        const condicion = condicionComercialRQ(rq)
        if (!condicion) return "—"
        return (
          <div className={styles.condicionCell}>
            <V2Badge variant="neutral" size="sm">{condicionLabelRQ(rq)}{rq.dias_credito ? ` ${rq.dias_credito}d` : ""}</V2Badge>
            {rq.es_excepcion && <V2Badge variant="danger" size="sm">🚩 Excepción</V2Badge>}
          </div>
        )
      },
    },
    {
      id: "fechaSolicitud",
      header: "FECHA DE SOLICITUD",
      minWidth: "115px",
      cell: (rq) => <span>{fmtFecha(rq.created_at)}</span>,
    },
    {
      id: "fechaPago",
      header: "FECHA DE PAGO",
      minWidth: "115px",
      cell: (rq) => {
        const real = fechaPagoRealRQ(rq)
        const programada = fechaProgramadaRQ(rq)
        const valor = real || programada
        return (
          <div className={styles.fechasCell}>
            <div>{fmtFecha(valor)}</div>
            {!real && programada && <div style={{ fontSize: 10.5, color: "var(--v2-subtle)" }}>Programada</div>}
          </div>
        )
      },
    },
    {
      id: "estadoPago",
      header: "ESTADO PAGO",
      minWidth: "110px",
      cell: (rq) => {
        const pago = estadoPagoRQ(rq)
        return (
          <div>
            <V2Badge variant={estadoPagoVariant(pago.key)} size="sm">{pago.label}</V2Badge>
            {rq.estado === "pagado" && rq.numero_operacion && (
              <div style={{ fontSize: 10, color: "var(--v2-subtle)", marginTop: 3 }}>Op: {rq.numero_operacion}</div>
            )}
          </div>
        )
      },
    },
    {
      id: "estadoRQ",
      header: "ESTADO RQ",
      minWidth: "120px",
      cell: (rq) => {
        const ec = ESTADOS[rq.estado] || { label: rq.estado }
        const migracion = estadoMigracionRQ(rq, migrationLogs)
        return (
          <div>
            <V2Badge variant={estadoRQVariant(rq.estado)} size="sm">{ec.label}</V2Badge>
            {rqPerteneceAProyectoEliminado(rq) && (
              <div style={{ fontSize: 10, color: "var(--v2-danger)", marginTop: 3, fontWeight: 700 }}>Proyecto eliminado</div>
            )}
            <div title={motivoEstadoMigracion(rq, migrationLogs)} style={{ display: "inline-flex", marginTop: 3, background: migracion.bg, color: migracion.color, padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
              {migracion.label}
            </div>
          </div>
        )
      },
    },
    {
      id: "acciones",
      header: "",
      align: "right",
      minWidth: "120px",
      cell: (rq) => {
        const accion = getSiguienteAccion(rq)
        const puedeEditar = puedeEditarRQ(rq)
        const puedeCancelar = puedeCancelarRQ(rq)
        const menuItems = [
          ...(puedeEditar ? [{ label: "Editar", onSelect: () => { setSelected(rq); abrirEditarRQ(rq) } }] : []),
          ...(puedeCancelar ? [{ label: "Cancelar", onSelect: () => cancelarRQ(rq) }] : []),
        ]
        return (
          <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
            {accion && (
              <V2Button variant="primary" size="sm" onClick={() => cambiarEstado(rq.id, accion.nextEstado)}>{accion.label}</V2Button>
            )}
            {menuItems.length > 0 && (
              <V2Dropdown
                trigger={
                  <V2IconButton label="Más acciones" size="sm">
                    <MoreVertical size={14} />
                  </V2IconButton>
                }
                items={menuItems}
              />
            )}
          </div>
        )
      },
    },
  ]

  const puedeEditarPago = selected ? puedeAccionRQ("pagar", selected) : puedeAccionRQ("pagar")
  if (loading) return (
    <div style={{ padding: 24 }}>
      <V2LoadingState rows={5} variant="table" title="Cargando requerimientos de pago..." />
    </div>
  )
  if (!puedeVerModulo(perfil, "rq")) return (
    <div style={{ padding: 24 }}>
      <V2EmptyState title="Sin acceso" description="No tienes permiso para ver Requerimientos de Pago." />
    </div>
  )

  const estadoQuickFilter = (
    <div className={styles.toolbarField}>
      <V2Popover
        ariaLabel="Filtrar por estado RQ"
        trigger={
          <V2Button variant="secondary" size="compact" style={{ width: "100%" }}>
            {filtroEstados.length === 0 ? "Todos los estados" : `${filtroEstados.length} estado${filtroEstados.length > 1 ? "s" : ""}`}
          </V2Button>
        }
      >
        <div className={styles.estadosPopover}>
          {Object.entries(ESTADOS).map(([k, v]: any) => {
            const activo = filtroEstados.includes(k)
            return (
              <label className={styles.estadoCheckboxRow} key={k}>
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => setFiltroEstados(prev => activo ? prev.filter(e => e !== k) : [...prev, k])}
                />
                <V2StatusDot tone={estadoRQDotTone(k)} />
                <span>{v.label}</span>
              </label>
            )
          })}
        </div>
      </V2Popover>
    </div>
  )

  const proveedorQuickFilter = (
    <div className={styles.toolbarField}>
      <V2Select
        compact
        value={filtroProveedor}
        onChange={e => setFiltroProveedor(e.target.value)}
        options={[{ label: "Todos los proveedores", value: "" }, ...proveedores.map(p => ({ label: p.nombre, value: p.id }))]}
      />
    </div>
  )

  const archivadoQuickFilter = (
    <div className={styles.toolbarField}>
      <V2Select
        compact
        value={filtroArchivado}
        onChange={e => setFiltroArchivado(e.target.value as "activos" | "archivados" | "todos")}
        options={[
          { label: "Activos", value: "activos" },
          { label: "Archivados (pagados meses anteriores)", value: "archivados" },
          { label: "Todos", value: "todos" },
        ]}
      />
    </div>
  )

  const kpiSection = (
    <div className={styles.kpiGrid}>
      <V2KpiCard
        icon={<Clock size={20} />}
        label="Pendientes"
        value={fmt(totalPendiente)}
        description={`${rqsBaseKpi.filter(r => r.estado === "pendiente_aprobacion").length} RQs`}
        tone="warning"
      />
      <V2KpiCard
        icon={<ShieldCheck size={20} />}
        label="En aprobación"
        value={fmt(totalAprobado)}
        description={`${rqsBaseKpi.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).length} RQs`}
        tone="primary"
      />
      <V2KpiCard
        icon={<CalendarClock size={20} />}
        label="Programados"
        value={fmt(totalProgramado)}
        description={`${rqsBaseKpi.filter(r => r.estado === "programado").length} RQs`}
        tone="neutral"
      />
      <V2KpiCard
        icon={<Wallet size={20} />}
        label="Pagados"
        value={fmt(totalPagado)}
        description={`${rqsBaseKpi.filter(r => r.estado === "pagado").length} RQs${filtroArchivado === "activos" ? " · mes actual" : filtroArchivado === "archivados" ? " · archivados" : " · activos + archivados"}`}
        tone="success"
      />
    </div>
  )

  return (
    <>
      {toastMsg && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          padding: "12px 16px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          color: "#fff",
          background: toastType === "success" ? "#15803d" : "#dc2626",
          boxShadow: "0 10px 25px rgba(0,0,0,.15)"
        }}>
          {toastMsg}
        </div>
      )}
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Tesorería & Pagos"
            title="Requerimientos de Pago (RQ)"
            subtitle={`${rqsVistaActiva.length} RQs activos · ${perfil ? perfil.nombre + " " + perfil.apellido + " (" + perfil.perfil + ")" : ""}`}
            actions={
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {puedeAccionRQ("crear") && (
                  <V2Button variant="primary" onClick={async () => { setErrorNuevoRQ(""); const { data: provs } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre"); setProveedores(provs || []); setProveedoresTodos(provs || []); const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre, estado, productor_id").is("deleted_at", null).order("codigo"); setProyectos(filtrarPorAlcance(projs || [], perfil, "proyectos", { usuarioId: perfil?.id })); setShowNuevoRQ(true) }}>
                    + Nuevo RQ
                  </V2Button>
                )}
                <ImportExport modulo="requerimientos" campos={[{key:"codigo_rq",label:"N RQ"},{key:"descripcion",label:"Descripcion"},{key:"proveedor_nombre",label:"Proveedor"},{key:"monto_solicitado",label:"Monto"},{key:"tratamiento_igv",label:"Tratamiento IGV"},{key:"estado",label:"Estado"}]} datos={rqs.map(rq => ({ ...rq, codigo_rq: rqCodigo(rq), tratamiento_igv: rqTratamientoIgvLabel(rq) }))} onImportar={async () => ({ exitosos: 0, errores: ["RQs se generan automaticamente"] })} />
              </div>
            }
          />
        }
        summary={kpiSection}
        toolbar={
          <div className={styles.toolbarWrap}>
            <V2FilterBar
              searchValue={busquedaRQ}
              onSearchChange={setBusquedaRQ}
              searchPlaceholder="Buscar RQ, número, proyecto, proveedor o concepto..."
              activeFiltersCount={advancedFiltersCount}
              onToggleDrawer={abrirFiltrosAvanzados}
              quickFilters={<>{estadoQuickFilter}{proveedorQuickFilter}{archivadoQuickFilter}</>}
              showClearButton={activeFiltersCount > 0}
              onClearFilters={limpiarTodoToolbar}
            />

            {filtrosActivosChips.length > 0 && (
              <div className={styles.chipsRow}>
                {filtrosActivosChips.map(chip => (
                  <V2ActiveFilterChip key={chip.id} id={chip.id} label={chip.label} valueLabel={chip.valueLabel} onRemove={quitarFiltro} />
                ))}
              </div>
            )}

            <div className={styles.resultsSummary}>
              {filtrados.length} requerimiento{filtrados.length === 1 ? "" : "s"} encontrado{filtrados.length === 1 ? "" : "s"}
              {activeFiltersCount > 0 ? ` · ${activeFiltersCount} filtro${activeFiltersCount > 1 ? "s" : ""} activo${activeFiltersCount > 1 ? "s" : ""}` : ""}
            </div>
          </div>
        }
        table={
      <div className={styles.layoutGrid} style={{ gridTemplateColumns: selected ? "1fr 420px" : "1fr" }}>
        <div className={styles.tableWrap}>
          <V2DataTable
            columns={columns}
            rows={paginados}
            getRowId={(rq) => rq.id}
            selectedRowId={selected?.id}
            onRowClick={handleRowClick}
            stickyHeader
            emptyState={
              rqs.length === 0 ? (
                <V2EmptyState title="No existen RQ" description="Aún no se han creado requerimientos de pago." />
              ) : (
                <V2EmptyState
                  title="Sin resultados"
                  description="No hay resultados para los filtros seleccionados."
                  primaryAction={<V2Button variant="secondary" onClick={limpiarFiltros}>Limpiar filtros</V2Button>}
                />
              )
            }
          />
          <div className={styles.paginationRow}>
            <V2Pagination
              page={paginaActual}
              pageCount={totalPaginas}
              onPageChange={setPagina}
              summary={`Mostrando ${inicioPagina}–${finPagina} de ${filtrados.length} RQs · 50 por página`}
            />
          </div>
        </div>

        {selected && (
          <div className={`card ${styles.detailPanel}`}>
            <div className={styles.detailPanelHeader}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{rqCodigo(selected)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {puedeEditarRQ(selected) && (
                  <button onClick={() => abrirEditarRQ(selected)} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                    Editar RQ
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>x</button>
              </div>
            </div>
            <div className={styles.detailPanelBody}>
            {!puedeEditarRQ(selected) && mensajeEdicionRQ(selected) && (
              <div style={{ padding: "8px 10px", border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {mensajeEdicionRQ(selected)}
              </div>
            )}
            {rqPerteneceAProyectoEliminado(selected) && (
              <div style={{ padding: "8px 10px", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#991b1b", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                Este RQ pertenece a un proyecto eliminado y no puede procesarse.
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", marginBottom: 10 }}>General</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div><div style={lbl}>Proyecto</div>{rqPerteneceAProyectoEliminado(selected) ? <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 700 }}>{selected.proyecto?.codigo || "Proyecto eliminado"} — {selected.proyecto?.nombre || "No disponible"}</div> : selected.proyecto_id ? <a href={`/proyectos/${selected.proyecto_id}`} style={{ fontSize: 13, color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}>{selected.proyecto?.codigo} — {selected.proyecto?.nombre}</a> : <div style={{ fontSize: 13, color: "#374151" }}>Sin proyecto</div>}</div>
                  <div><div style={lbl}>Proveedor</div><div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.proveedor_nombre || selected.proveedor?.nombre || "—"}</div><div style={{ fontSize: 12, color: "#6b7280" }}>{selected.proveedor?.banco || selected.proveedor_banco || "—"} · {selected.proveedor?.numero_cuenta || selected.proveedor_cuenta || "Sin cuenta"}</div></div>
                  <div><div style={lbl}>Concepto</div><div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion || "—"}</div></div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", marginBottom: 10 }}>Finanzas</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{fmt(detalleIgv(selected).total)}</div>
                <div style={{ marginTop: 8, padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>{rqTratamientoIgv(selected) === "no_aplica" ? "Monto" : "Subtotal"}</span><strong>{fmt(detalleIgv(selected).subtotal)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>IGV 18%</span><strong>{fmt(detalleIgv(selected).igv)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #e5e7eb", paddingTop: 4 }}><span style={{ color: "#374151", fontWeight: 700 }}>Total</span><strong>{fmt(detalleIgv(selected).total)}</strong></div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#374151" }}>
                  <div><div style={lbl}>IGV</div>{rqTratamientoIgvLabel(selected)}</div>
                  <div><div style={lbl}>Condición</div>{condicionLabelRQ(selected)}{selected.dias_credito ? ` · ${selected.dias_credito}d` : ""}</div>
                  <div><div style={lbl}>Medio</div>{selected.medio_pago || selected.tipo_transferencia || "—"}</div>
                  <div><div style={lbl}>Estado pago</div>{estadoPagoRQ(selected).label}</div>
                  <div><div style={lbl}>F. necesidad</div>{fmtFecha(fechaNecesidadRQ(selected))}</div>
                  <div><div style={lbl}>F. programada</div>{fmtFecha(fechaProgramadaRQ(selected))}</div>
                  <div><div style={lbl}>F. pago real</div>{fmtFecha(fechaPagoRealRQ(selected))}</div>
                </div>
              </div>

              {selected.es_excepcion && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#b91c1c", textTransform: "uppercase", marginBottom: 8 }}>Excepción</div>
                  <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 700 }}>🚩 Pago marcado como excepción</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>{selected.motivo_excepcion || "Sin motivo registrado"}</div>
                </div>
              )}

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", marginBottom: 10 }}>Documentos</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#374151" }}>
                  <div><div style={lbl}>Estado doc.</div>{selected.estado_documentario || "—"}</div>
                  <div><div style={lbl}>Comprobante</div>{[selected.comprobante_tipo, selected.comprobante_serie, selected.comprobante_numero].filter(Boolean).join(" ") || "—"}</div>
                  <div><div style={lbl}>PDF</div>{selected.comprobante_pdf_url ? <a href={selected.comprobante_pdf_url} target="_blank" style={{ color: "#1e40af" }}>Ver PDF</a> : "—"}</div>
                  <div><div style={lbl}>Voucher</div>{selected.voucher_url ? <a href={selected.voucher_url} target="_blank" style={{ color: "#1e40af" }}>Ver voucher</a> : "—"}</div>
                </div>
              </div>

              {/* Auditoría / Historial */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Auditoría / Historial</div>
                {FLUJO.map((paso, i) => {
                  const estados = FLUJO.map(f => f.estado)
                  const idxActual = estados.indexOf(selected.estado)
                  const completado = i <= idxActual
                  const actual = i === idxActual
                  const rolLabel: Record<string, string> = { gerente_produccion: "Gerente Prod.", gerente_general: "Gerente General", controller: "Controller", superadmin: "Superadmin" }
                  const rolesLabel = paso.roles.filter(r => r !== "superadmin").map(r => rolLabel[r] || r).join(", ")
                  return (
                    <div key={paso.estado} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: completado ? "#0F6E56" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: actual ? "#0F6E56" : completado ? "#374151" : "#9ca3af", fontWeight: actual ? 700 : 400 }}>{paso.label}</div>
                        {rolesLabel && <div style={{ fontSize: 10, color: "#9ca3af" }}>{rolesLabel}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Datos de pago — visible en programado, pagado, y al confirmar */}
              {(selected.estado === "programado" || selected.estado === "pagado" || selected.estado === "aprobado") && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", marginBottom: 10 }}>
                    {selected.estado === "pagado" ? "Datos del pago realizado" : "Datos de operacion"}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div>
                      <label style={lbl}>N operacion / referencia</label>
                      <input style={inp} value={datosPago.numero_operacion} placeholder="Ej: 123456789" onChange={e => setDatosPago({ ...datosPago, numero_operacion: e.target.value })} readOnly={!puedeEditarPago || rqPerteneceAProyectoEliminado(selected)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={lbl}>Banco origen</label>
                        <select style={inp} value={datosPago.banco_pago} onChange={e => setDatosPago({ ...datosPago, banco_pago: e.target.value })} disabled={!puedeEditarPago || rqPerteneceAProyectoEliminado(selected)}>
                          <option value="">Seleccionar</option>
                          {BANCOS_PAGO.map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Tipo transferencia</label>
                        <select style={inp} value={datosPago.tipo_transferencia} onChange={e => setDatosPago({ ...datosPago, tipo_transferencia: e.target.value })} disabled={!puedeEditarPago || rqPerteneceAProyectoEliminado(selected)}>
                          {MEDIOS_PAGO.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Link voucher (Google Drive)</label>
                      <input style={inp} value={datosPago.voucher_url} placeholder="https://drive.google.com/..." onChange={e => setDatosPago({ ...datosPago, voucher_url: e.target.value })} readOnly={!puedeEditarPago || rqPerteneceAProyectoEliminado(selected)} />
                      {datosPago.voucher_url && (
                        <a href={datosPago.voucher_url} target="_blank" style={{ fontSize: 11, color: "#1e40af", display: "inline-block", marginTop: 3 }}>Ver voucher →</a>
                      )}
                    </div>
                    <div>
                      <label style={lbl}>Nota de pago</label>
                      <input style={inp} value={datosPago.nota_pago} placeholder="Observaciones opcionales..." onChange={e => setDatosPago({ ...datosPago, nota_pago: e.target.value })} readOnly={!puedeEditarPago || rqPerteneceAProyectoEliminado(selected)} />
                    </div>
                    {puedeEditarPago && !rqPerteneceAProyectoEliminado(selected) && (
                      <button onClick={guardarDatosPago} disabled={guardandoPago}
                        style={{ fontSize: 12, padding: "6px", border: "none", borderRadius: 6, background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        {guardandoPago ? "Guardando..." : "Guardar datos operacion"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selected.estado === "pagado" && (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", textTransform: "uppercase", marginBottom: 10 }}>
                    Rendición del RQ
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={lbl}>Monto rendido</label>
                        <input
                          type="number"
                          style={inp}
                          value={datosRendicion.monto_rendido}
                          placeholder="Ej: 238.00"
                          onChange={e => {
                            const montoRendido = Number(e.target.value) || 0
                            const montoSolicitado = Number(selected.monto_solicitado) || 0
                            setDatosRendicion({
                              ...datosRendicion,
                              monto_rendido: e.target.value,
                              monto_devolucion: String(Math.max(0, montoSolicitado - montoRendido))
                            })
                          }}
                          readOnly={!["controller","superadmin"].includes(rolNormalizado()) || rqPerteneceAProyectoEliminado(selected)}
                        />
                      </div>

                      <div>
                        <label style={lbl}>Devolución</label>
                        <input
                          type="number"
                          style={inp}
                          value={datosRendicion.monto_devolucion}
                          placeholder="Auto"
                          onChange={e => setDatosRendicion({ ...datosRendicion, monto_devolucion: e.target.value })}
                          readOnly={!["controller","superadmin"].includes(rolNormalizado()) || rqPerteneceAProyectoEliminado(selected)}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>Fecha rendición</label>
                      <input
                        type="date"
                        style={inp}
                        value={datosRendicion.fecha_rendicion}
                        onChange={e => setDatosRendicion({ ...datosRendicion, fecha_rendicion: e.target.value })}
                        readOnly={!["controller","superadmin"].includes(rolNormalizado()) || rqPerteneceAProyectoEliminado(selected)}
                      />
                    </div>

                    <div>
                      <label style={lbl}>Observación rendición</label>
                      <textarea
                        style={{ ...inp, resize: "vertical" }}
                        rows={2}
                        value={datosRendicion.observacion_rendicion}
                        placeholder="Ej: Supervisor rindió S/238 y devolvió S/12"
                        onChange={e => setDatosRendicion({ ...datosRendicion, observacion_rendicion: e.target.value })}
                        readOnly={!["controller","superadmin"].includes(rolNormalizado()) || rqPerteneceAProyectoEliminado(selected)}
                      />
                    </div>

                    {Number(datosRendicion.monto_rendido || 0) > 0 && (
                      <div style={{ padding: 10, background: "#fff", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Solicitado</span><strong>{fmt(Number(selected.monto_solicitado || 0))}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Rendido real</span><strong>{fmt(Number(datosRendicion.monto_rendido || 0))}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Devolución</span><strong>{fmt(Number(datosRendicion.monto_devolucion || 0))}</strong>
                        </div>
                      </div>
                    )}

                    {["controller","superadmin"].includes(rolNormalizado()) && !rqPerteneceAProyectoEliminado(selected) && (
                      <button onClick={guardarRendicionRQ} disabled={guardandoRendicion}
                        style={{ fontSize: 12, padding: "6px", border: "none", borderRadius: 6, background: "#f97316", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        {guardandoRendicion ? "Guardando..." : "Guardar rendición"}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Fecha de pago */}
              {(selected.estado === "aprobado" || selected.estado === "programado") && getSiguienteAccion(selected) && (
                <div>
                  <label style={lbl}>{getSiguienteAccion(selected)?.nextEstado === "programado" ? "Fecha programada de pago" : "Fecha real de pago"}</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, width: "100%", fontFamily: "inherit", outline: "none" }} />
                </div>
              )}

              {getSiguienteAccion(selected) && (
                <button onClick={() => {
                  const accion = getSiguienteAccion(selected)
                  if (accion) cambiarEstado(selected.id, accion.nextEstado, fechaPago ? (accion.nextEstado === "programado" ? { fecha_programada_pago: fechaPago } : { fecha_pago: fechaPago }) : {})
                }}
                  style={{ padding: "10px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  {getSiguienteAccion(selected)?.label}
                </button>
              )}

              {["superadmin","controller"].includes(rolNormalizado()) && (
                <button onClick={(e) => { e.stopPropagation(); eliminarRQ(selected) }}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  🗑 Eliminar RQ
                </button>
              )}
              {puedeCancelarRQ(selected) && (
                <button onClick={(e) => { e.stopPropagation(); cancelarRQ(selected) }}
                  style={{ padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#4b5563", cursor: "pointer", fontSize: 13 }}>
                  Cancelar RQ
                </button>
              )}
              {puedeRechazar(selected) && (
                <button onClick={() => cambiarEstado(selected.id, "rechazado")}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  Rechazar RQ
                </button>
              )}

              {!getSiguienteAccion(selected) && selected.estado !== "pagado" && selected.estado !== "rechazado" && (
                <div style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                  {(() => {
                    if (rqPerteneceAProyectoEliminado(selected)) return "Este RQ pertenece a un proyecto eliminado y no puede procesarse."
                    const paso = FLUJO.find(f => f.estado === selected.estado)
                    if (!paso) return "Estado final"
                    const rolLabel: Record<string, string> = { gerente_produccion: "Gerente de Produccion", gerente_general: "Gerente General", controller: "Controller" }
                    return `Requiere aprobacion de: ${paso.roles.filter(r => r !== "superadmin").map(r => rolLabel[r] || r).join(" o ")}`
                  })()}
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
        }
      />

      <V2FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeChips={filtrosActivosChips}
        onRemoveChip={quitarFiltro}
        onApply={aplicarFiltrosAvanzados}
        onClearAll={limpiarFiltrosAvanzados}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <V2FormField label="Proyecto">
            <V2Select
              value={tempProyecto}
              onChange={e => setTempProyecto(e.target.value)}
              options={[
                { label: "Todos los proyectos", value: "" },
                ...proyectos.map((p: any) => ({ label: `${p.codigo} - ${p.nombre}`, value: p.id })),
              ]}
            />
          </V2FormField>

          <V2FormField label="Condición comercial">
            <V2Select
              value={tempTipoPago}
              onChange={e => setTempTipoPago(e.target.value)}
              options={[
                { label: "Todas las condiciones", value: "" },
                { label: "Contado", value: "contado" },
                { label: "Adelanto", value: "adelanto" },
                { label: "Credito", value: "credito" },
              ]}
            />
          </V2FormField>

          <V2FormField label="Estado de pago">
            <V2Select
              value={tempEstadoPago}
              onChange={e => setTempEstadoPago(e.target.value)}
              options={[
                { label: "Todos los estados de pago", value: "" },
                { label: "Sin programar", value: "sin_programar" },
                { label: "Programado", value: "programado" },
                { label: "Vence hoy", value: "vence_hoy" },
                { label: "Vencido", value: "vencido" },
                { label: "Pagado", value: "pagado" },
                { label: "Anulado", value: "anulado" },
              ]}
            />
          </V2FormField>

          <V2FormField label="Fecha necesidad desde">
            <V2Input type="date" value={tempFechaNecesidadDesde} onChange={e => setTempFechaNecesidadDesde(e.target.value)} />
          </V2FormField>

          <V2FormField label="Fecha necesidad hasta">
            <V2Input type="date" value={tempFechaNecesidadHasta} onChange={e => setTempFechaNecesidadHasta(e.target.value)} />
          </V2FormField>

          <V2FormField label="Excepciones">
            <V2Select
              value={tempExcepcion}
              onChange={e => setTempExcepcion(e.target.value)}
              options={[
                { label: "Todas las solicitudes", value: "todos" },
                { label: "🚩 Solo excepciones", value: "solo" },
                { label: "Sin excepción", value: "sin" },
              ]}
            />
          </V2FormField>

          <V2FormField label="Proyectos eliminados">
            <label className={styles.toolbarCheckboxField}>
              <input type="checkbox" checked={tempIncluirProyectosEliminados} onChange={e => setTempIncluirProyectosEliminados(e.target.checked)} />
              Incluir proyectos eliminados
            </label>
          </V2FormField>
        </div>
      </V2FilterDrawer>

      {showEditarRQ && selected && (
        <div onClick={() => setShowEditarRQ(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Editar RQ</h2>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{rqCodigo(selected)}</div>
              </div>
              <button onClick={() => setShowEditarRQ(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>PROYECTO</label>
                <select style={{ ...inp, background: proyectoBloqueadoEdicion(selected) ? "#f9fafb" : "#fff" }} value={formEditarRQ.proyecto_id} disabled={proyectoBloqueadoEdicion(selected)} onChange={e => setFormEditarRQ({ ...formEditarRQ, proyecto_id: e.target.value })}>
                  <option value="">Sin proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                </select>
                {proyectoBloqueadoEdicion(selected) && (
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>El proyecto no se puede cambiar porque este RQ ya tiene flujo financiero.</div>
                )}
              </div>
              <div><label style={lbl}>CONCEPTO</label><input style={inp} value={formEditarRQ.descripcion} placeholder="Concepto del RQ..." onChange={e => setFormEditarRQ({ ...formEditarRQ, descripcion: e.target.value })} /></div>
              <div><label style={lbl}>PROVEEDOR</label><select style={inp} value={formEditarRQ.proveedor_id} onChange={e => setFormEditarRQ({ ...formEditarRQ, proveedor_id: e.target.value })}><option value="">Seleccionar proveedor</option>{proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>MONTO (S/)</label><input type="number" style={inp} value={formEditarRQ.monto_solicitado} placeholder="0.00" onChange={e => setFormEditarRQ({ ...formEditarRQ, monto_solicitado: e.target.value })} /></div>
                <div><label style={lbl}>FECHA NECESIDAD</label><input type="date" style={inp} value={formEditarRQ.fecha_necesidad_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, fecha_necesidad_pago: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>TRATAMIENTO IGV</label><select style={inp} value={formEditarRQ.tratamiento_igv} onChange={e => setFormEditarRQ({ ...formEditarRQ, tratamiento_igv: e.target.value })}><option value="incluye_igv">Incluye IGV</option><option value="mas_igv">No incluye IGV</option><option value="no_aplica">No aplica</option></select></div>
              {formEditarRQ.monto_solicitado && (
                <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                  {(() => {
                    const igv = rqIgvDetalle({ monto_solicitado: formEditarRQ.monto_solicitado, tratamiento_igv: formEditarRQ.tratamiento_igv })
                    return <>Subtotal {fmt(igv.subtotal)} · IGV {fmt(igv.igv)} · Total {fmt(igv.total)}</>
                  })()}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>CONDICIÓN COMERCIAL</label><select style={inp} value={formEditarRQ.condicion_comercial} onChange={e => setFormEditarRQ({ ...formEditarRQ, condicion_comercial: e.target.value, tipo_pago: e.target.value, dias_credito: e.target.value === "credito" ? formEditarRQ.dias_credito : "" })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
                <div><label style={lbl}>MEDIO DE PAGO</label><select style={inp} value={formEditarRQ.medio_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, medio_pago: e.target.value })}>{MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}</select></div>
              </div>
              {formEditarRQ.condicion_comercial === "credito" && (
                <div><label style={lbl}>DÍAS DE CRÉDITO</label><input type="number" style={inp} value={formEditarRQ.dias_credito} placeholder="Ej: 30" onChange={e => setFormEditarRQ({ ...formEditarRQ, dias_credito: e.target.value })} /></div>
              )}
              <div style={{
                padding: 12,
                borderRadius: 10,
                border: formEditarRQ.es_excepcion ? "1px solid #fecaca" : "1px solid #e5e7eb",
                background: formEditarRQ.es_excepcion ? "#fef2f2" : "#f9fafb"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formEditarRQ.es_excepcion ? "#b91c1c" : "#374151", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formEditarRQ.es_excepcion)}
                    onChange={e => setFormEditarRQ({
                      ...formEditarRQ,
                      es_excepcion: e.target.checked,
                      motivo_excepcion: e.target.checked ? formEditarRQ.motivo_excepcion : ""
                    })}
                  />
                  🚩 Marcar como excepción de pago
                </label>
                {formEditarRQ.es_excepcion && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...lbl, color: "#b91c1c" }}>MOTIVO DE LA EXCEPCIÓN *</label>
                    <textarea
                      rows={3}
                      value={formEditarRQ.motivo_excepcion}
                      placeholder="Explica por qué este pago requiere una excepción..."
                      onChange={e => setFormEditarRQ({ ...formEditarRQ, motivo_excepcion: e.target.value })}
                      style={{ ...inp, resize: "vertical", borderColor: "#fca5a5" }}
                    />
                  </div>
                )}
              </div>
              <div><label style={lbl}>SUSTENTO / LINK</label><input style={inp} value={formEditarRQ.voucher_url} placeholder="https://..." onChange={e => setFormEditarRQ({ ...formEditarRQ, voucher_url: e.target.value })} /></div>
              <div><label style={lbl}>OBSERVACIONES</label><textarea style={{ ...inp, resize: "vertical" }} rows={3} value={formEditarRQ.nota_pago} placeholder="Observaciones internas..." onChange={e => setFormEditarRQ({ ...formEditarRQ, nota_pago: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>N OPERACION</label><input style={inp} value={formEditarRQ.numero_operacion} placeholder="Opcional" onChange={e => setFormEditarRQ({ ...formEditarRQ, numero_operacion: e.target.value })} /></div>
                <div><label style={lbl}>BANCO</label><select style={inp} value={formEditarRQ.banco_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, banco_pago: e.target.value })}><option value="">Seleccionar</option>{BANCOS_PAGO.map(b => <option key={b}>{b}</option>)}</select></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowEditarRQ(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarEdicionRQ} className="btn-primary" style={{ fontSize: 13 }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
      {showNuevoRQ && (
        <div onClick={() => setShowNuevoRQ(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nuevo Requerimiento de Pago</h2>
              <button onClick={() => setShowNuevoRQ(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <RQForm
              formRQ={formRQ}
              onChange={(next) => { setErrorNuevoRQ(""); setFormRQ(next) }}
              proveedoresTodos={proveedoresTodos}
              proyectos={proyectos}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              {errorNuevoRQ && (
                <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#fef2f2", color: "#991b1b", fontSize: 12, textAlign: "left" }}>
                  {errorNuevoRQ}
                </div>
              )}
              <button onClick={() => setShowNuevoRQ(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={crearRQManual} disabled={guardandoRQ} className="btn-primary" style={{ fontSize: 13 }}>{guardandoRQ ? "Creando..." : "Crear RQ"}</button>
            </div>
          </div>
        </div>
)}
    </>
  )
}





















