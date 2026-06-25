"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { enviarAlerta } from "@/lib/alertas"
import { rqCodigo } from "@/lib/rq-code"
import { rqIgvDetalle, rqTratamientoIgv, rqTratamientoIgvLabel } from "@/lib/rq-igv"
import { estadoRQTrasEdicion, mensajeEdicionRQPorEstado, puedeEditarRQPorEstado, requiereReaprobacionRQ } from "@/lib/permisos/rq"
import KpiCard from "@/components/ui/KpiCard"
import StatusBadge from "@/components/ui/StatusBadge"

const ESTADOS: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e",  label: "Pendiente aprobacion" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412",  label: "Aprobado Produccion" },
  aprobado:             { bg: "#dcfce7", color: "#15803d",  label: "Aprobado GG" },
  programado:           { bg: "#dbeafe", color: "#1e40af",  label: "Programado pago" },
  pagado:               { bg: "#f0fdf4", color: "#166534",  label: "Pagado" },
  cancelado:            { bg: "#f3f4f6", color: "#6b7280",  label: "Cancelado" },
  rechazado:            { bg: "#fee2e2", color: "#991b1b",  label: "Rechazado" },
}

const FLUJO = [
  { estado: "pendiente_aprobacion", label: "Creado", siguiente: "aprobado_produccion", accion: "Aprobar (Produccion)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  { estado: "aprobado_produccion", label: "Aprobado Produccion", siguiente: "aprobado", accion: "Aprobar (GG)", roles: ["gerente_general", "superadmin"] },
  { estado: "aprobado", label: "Aprobado GG", siguiente: "programado", accion: "Programar pago", roles: ["controller", "superadmin"] },
  { estado: "programado", label: "Programado pago", siguiente: "pagado", accion: "Confirmar pago", roles: ["controller", "superadmin"] },
  { estado: "pagado", label: "Pagado", siguiente: null, accion: null, roles: [] },
]

const BANCOS_PAGO = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const TIPOS_TRANSFERENCIA = ["Transferencia bancaria", "Yape", "Plin", "Efectivo", "Cheque"]
const ESTADOS_CANCELABLES_RQ = ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "programado"]
const ROLES_CANCELAR_RQ = ["superadmin", "controller", "gerente_general"]
const FORM_RQ_VACIO = {
  descripcion: "",
  proveedor_id: "",
  monto_solicitado: "",
  tratamiento_igv: "incluye_igv",
  proyecto_id: "",
  tipo_pago: "contado",
  dias_credito: "",
  fecha_pago: "",
  voucher_url: "",
  nota_pago: "",
  numero_operacion: "",
  banco_pago: "",
  tipo_transferencia: "Transferencia bancaria",
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
  const [datosPago, setDatosPago] = useState({
    voucher_url: "", numero_operacion: "", banco_pago: "", tipo_transferencia: "Transferencia bancaria", nota_pago: ""
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
  const POR_PAGINA = 50

  useEffect(() => { load() }, [])

  useEffect(() => {
    setPagina(1)
  }, [busquedaRQ, filtroEstados, filtroProveedor, filtroProyecto, filtroTipoPago, incluirProyectosEliminados])

  useEffect(() => {
    setPagina(1)
  }, [busquedaRQ, filtroEstados, filtroProveedor, filtroProyecto, filtroTipoPago, incluirProyectosEliminados])

  async function load() {
    const params = new URLSearchParams(window.location.search)
    const proyectoIdParam = params.get("proyecto_id") || ""
    const rqIdParam = params.get("rq_id") || ""
    const viewParam = params.get("view") || ""
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase
      .from("requerimientos_pago")
      .select("*, proyecto:proyectos(id, nombre, codigo, deleted_at, productor:perfiles!productor_id(id, nombre, apellido)), proveedor:proveedores(nombre, banco, numero_cuenta, tipo_pago)")
      .order("created_at", { ascending: false })
    const loadedRqs = data || []
    setRqs(loadedRqs)
    const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre, estado").is("deleted_at", null).order("codigo")
    setProyectos(projs || [])
    const { data: provsTodos } = await supabase.from("proveedores").select("id, nombre").order("nombre")
    setProveedoresTodos(provsTodos || [])
    const provIds = [...new Set((data || []).map((r: any) => r.proveedor_id).filter(Boolean))]
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
          tipo_transferencia: rqSeleccionado.tipo_transferencia || "Transferencia bancaria",
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
      .in("estado", ESTADOS_CANCELABLES_RQ)
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
    if (!puedeEditarPago) {
      alert("Solo Controller o Superadmin pueden editar los datos de pago.")
      return
    }
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
    if (!["controller", "superadmin"].includes(rolNormalizado())) {
      alert("Solo Controller o Superadmin pueden registrar rendiciones.")
      return
    }
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


  function rqPerteneceAProyectoEliminado(rq: any) {
    return Boolean(rq?.proyecto_id && (!rq.proyecto || rq.proyecto?.deleted_at))
  }

  function puedeEditarRQ(rq: any) {
    if (!rq || rqPerteneceAProyectoEliminado(rq)) return false
    return puedeEditarRQPorEstado(perfil, rq)
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
      tipo_pago: rq.tipo_pago || "contado",
      dias_credito: rq.dias_credito ? String(rq.dias_credito) : "",
      fecha_pago: rq.fecha_pago || "",
      voucher_url: rq.voucher_url || "",
      nota_pago: rq.nota_pago || "",
      numero_operacion: rq.numero_operacion || "",
      banco_pago: rq.banco_pago || "",
      tipo_transferencia: rq.tipo_transferencia || "Transferencia bancaria",
    })
    setShowEditarRQ(true)
  }

  async function guardarEdicionRQ() {
    if (!selected || !puedeEditarRQ(selected)) return
    if (!formEditarRQ.descripcion || !formEditarRQ.monto_solicitado) {
      alert("Descripcion y monto son obligatorios")
      return
    }
    const prov = proveedoresTodos.find((p: any) => p.id === formEditarRQ.proveedor_id)
    const updates: any = {
      descripcion: formEditarRQ.descripcion,
      proveedor_id: formEditarRQ.proveedor_id || null,
      proveedor_nombre: prov?.nombre || "",
      monto_solicitado: Number(formEditarRQ.monto_solicitado),
      tratamiento_igv: formEditarRQ.tratamiento_igv,
      tipo_pago: formEditarRQ.tipo_pago,
      dias_credito: formEditarRQ.dias_credito ? Number(formEditarRQ.dias_credito) : null,
      fecha_pago: formEditarRQ.fecha_pago || null,
      voucher_url: formEditarRQ.voucher_url || null,
      nota_pago: formEditarRQ.nota_pago || null,
      numero_operacion: formEditarRQ.numero_operacion || null,
      banco_pago: formEditarRQ.banco_pago || null,
      tipo_transferencia: formEditarRQ.tipo_transferencia || null,
    }
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
      .select("id, estado, descripcion, proveedor_id, proveedor_nombre, monto_solicitado, tratamiento_igv, tipo_pago, dias_credito, fecha_pago, voucher_url, nota_pago, numero_operacion, banco_pago, tipo_transferencia, proyecto_id")
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
    setSelected((prev: any) => prev ? { ...prev, ...updates, ...updated, proveedor: prov ? { ...(prev.proveedor || {}), nombre: prov.nombre } : prev.proveedor } : prev)
    setShowEditarRQ(false)
    load()
  }

  function errorSupabaseRQ(error: any) {
    const mensaje = String(error?.message || "")
    if (mensaje.includes("tratamiento_igv") || mensaje.includes("schema cache")) {
      return "No se pudo crear el RQ porque falta actualizar el esquema de Supabase. Verifica que la migracion RQ de tratamiento_igv/codigo_rq este aplicada y refresca el schema cache."
    }
    if (mensaje.includes("solicitado_por")) {
      return "No se pudo crear el RQ porque falta el campo solicitado_por en la base de datos o no esta disponible en el schema cache."
    }
    if (mensaje.includes("codigo_rq") || mensaje.includes("rq_codigo")) {
      return "No se pudo generar el codigo RQ. Verifica que la migracion de numeracion RQ y su trigger esten aplicados."
    }
    return mensaje || "No se pudo crear el RQ. Revisa los datos obligatorios e intenta nuevamente."
  }

  async function crearRQManual() {
    setErrorNuevoRQ("")
    const monto = Number(formRQ.monto_solicitado)
    const proyecto = proyectos.find((p: any) => p.id === formRQ.proyecto_id)
    if (!formRQ.proyecto_id) { setErrorNuevoRQ("Selecciona un proyecto para evitar crear un RQ huerfano."); return }
    if (proyecto?.estado !== "en_curso") { setErrorNuevoRQ("Para generar RQs, el proyecto debe estar En curso."); return }
    if (!formRQ.descripcion.trim()) { setErrorNuevoRQ("Ingresa la descripcion o concepto del RQ."); return }
    if (!formRQ.proveedor_id) { setErrorNuevoRQ("Selecciona un proveedor."); return }
    if (!Number.isFinite(monto) || monto <= 0) { setErrorNuevoRQ("Ingresa un monto valido mayor a cero."); return }

    setGuardandoRQ(true)
    try {
      const prov = proveedoresTodos.find((p: any) => p.id === formRQ.proveedor_id)
      const payload = {
        proyecto_id: formRQ.proyecto_id,
        estado: "pendiente_aprobacion",
        proveedor_id: formRQ.proveedor_id,
        proveedor_nombre: prov?.nombre || "",
        monto_solicitado: monto,
        tratamiento_igv: formRQ.tratamiento_igv,
        descripcion: formRQ.descripcion.trim(),
        tipo_pago: formRQ.tipo_pago,
        dias_credito: formRQ.dias_credito ? Number(formRQ.dias_credito) : null,
        es_adicional: true,
        solicitado_por: perfil?.id || null,
      }
      const { data: creado, error } = await supabase.from("requerimientos_pago").insert(payload).select("id,codigo_rq,numero_rq").single()
      if (error) throw error
      console.info("RQ manual creado", {
        proyecto_id: payload.proyecto_id,
        proveedor_id: payload.proveedor_id,
        proveedor_nombre: payload.proveedor_nombre,
        solicitado_por: payload.solicitado_por,
        rq_id: creado?.id,
        codigo_rq: creado?.codigo_rq || creado?.numero_rq,
      })
      await registrarAccion({ accion: "crear", modulo: "rq", entidad_id: creado?.id, entidad_tipo: "rq", descripcion: "RQ manual creado: " + rqCodigo(creado), datos_nuevos: payload })
      setShowNuevoRQ(false)
      setFormRQ(FORM_RQ_VACIO)
      await load()
    } catch (error: any) {
      console.error("Error creando RQ manual:", error)
      setErrorNuevoRQ(errorSupabaseRQ(error))
    } finally {
      setGuardandoRQ(false)
    }
  }

  function getSiguienteAccion(rq: any) {
    if (rqPerteneceAProyectoEliminado(rq)) return null
    const rol = rolNormalizado()
    const paso = FLUJO.find(f => f.estado === rq.estado)
    if (!paso || !paso.siguiente) return null
    if (paso.roles.includes(rol)) return { label: paso.accion, nextEstado: paso.siguiente, color: "#0F6E56" }
    return null
  }

  function puedeRechazar(rq: any) {
    if (rqPerteneceAProyectoEliminado(rq)) return false
    const rol = rolNormalizado()
    if (["pagado", "cerrado", "cancelado", "rechazado"].includes(rq.estado)) return false
    return ["gerente_produccion", "gerente_general", "controller", "superadmin"].includes(rol)
  }

  function puedeCancelarRQ(rq: any) {
    if (!rq || rqPerteneceAProyectoEliminado(rq)) return false
    if (["pagado", "cerrado", "cancelado"].includes(rq.estado)) return false
    return ["superadmin", "controller"].includes(rolNormalizado())
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const detalleIgv = (rq: any) => rqIgvDetalle(rq)

  const rqsVistaActiva = incluirProyectosEliminados ? rqs : rqs.filter(r => r.estado !== "cancelado" && !rqPerteneceAProyectoEliminado(r))
  const rqsProyectosEliminados = rqs.filter(r => rqPerteneceAProyectoEliminado(r))
  const filtradosBase = rqsVistaActiva.filter(r => {
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
    if (filtroTipoPago && r.tipo_pago !== filtroTipoPago) return false
    return true
  })
  const filtrados = filtradosBase
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicioPagina = filtrados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1
  const finPagina = Math.min(paginaActual * POR_PAGINA, filtrados.length)
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const totalPendiente = rqsVistaActiva.filter(r => r.estado === "pendiente_aprobacion").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalAprobado = rqsVistaActiva.filter(r => ["aprobado_produccion", "aprobado"].includes(r.estado)).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalProgramado = rqsVistaActiva.filter(r => r.estado === "programado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalPagado = rqsVistaActiva.filter(r => r.estado === "pagado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3, display: "block" }

  const puedeEditarPago = ["controller", "superadmin"].includes(rolNormalizado())
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Requerimientos de pago</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {rqsVistaActiva.length} RQs activos{rqsProyectosEliminados.length ? ` · ${rqsProyectosEliminados.length} en proyectos eliminados` : ""} · {perfil ? perfil.nombre + " " + perfil.apellido + " (" + perfil.perfil + ")" : ""}
          </p>
        </div>
        {["superadmin","gerente_general","gerente_produccion","controller"].includes(rolNormalizado()) && (<button onClick={async () => { setErrorNuevoRQ(""); const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre"); setProveedores(provs || []); setProveedoresTodos(provs || []); const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre, estado").is("deleted_at", null).order("codigo"); setProyectos(projs || []); setShowNuevoRQ(true) }} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo RQ</button>)}
        <ImportExport modulo="requerimientos" campos={[{key:"codigo_rq",label:"N RQ"},{key:"descripcion",label:"Descripcion"},{key:"proveedor_nombre",label:"Proveedor"},{key:"monto_solicitado",label:"Monto"},{key:"tratamiento_igv",label:"Tratamiento IGV"},{key:"estado",label:"Estado"}]} datos={rqs.map(rq => ({ ...rq, codigo_rq: rqCodigo(rq), tratamiento_igv: rqTratamientoIgvLabel(rq) }))} onImportar={async () => ({ exitosos: 0, errores: ["RQs se generan automaticamente"] })} />
      </div>      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard
          icon="money"
          label="Pendientes"
          value={fmt(totalPendiente)}
          sub={`${rqsVistaActiva.filter(r => r.estado === "pendiente_aprobacion").length} RQs`}
          borderColor="#F59E0B"
          valueColor="#92400E"
        />

        <KpiCard
          icon="shield"
          label="En aprobación"
          value={fmt(totalAprobado)}
          sub={`${rqsVistaActiva.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).length} RQs`}
          borderColor="#3B82F6"
          valueColor="#1E40AF"
        />

        <KpiCard
          icon="chart"
          label="Programados"
          value={fmt(totalProgramado)}
          sub={`${rqsVistaActiva.filter(r => r.estado === "programado").length} RQs`}
          borderColor="#06B6D4"
          valueColor="#0E7490"
        />

        <KpiCard
          icon="wallet"
          label="Pagados"
          value={fmt(totalPagado)}
          sub={`${rqsVistaActiva.filter(r => r.estado === "pagado").length} RQs`}
          borderColor="#10B981"
          valueColor="#166534"
        />
      </div>

      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
  value={busquedaRQ}
  onChange={e => setBusquedaRQ(e.target.value)}
  placeholder="Buscar RQ, número, proyecto, proveedor o concepto..."
  style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", minWidth: 360, flex: "1 1 360px" }}
/>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(ESTADOS).map(([k, v]: any) => {
              const activo = filtroEstados.includes(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFiltroEstados(prev => activo ? prev.filter(e => e !== k) : [...prev, k])}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: activo ? `1px solid ${v.color}` : "1px solid #e5e7eb",
                    background: activo ? v.bg : "#fff",
                    color: activo ? v.color : "#6b7280",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activo ? "✓ " : ""}{v.label}
                </button>
              )
            })}
          </div>          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroTipoPago} onChange={e => setFiltroTipoPago(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="contado">Contado</option>
            <option value="adelanto">Adelanto</option>
            <option value="credito">Credito</option>
          </select>
          {filtroProyecto && (
            <span style={{ fontSize: 12, color: "#0F6E56", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "4px 10px", fontWeight: 700 }}>
              Proyecto filtrado
            </span>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            <input type="checkbox" checked={incluirProyectosEliminados} onChange={e => setIncluirProyectosEliminados(e.target.checked)} />
            Incluir proyectos eliminados
          </label>
          {(filtroEstados.length > 0 || filtroProveedor || filtroTipoPago || filtroProyecto || incluirProyectosEliminados) && (
            <button onClick={() => { setFiltroEstados([]); setFiltroProveedor(""); setFiltroTipoPago(""); setFiltroProyecto(""); setIncluirProyectosEliminados(false) }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} resultados</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#fff", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N RQ</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>IGV</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>F. SOLICITUD</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>F. VENCIMIENTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((rq, idx) => {
                const ec = ESTADOS[rq.estado] || { bg: "#f3f4f6", color: "#6b7280", label: rq.estado }
                const accion = getSiguienteAccion(rq)
                const igv = detalleIgv(rq)
                const proyectoEliminado = rqPerteneceAProyectoEliminado(rq)
                return (
                  <tr key={rq.id}
                    style={{ borderTop: "1px solid #F1F5F9", background: selected?.id === rq.id ? "#F0FDF4" : "#FFFFFF", cursor: "pointer" }}
                    onClick={() => {
                      if (selected?.id === rq.id) { setSelected(null); return }
                      setSelected(rq)
                      setDatosPago({
                        voucher_url: rq.voucher_url || "",
                        numero_operacion: rq.numero_operacion || "",
                        banco_pago: rq.banco_pago || "",
                        tipo_transferencia: rq.tipo_transferencia || "Transferencia bancaria",
                        nota_pago: rq.nota_pago || "",
                      })
                      setDatosRendicion({
                        monto_rendido: rq.monto_rendido ? String(rq.monto_rendido) : "",
                        monto_devolucion: rq.monto_devolucion ? String(rq.monto_devolucion) : "",
                        fecha_rendicion: rq.fecha_rendicion || "",
                        observacion_rendicion: rq.observacion_rendicion || "",
                      })
                    }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{rqCodigo(rq)}</td>
                    <td style={{ padding: "12px" }}>
                      {proyectoEliminado ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>{rq.proyecto?.codigo || "Proyecto eliminado"}</div>
                          <div style={{ fontSize: 11, color: "#b91c1c" }}>{rq.proyecto?.nombre || "No disponible"} · Proyecto eliminado</div>
                        </>
                      ) : rq.proyecto_id ? (
                        <a href={`/proyectos/${rq.proyecto_id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: "none", display: "inline-block" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>{rq.proyecto?.codigo}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{rq.proyecto?.nombre}</div>
                        </a>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>—</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>Sin proyecto</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{rq.proveedor_nombre || rq.proveedor?.nombre || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>
                      {rq.proyecto?.productor ? rq.proyecto.productor.nombre + " " + rq.proyecto.productor.apellido : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rq.descripcion || "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {fmt(igv.total)}
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>Base {fmt(igv.subtotal)}</div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ background: igv.tratamiento === "mas_igv" ? "#fef9c3" : igv.tratamiento === "no_aplica" ? "#f3f4f6" : "#f0fdf4", color: igv.tratamiento === "mas_igv" ? "#92400e" : igv.tratamiento === "no_aplica" ? "#374151" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {rqTratamientoIgvLabel(rq)}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12 }}>
                      {rq.tipo_pago ? (
                        <span style={{ background: rq.tipo_pago === "credito" ? "#dbeafe" : rq.tipo_pago === "adelanto" ? "#fef9c3" : "#f0fdf4", color: rq.tipo_pago === "credito" ? "#1e40af" : rq.tipo_pago === "adelanto" ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                          {rq.tipo_pago}{rq.dias_credito ? " " + rq.dias_credito + "d" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                      {rq.created_at ? new Date(rq.created_at).toLocaleDateString("es-PE") : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>
                      {rq.tipo_pago === "credito" && rq.dias_credito && rq.created_at
                        ? new Date(new Date(rq.created_at).getTime() + rq.dias_credito * 86400000).toLocaleDateString("es-PE")
                        : rq.tipo_pago === "contado" && rq.created_at
                        ? new Date(rq.created_at).toLocaleDateString("es-PE")
                        : "—"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <StatusBadge label={ec.label} type={rq.estado} />
                      {rq.estado === "pagado" && rq.numero_operacion && (
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Op: {rq.numero_operacion}</div>
                      )}
                      {proyectoEliminado && (
                        <div style={{ fontSize: 10, color: "#991b1b", marginTop: 3, fontWeight: 700 }}>Proyecto eliminado</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {puedeEditarRQ(rq) && (
                        <button onClick={(e) => { e.stopPropagation(); setSelected(rq); abrirEditarRQ(rq) }}
                          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                          Editar
                        </button>
                      )}
                      {accion && (
                        <button onClick={(e) => { e.stopPropagation(); cambiarEstado(rq.id, accion.nextEstado) }}
                          style={{ fontSize: 11, padding: "4px 10px", border: "none", borderRadius: 6, background: accion.color, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                          {accion.label}
                        </button>
                      )}
                      {puedeCancelarRQ(rq) && (
                        <button onClick={(e) => { e.stopPropagation(); cancelarRQ(rq) }}
                          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#4b5563", cursor: "pointer", fontWeight: 600 }}>
                          Cancelar
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={12} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay requerimientos de pago</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #F1F5F9", background: "#fff", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Mostrando <strong style={{ color: "#111827" }}>{inicioPagina}</strong>–<strong style={{ color: "#111827" }}>{finPagina}</strong> de <strong style={{ color: "#111827" }}>{filtrados.length}</strong> RQs · 50 por página
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setPagina(prev => Math.max(1, prev - 1))} disabled={paginaActual <= 1}
                style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 7, background: paginaActual <= 1 ? "#f9fafb" : "#fff", color: paginaActual <= 1 ? "#9ca3af" : "#374151", cursor: paginaActual <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>
                ← Anterior
              </button>

              <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                Página {paginaActual} de {totalPaginas}
              </span>

              <button onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))} disabled={paginaActual >= totalPaginas}
                style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 7, background: paginaActual >= totalPaginas ? "#f9fafb" : "#fff", color: paginaActual >= totalPaginas ? "#9ca3af" : "#374151", cursor: paginaActual >= totalPaginas ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        {selected && (
          <div className="card" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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
              <div>
                <div style={lbl}>Proyecto</div>
                {rqPerteneceAProyectoEliminado(selected) ? (
                  <div>
                    <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 700 }}>{selected.proyecto?.codigo || "Proyecto eliminado"} — {selected.proyecto?.nombre || "No disponible"}</div>
                    <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 3 }}>Visible solo como historial.</div>
                  </div>
                ) : selected.proyecto_id ? (
                  <a href={`/proyectos/${selected.proyecto_id}`} style={{ fontSize: 13, color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}>
                    {selected.proyecto?.codigo} — {selected.proyecto?.nombre}
                  </a>
                ) : (
                  <div style={{ fontSize: 13, color: "#374151" }}>Sin proyecto</div>
                )}
              </div>
              <div>
                <div style={lbl}>Proveedor</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.proveedor_nombre || selected.proveedor?.nombre}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {selected.proveedor_banco || selected.proveedor?.banco || "—"} · {selected.proveedor_cuenta || selected.proveedor?.numero_cuenta || "Sin cuenta"}
                </div>
              </div>
              <div>
                <div style={lbl}>Descripcion</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion || "—"}</div>
              </div>
              <div>
                <div style={lbl}>Monto solicitado</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{fmt(detalleIgv(selected).total)}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  Tratamiento IGV: <strong style={{ color: rqTratamientoIgv(selected) === "mas_igv" ? "#92400e" : rqTratamientoIgv(selected) === "no_aplica" ? "#374151" : "#15803d" }}>{rqTratamientoIgvLabel(selected)}</strong>
                </div>
                <div style={{ marginTop: 8, padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>{rqTratamientoIgv(selected) === "no_aplica" ? "Monto" : "Subtotal"}</span><strong>{fmt(detalleIgv(selected).subtotal)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>IGV 18%</span><strong>{fmt(detalleIgv(selected).igv)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #e5e7eb", paddingTop: 4 }}><span style={{ color: "#374151", fontWeight: 700 }}>Total</span><strong>{fmt(detalleIgv(selected).total)}</strong></div>
                </div>
              </div>

              {/* Flujo aprobacion */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Flujo de aprobacion</div>
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
                          {TIPOS_TRANSFERENCIA.map(t => <option key={t}>{t}</option>)}
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
                  <label style={lbl}>Fecha de pago</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, width: "100%", fontFamily: "inherit", outline: "none" }} />
                </div>
              )}

              {getSiguienteAccion(selected) && (
                <button onClick={() => {
                  const accion = getSiguienteAccion(selected)
                  if (accion) cambiarEstado(selected.id, accion.nextEstado, fechaPago ? { fecha_pago: fechaPago } : {})
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
        )}
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
                <div><label style={lbl}>FECHA REQUERIDA</label><input type="date" style={inp} value={formEditarRQ.fecha_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, fecha_pago: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>TRATAMIENTO IGV</label><select style={inp} value={formEditarRQ.tratamiento_igv} onChange={e => setFormEditarRQ({ ...formEditarRQ, tratamiento_igv: e.target.value })}><option value="incluye_igv">Incluye IGV</option><option value="mas_igv">Mas IGV</option><option value="no_aplica">No aplica IGV</option></select></div>
              {formEditarRQ.monto_solicitado && (
                <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                  {(() => {
                    const igv = rqIgvDetalle({ monto_solicitado: formEditarRQ.monto_solicitado, tratamiento_igv: formEditarRQ.tratamiento_igv })
                    return <>Subtotal {fmt(igv.subtotal)} · IGV {fmt(igv.igv)} · Total {fmt(igv.total)}</>
                  })()}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>TIPO DE PAGO</label><select style={inp} value={formEditarRQ.tipo_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, tipo_pago: e.target.value })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
                <div><label style={lbl}>DIAS DE PAGO</label><input type="number" style={inp} value={formEditarRQ.dias_credito} placeholder="Ej: 30" onChange={e => setFormEditarRQ({ ...formEditarRQ, dias_credito: e.target.value })} /></div>
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
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>PROYECTO</label>
                <select style={inp} value={formRQ.proyecto_id} onChange={e => { setErrorNuevoRQ(""); setFormRQ({ ...formRQ, proyecto_id: e.target.value }) }}>
                  <option value="">Seleccionar proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}{p.estado !== "en_curso" ? " (no en curso)" : ""}</option>)}
                </select>
                {formRQ.proyecto_id && proyectos.find((p: any) => p.id === formRQ.proyecto_id)?.estado !== "en_curso" && (
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>Para generar RQs, el proyecto debe estar En curso.</div>
                )}
              </div>
              <div><label style={lbl}>DESCRIPCION</label><input style={inp} value={formRQ.descripcion} placeholder="Concepto del RQ..." onChange={e => setFormRQ({ ...formRQ, descripcion: e.target.value })} /></div>
              <div><label style={lbl}>PROVEEDOR</label><select style={inp} value={formRQ.proveedor_id} onChange={e => setFormRQ({ ...formRQ, proveedor_id: e.target.value })}><option value="">Seleccionar proveedor</option>{proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div><label style={lbl}>MONTO (S/)</label><input type="number" style={inp} value={formRQ.monto_solicitado} placeholder="0.00" onChange={e => setFormRQ({ ...formRQ, monto_solicitado: e.target.value })} /></div>
              <div><label style={lbl}>TRATAMIENTO IGV</label><select style={inp} value={formRQ.tratamiento_igv} onChange={e => setFormRQ({ ...formRQ, tratamiento_igv: e.target.value })}><option value="incluye_igv">Incluye IGV</option><option value="mas_igv">Mas IGV</option><option value="no_aplica">No aplica IGV</option></select></div>
              {formRQ.monto_solicitado && (
                <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                  {(() => {
                    const igv = rqIgvDetalle({ monto_solicitado: formRQ.monto_solicitado, tratamiento_igv: formRQ.tratamiento_igv })
                    return <>Subtotal {fmt(igv.subtotal)} · IGV {fmt(igv.igv)} · Total {fmt(igv.total)}</>
                  })()}
                </div>
              )}
              <div><label style={lbl}>TIPO DE PAGO</label><select style={inp} value={formRQ.tipo_pago} onChange={e => setFormRQ({ ...formRQ, tipo_pago: e.target.value })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
              <div><label style={lbl}>DIAS DE PAGO (opcional)</label><input type="number" style={inp} value={formRQ.dias_credito} placeholder="Ej: 30, 45, 60..." onChange={e => setFormRQ({ ...formRQ, dias_credito: e.target.value })} /></div>
            </div>
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
    </div>
    </div>
  )
}


