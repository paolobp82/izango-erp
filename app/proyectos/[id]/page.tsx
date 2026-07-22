"use client"
import { registrarAccion } from "@/lib/trazabilidad"
import { registrarHistorial } from "@/lib/historial"
import { enviarAlerta } from "@/lib/alertas"
import { notificarATodos } from "@/lib/notificaciones"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { cargarItemsAprobadosAlGestor } from "@/lib/gestor"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { rqCodigo } from "@/lib/rq-code"
import { rqIgvDetalle, rqTratamientoIgvLabel } from "@/lib/rq-igv"
import { filtrarPorAlcance, puedeEjecutarAccion, puedeVerInformacionSensible, puedeVerModulo, type AccionPermiso } from "@/lib/permisos"
import { lifecycleEngine } from "@/lib/core/lifecycle"
import { businessRuleEngine } from "@/lib/core/business-rules"
import { esFacturaAnulada, totalFactura } from "@/lib/finance"
import { puedeCerrarFinancieramenteProyecto } from "@/lib/proyecto-cierre-financiero"
import { RQ_MIGRATION_SUCCESS_ACTIONS } from "@/lib/rq-migracion"
import { V2DetailPageTemplate } from "@/components/v2/templates"
import { V2AlertCard, V2ActivityTimeline, V2Button, V2EmptyState, V2ErrorState, V2MetricCard, V2QuickActions, V2SectionCard, V2SectionHeader, V2Select, V2StatusBadge, V2StatusSelect } from "@/components/v2/system"
import type { V2TimelineItem } from "@/components/v2/system/V2ActivityTimeline"
import { ProjectDetailShellV2 } from "@/components/v2/projects/ProjectDetailShellV2"
import { ProjectDetailHeaderV2, estadoTone } from "@/components/v2/projects/ProjectDetailHeaderV2"
import { ProjectDetailSection } from "@/components/v2/projects/ProjectDetailContentV2"
import { DEFAULT_PROJECT_DETAIL_TAB, isProjectDetailTabId, type ProjectDetailTabId } from "@/components/v2/projects/ProjectDetailTabsV2"
import { ProjectActionToolbarV2, type ProjectToolbarAction } from "@/components/v2/projects/ProjectActionToolbarV2"
import { ProjectWorkflowCardV2, type ProjectWorkflowStep } from "@/components/v2/projects/ProjectWorkflowCardV2"
import { ProjectInfoCardV2 } from "@/components/v2/projects/ProjectInfoCardV2"
import styles from "@/components/v2/projects/ProjectDetailV2.module.css"
import { FilePlus2, FileText, ClipboardList, Video, Receipt, FileCheck2, FolderOpen, Pencil, Eye, Trash2, RotateCcw, CheckCircle2 } from "lucide-react"

const FLUJO: Record<string, any> = {
  pendiente_aprobacion: { label: "Pendiente aprobación", bg: "#fef9c3", color: "#92400e", siguiente: "aprobado_produccion", accion: "Aprobar (Producción)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  aprobado_produccion:  { label: "Aprobado Producción",  bg: "#fed7aa", color: "#9a3412", siguiente: "aprobado_gerencia",   accion: "Aprobar (Gerencia)",      roles: ["gerente_general", "superadmin"] },
  aprobado_gerencia:    { label: "Aprobado Gerencia",    bg: "#e0e7ff", color: "#3730a3", siguiente: "aprobado_cliente",    accion: "Aprobar cliente",    roles: ["gerente_general", "superadmin", "comercial"] },
  aprobado_cliente:     { label: "Aprobado Cliente",     bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Preparar pre-cuadre / generar RQs", roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  aprobado:             { label: "Aprobado",              bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Iniciar proyecto",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  en_curso:             { label: "En curso",              bg: "#dcfce7", color: "#15803d", siguiente: "terminado",           accion: "Marcar terminado",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  terminado:            { label: "Terminado",             bg: "#f3f4f6", color: "#6b7280", siguiente: "liquidado",           accion: "Pasar a liquidación",     roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  liquidado:            { label: "Liquidado",             bg: "#f5f3ff", color: "#6d28d9", siguiente: "pendiente_facturacion", accion: "Pasar a facturación", roles: ["controller", "gerente_general", "superadmin"] },
  pendiente_facturacion:{ label: "Pendiente facturación", bg: "#e0f2fe", color: "#0369a1", siguiente: "facturado",           accion: "Marcar facturado",        roles: ["controller", "gerente_general", "superadmin"] },
  facturado:            { label: "Facturado",             bg: "#e0f2fe", color: "#0369a1", siguiente: null,                  accion: null,                      roles: [] },
  cerrado_financiero:   { label: "Pagado",                bg: "#f0fdf4", color: "#166534", siguiente: null,                  accion: null,                      roles: [] },
  cancelado:            { label: "Cancelado",             bg: "#fee2e2", color: "#991b1b", siguiente: null,                  accion: null,                      roles: [] },
  rechazado:            { label: "Rechazado",             bg: "#fde8d8", color: "#c2410c", siguiente: null,                  accion: null,                      roles: [] },
}

const FLUJO_BREADCRUMB = ["pendiente_aprobacion", "aprobado_produccion", "aprobado_gerencia", "aprobado_cliente", "en_curso", "terminado", "liquidado", "pendiente_facturacion", "facturado", "cerrado_financiero"]

const ENTIDADES = [
  { value: "peru", label: "Izango Peru" },
  { value: "selva", label: "Izango Selva" },
]

const ESTADOS_RQ: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  aprobado_produccion: { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Producción" },
  aprobado: { bg: "#dcfce7", color: "#15803d", label: "Aprobado GG" },
  programado: { bg: "#dbeafe", color: "#1e40af", label: "Programado" },
  pagado: { bg: "#f0fdf4", color: "#166534", label: "Pagado" },
  cancelado: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelado" },
  rechazado: { bg: "#fee2e2", color: "#991b1b", label: "Rechazado" },
}

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const supabase = createClient()

  // Pestana activa persistida en la URL (?tab=). Sin valor o valor invalido -> "resumen".
  // Cambiar de pestana no vuelve a ejecutar load(): activeTab es independiente del estado de datos.
  const tabParam = searchParams.get("tab")
  const activeTab: ProjectDetailTabId = isProjectDetailTabId(tabParam) ? tabParam : DEFAULT_PROJECT_DETAIL_TAB

  function handleTabChange(tab: ProjectDetailTabId) {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("tab", tab)
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [cotizacionesEliminadas, setCotizacionesEliminadas] = useState<any[]>([])
  const [historial, setHistorial] = useState<Record<string, any[]>>({})
  const [rqsProyecto, setRqsProyecto] = useState<any[]>([])
  const [liquidacionProyecto, setLiquidacionProyecto] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [showPreCuadre, setShowPreCuadre] = useState(false)
  const [preCuadreItems, setPreCuadreItems] = useState<any[]>([])
  const [itemsCotizadosPresupuesto, setItemsCotizadosPresupuesto] = useState<any[]>([])
  const [showMigracionRQ, setShowMigracionRQ] = useState(false)
  const [comparacionPendiente, setComparacionPendiente] = useState<any>(null)
  const [cotizacionPendienteAprobar, setCotizacionPendienteAprobar] = useState<any>(null)
  const [cotizacionDestinoMigracionId, setCotizacionDestinoMigracionId] = useState("")
  const [logsMigracionRQ, setLogsMigracionRQ] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [guardandoPreCuadre, setGuardandoPreCuadre] = useState(false)
  const [versionAprobar, setVersionAprobar] = useState("")
  const [editandoEntidad, setEditandoEntidad] = useState(false)
  const [showVersionesEliminadas, setShowVersionesEliminadas] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [formEditar, setFormEditar] = useState<any>({})
  const [accesoRestringido, setAccesoRestringido] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    let perfilActual: any = null
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      perfilActual = p
      setPerfil(p)
    }
    if (!puedeVerModulo(perfilActual, "proyectos")) {
      setAccesoRestringido(true)
      setLoading(false)
      return
    }
    const { data: proy } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social, ruc, direccion, nombre_contacto, email_contacto, telefono_contacto), productor:perfiles!productor_id(nombre, apellido)")
      .eq("id", id)
      .single()
    if (!proy || proy.deleted_at) {
      setLoading(false)
      router.replace("/proyectos")
      return
    }
    if (!puedeEjecutarAccion(perfilActual, "proyectos", "ver", { usuarioId: user?.id, registro: proy })) {
      setAccesoRestringido(true)
      setLoading(false)
      return
    }
    setAccesoRestringido(false)
    setProyecto(proy)

    const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).is("deleted_at", null).order("version")
    if (cots && cots.length > 0) {
      const hist: Record<string, any[]> = {}
      for (const cot of cots) {
        const { data: h } = await supabase.from("cotizacion_historial").select("*").eq("cotizacion_id", cot.id).order("created_at", { ascending: false })
        hist[cot.id] = h || []
      }
      setHistorial(hist)
      const yaAprobada = cots.find((c: any) => c.estado === "aprobada_cliente")
      if (yaAprobada) setVersionAprobar(yaAprobada.id)
      else if (proy?.cotizacion_aprobada_id) setVersionAprobar(proy.cotizacion_aprobada_id)
      else setVersionAprobar(cots[cots.length - 1]?.id || "")
    }
    setCotizaciones(cots || [])

    const cotizacionPresupuestoId =
      proy?.cotizacion_aprobada_id ||
      (cots || []).find((c: any) => c.estado === "aprobada_cliente")?.id ||
      [...(cots || [])].sort((a: any, b: any) => (b.version || 0) - (a.version || 0))[0]?.id ||
      ""

    if (cotizacionPresupuestoId) {
      const { data: itemsPresupuesto } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", cotizacionPresupuestoId)
        .order("orden")

      setItemsCotizadosPresupuesto((itemsPresupuesto || []).filter((i: any) => i.tipo !== "celda_extra"))
    } else {
      setItemsCotizadosPresupuesto([])
    }
    const rqSelect = "id,proyecto_id,cotizacion_item_id,codigo_rq,numero_rq,estado,descripcion,monto_solicitado,monto_presupuestado,proveedor_id,proveedor_nombre,tipo_pago,dias_credito,es_adicional,tratamiento_igv,created_at"
    const { data: rqsPorId, error: rqsPorIdError } = await supabase
      .from("requerimientos_pago")
      .select(rqSelect)
      .eq("proyecto_id", id)
      .order("created_at", { ascending: false })
    if (rqsPorIdError) console.error("Error cargando RQs por proyecto_id:", rqsPorIdError.message)
    let rqsVinculados = rqsPorId || []
    if (proy?.codigo) {
      const { data: proyectosMismoCodigo, error: proyectosMismoCodigoError } = await supabase
        .from("proyectos")
        .select("id")
        .eq("codigo", proy.codigo)
      if (proyectosMismoCodigoError) console.error("Error cargando proyectos por codigo:", proyectosMismoCodigoError.message)
      const idsMismoCodigo = [...new Set([id, ...(proyectosMismoCodigo || []).map((p: any) => p.id)].filter(Boolean))]
      if (idsMismoCodigo.length > 0) {
        const { data: rqsPorCodigo, error: rqsPorCodigoError } = await supabase
          .from("requerimientos_pago")
          .select(rqSelect)
          .in("proyecto_id", idsMismoCodigo)
          .order("created_at", { ascending: false })
        if (rqsPorCodigoError) console.error("Error cargando RQs por codigo de proyecto:", rqsPorCodigoError.message)
        if (rqsPorCodigo && rqsPorCodigo.length > 0) {
          const porId = new Map<string, any>()
          ;[...rqsVinculados, ...rqsPorCodigo].forEach((rq: any) => porId.set(rq.id, rq))
          rqsVinculados = Array.from(porId.values()).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        }
      }
    }
    setRqsProyecto(filtrarPorAlcance(rqsVinculados.map((rq: any) => ({ ...rq, proyecto: proy })), perfilActual, "rq", { usuarioId: user?.id, proyecto: proy }))

    const { data: liqProyecto, error: liqProyectoError } = await supabase
      .from("liquidaciones")
      .select("id,costo_presupuestado,precio_cliente_presupuestado,costo_real,precio_cliente_real,margen_real_pct,desvio_costo,cerrada,aprobado_produccion,aprobado_controller,aprobado_controller_at,fecha_cierre")
      .eq("proyecto_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (liqProyectoError) console.error("Error cargando liquidación del proyecto:", liqProyectoError.message)
    setLiquidacionProyecto(liqProyecto || null)

    const { data: logsRQ, error: logsRQError } = await supabase
      .from("rq_version_migration_log")
      .select("rq_id,rq_diferencia_id,accion,cotizacion_destino_id,metadata,created_at")
      .eq("proyecto_id", id)

    if (logsRQError) {
      console.error("No se pudo validar rq_version_migration_log. No asumir 0 migraciones:", logsRQError)
    }
    setLogsMigracionRQ(logsRQ || [])

    const hace2dias = new Date()
    hace2dias.setDate(hace2dias.getDate() - 2)
    const { data: elim } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).not("deleted_at", "is", null).gte("deleted_at", hace2dias.toISOString()).order("deleted_at", { ascending: false })
    setCotizacionesEliminadas(elim || [])
    setLoading(false)
  }

  function contextoProyecto(registro = proyecto) {
    return { usuarioId: perfil?.id, registro, proyecto: registro }
  }

  function accionParaCambioEstado(estadoActual: string): AccionPermiso {
    if (estadoActual === "pendiente_aprobacion") return "aprobar_produccion"
    if (estadoActual === "aprobado_produccion") return "aprobar_gerencia"
    if (estadoActual === "aprobado_gerencia") return "aprobar_cliente"
    if (estadoActual === "aprobado_cliente" || estadoActual === "aprobado") return "iniciar"
    if (estadoActual === "en_curso" || estadoActual === "terminado") return "cerrar_operativo"
    if (estadoActual === "liquidado") return "enviar_facturacion"
    if (estadoActual === "pendiente_facturacion") return "marcar_facturado"
    if (estadoActual === "facturado") return "cerrar_financiero"
    return "editar"
  }

  function puedeAccionProyecto(accion: AccionPermiso, registro = proyecto) {
    return puedeEjecutarAccion(perfil, "proyectos", accion, contextoProyecto(registro))
  }

  function puedeAccionProforma(accion: AccionPermiso, cot?: any) {
    return puedeEjecutarAccion(perfil, "proformas", accion, { usuarioId: perfil?.id, registro: cot ? { ...cot, proyecto } : proyecto, proyecto })
  }

  function puedeAccionRQ(accion: AccionPermiso, rq?: any) {
    return puedeEjecutarAccion(perfil, "rq", accion, { usuarioId: perfil?.id, registro: rq ? { ...rq, proyecto } : proyecto, proyecto })
  }

  async function abrirEditar() {
    const [{ data: cls }, { data: prods }] = await Promise.all([
      supabase.from("clientes").select("id,razon_social").order("razon_social"),
      supabase.from("perfiles").select("id,nombre,apellido").order("apellido"),
    ])
    setClientes(cls || [])
    setProductores(prods || [])
    setFormEditar({
      nombre: proyecto?.nombre || "",
      cliente_id: proyecto?.cliente_id || "",
      productor_id: proyecto?.productor_id || "",
      fecha_inicio: proyecto?.fecha_inicio || "",
      fecha_fin_estimada: proyecto?.fecha_fin_estimada || "",
      presupuesto_referencial: proyecto?.presupuesto_referencial || "",
    })
    setShowEditar(true)
  }

  async function guardarEdicion() {
    if (!puedeAccionProyecto("editar")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    const productorAnteriorId = proyecto?.productor_id || null
    const productorNuevoId = formEditar.productor_id || null
    const productorAnterior = productores.find((prod: any) => prod.id === productorAnteriorId)
    const productorNuevo = productores.find((prod: any) => prod.id === productorNuevoId)
    const { error: updateError } = await supabase.from("proyectos").update({
      nombre: formEditar.nombre,
      cliente_id: formEditar.cliente_id || null,
      productor_id: formEditar.productor_id || null,
      fecha_inicio: formEditar.fecha_inicio || null,
      fecha_fin_estimada: formEditar.fecha_fin_estimada || null,
      presupuesto_referencial: formEditar.presupuesto_referencial ? Number(formEditar.presupuesto_referencial) : null,
    }).eq("id", id)
    if (updateError) {
      alert("No se pudo actualizar el proyecto: " + updateError.message)
      return
    }
    if (productorAnteriorId !== productorNuevoId) {
      const nombreAnterior = productorAnterior ? `${productorAnterior.nombre || ""} ${productorAnterior.apellido || ""}`.trim() : "Sin productor"
      const nombreNuevo = productorNuevo ? `${productorNuevo.nombre || ""} ${productorNuevo.apellido || ""}`.trim() : "Sin productor"
      await registrarAccion({
        accion: "reasignar_productor",
        modulo: "proyectos",
        entidad_id: id,
        entidad_tipo: "proyecto",
        descripcion: `Proyecto reasignado de ${nombreAnterior} a ${nombreNuevo}.`,
        datos_anteriores: { productor_id: productorAnteriorId, productor_nombre: nombreAnterior },
        datos_nuevos: { productor_id: productorNuevoId, productor_nombre: nombreNuevo },
      })
    } else {
      await registrarAccion({ accion: "editar", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto editado: " + formEditar.nombre })
    }
    setProyecto((prev: any) => ({ ...prev, ...formEditar }))
    setShowEditar(false)
    setTimeout(() => load(), 500)
  }

  function itemCambioClave(item: any) {
    return [
      String(item.descripcion || "").trim().toLowerCase(),
      Number(item.cantidad || 0),
      Number(item.costo_unitario || 0),
      Number(item.costo_total || 0),
      Number(item.precio_unitario || 0),
      Number(item.total_cliente || 0),
      String(item.proveedor_id || ""),
      String(item.proveedor_nombre || ""),
      String(item.tipo || ""),
    ].join("|")
  }

  async function compararVersionContraAprobada(cotNueva: any) {
    const cotAnterior = cotizaciones
      .filter((c: any) => c.id !== cotNueva.id && (c.estado === "aprobada_cliente" || c.id === proyecto?.cotizacion_aprobada_id))
      .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))[0]

    if (!cotAnterior) return null

    const [{ data: itemsAnterior }, { data: itemsNueva }, { data: rqs }] = await Promise.all([
      supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotAnterior.id).order("orden"),
      supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotNueva.id).order("orden"),
      supabase.from("requerimientos_pago").select("id,proyecto_id,codigo_rq,numero_rq,estado,cotizacion_item_id,es_adicional,monto_solicitado,monto_presupuestado,descripcion,proveedor_id,proveedor_nombre,proveedor_banco,proveedor_cuenta,proveedor_tipo_pago,tipo_pago,dias_credito,tratamiento_igv,solicitado_por").eq("proyecto_id", id),
    ])

    const activosAnterior = (itemsAnterior || []).filter((i: any) => i.tipo !== "celda_extra")
    const activosNueva = (itemsNueva || []).filter((i: any) => i.tipo !== "celda_extra")

    const mapaAnterior = new Map<string, any>()
    const mapaNueva = new Map<string, any>()

    activosAnterior.forEach((item: any) => mapaAnterior.set(String(item.origen_item_id || item.id), item))
    activosNueva.forEach((item: any) => mapaNueva.set(String(item.origen_item_id || item.id), item))

    const mantenidos: any[] = []
    const modificados: any[] = []
    const eliminados: any[] = []
    const nuevos: any[] = []

    for (const [origen, itemAnt] of mapaAnterior.entries()) {
      const itemNuevo = mapaNueva.get(origen)
      if (!itemNuevo) {
        eliminados.push(itemAnt)
        continue
      }
      if (itemCambioClave(itemAnt) === itemCambioClave(itemNuevo)) {
        mantenidos.push({ anterior: itemAnt, nuevo: itemNuevo })
      } else {
        modificados.push({ anterior: itemAnt, nuevo: itemNuevo })
      }
    }

    for (const [origen, itemNuevo] of mapaNueva.entries()) {
      if (!mapaAnterior.has(origen)) nuevos.push(itemNuevo)
    }

    const itemIdsAnterior = activosAnterior.map((i: any) => i.id)
    const rqsAfectados = (rqs || [])
      .filter((rq: any) => itemIdsAnterior.includes(rq.cotizacion_item_id))
      .map((rq: any) => {
        const itemAnterior = activosAnterior.find((item: any) => item.id === rq.cotizacion_item_id)
        const origen = String(itemAnterior?.origen_item_id || itemAnterior?.id || "")
        const itemNuevo = origen ? mapaNueva.get(origen) : null
        const montoV1 = Number(itemAnterior?.costo_total || rq.monto_presupuestado || rq.monto_solicitado || 0)
        const montoV2 = itemNuevo ? Number(itemNuevo.costo_total || 0) : 0
        const diferencia = montoV2 - montoV1
        let accionSugerida = "Revisar manualmente"

        if (!itemNuevo) {
          accionSugerida = rq.estado === "pagado" ? "Mantener histórico; item eliminado en V2" : "Cancelar RQ; item eliminado en V2"
        } else if (Math.abs(diferencia) < 0.01) {
          accionSugerida = rq.estado === "pagado" ? "Mantener histórico; monto igual" : "Migrar RQ; monto igual"
        } else if (diferencia > 0) {
          accionSugerida = rq.estado === "pagado" ? "Mantener histórico + generar RQ por diferencia" : "Migrar RQ + generar RQ por diferencia"
        } else {
          accionSugerida = rq.estado === "pagado" ? "Mantener histórico + registrar reembolso" : "Migrar RQ + solicitar devolución/ajuste"
        }

        return { ...rq, itemAnterior, itemNuevo, montoV1, montoV2, diferencia, accionSugerida }
      })

    return {
      cotAnterior,
      cotNueva,
      mantenidos,
      modificados,
      eliminados,
      nuevos,
      rqsAfectados,
    }
  }

  function resumenComparacionVersiones(resultado: any) {
    if (!resultado) return ""
    const rqsPagados = resultado.rqsAfectados.filter((rq: any) => rq.estado === "pagado").length
    const rqsNoPagados = resultado.rqsAfectados.filter((rq: any) => rq.estado !== "pagado" && rq.estado !== "cancelado" && rq.estado !== "rechazado").length

    return [
      "Se detectó una versión aprobada anterior: V" + resultado.cotAnterior.version + ".",
      "",
      "Nueva versión a aprobar: V" + resultado.cotNueva.version + ".",
      "",
      "Resumen de cambios:",
      "- Ítems mantenidos: " + resultado.mantenidos.length,
      "- Ítems modificados: " + resultado.modificados.length,
      "- Ítems eliminados: " + resultado.eliminados.length,
      "- Ítems nuevos: " + resultado.nuevos.length,
      "",
      "RQs asociados a la versión anterior: " + resultado.rqsAfectados.length,
      "- RQs no pagados afectados: " + rqsNoPagados,
      "- RQs pagados históricos: " + rqsPagados,
      "",
      "Por ahora el sistema solo muestra este diagnóstico. La migración/cancelación automática se hará en el siguiente paso.",
      "",
      "¿Deseas continuar con la aprobación de esta versión?"
    ].join("\n")
  }

  async function aprobarCotizacionClienteFinal(cot: any) {
    if (!puedeAccionProforma("aprobar_cliente", cot) || !puedeAccionProyecto("aprobar_cliente")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    const aprobadoAt = new Date().toISOString()
    const cotizacionAnterior = cotizaciones.find((c: any) => c.id === proyecto?.cotizacion_aprobada_id) ||
      cotizaciones.find((c: any) => c.id !== cot.id && c.estado === "aprobada_cliente") ||
      null
    for (const otra of cotizaciones) {
      if (otra.id !== cot.id && otra.estado === "aprobada_cliente") {
        const { error: otraError } = await supabase.from("cotizaciones").update({ estado: "enviada_cliente" }).eq("id", otra.id)
        if (otraError) {
          alert("No se pudo desactivar la cotización aprobada anterior: " + otraError.message)
          return
        }
      }
    }
    const { error } = await supabase.from("cotizaciones").update({
      estado: "aprobada_cliente",
      bloqueada: true,
      bloqueada_por: perfil?.id || null,
    }).eq("id", cot.id)
    if (error) {
      alert("Error al aprobar: " + error.message)
      return
    }
    const { error: proyectoError } = await supabase.from("proyectos").update({ cotizacion_aprobada_id: cot.id, estado: "aprobado_cliente" }).eq("id", id)
    if (proyectoError) {
      alert("La cotización fue aprobada, pero no se pudo actualizar el proyecto: " + proyectoError.message)
      return
    }
    try {
      const resultadoGestor = await cargarItemsAprobadosAlGestor(supabase, String(id), String(cot.id))
      if (resultadoGestor.creados > 0) {
        console.info("Items cargados al Gestor desde cotización aprobada", resultadoGestor)
      }
    } catch (gestorError) {
      console.error("No se pudieron cargar items aprobados al Gestor:", gestorError)
      alert("La cotización fue aprobada, pero no se pudieron cargar los items al Gestor. Revisa consola.")
    }
    await registrarHistorial({
      cotizacion_id: cot.id,
      accion: "aprobada_cliente",
      estado_anterior: cot.estado || "borrador",
      estado_nuevo: "aprobada_cliente",
      descripcion: "Cliente aprobo formalmente la cotización. Total: " + fmt(cot.total_cliente || 0),
      datos: { aprobado_por: perfil?.id || null, aprobado_at: aprobadoAt },
    })
    await registrarAccion({
      accion: "aprobar",
      modulo: "cotizaciones",
      entidad_id: cot.id,
      entidad_tipo: "cotizacion",
      descripcion: "Cotización marcada como aprobada por cliente y definida como vigente del proyecto",
      datos_anteriores: {
        cotizacion_aprobada_id: cotizacionAnterior?.id || null,
        version: cotizacionAnterior?.version || null,
      },
      datos_nuevos: {
        aprobado_por: perfil?.id || null,
        aprobado_at: aprobadoAt,
        cotizacion_aprobada_id: cot.id,
        version: cot.version || null,
      }
    })
    setVersionAprobar(cot.id)
    setProyecto((prev: any) => prev ? { ...prev, cotizacion_aprobada_id: cot.id, estado: "aprobado_cliente" } : prev)
    await enviarAlerta("cotizacion_aprobada", { nombre: proyecto?.nombre, codigo: proyecto?.codigo, version: cot.version, total: cot.total_cliente || 0, proyecto_id: id })
    alert("Cotización marcada como aprobada por cliente")
    load()
  }

  async function compararRQsContraVersionDestino(cotDestino: any) {
    if (!cotDestino?.id) return null

    const claveItemMigracion = (item: any) => [
      String(item.descripcion || "").trim().toLowerCase(),
      String(item.categoria || "").trim().toLowerCase(),
      String(item.proveedor_id || item.proveedor_nombre || "").trim().toLowerCase(),
      String(item.tipo || "").trim().toLowerCase(),
    ].join("|")

    const { data: itemsDestino } = await supabase
      .from("cotizacion_items")
      .select("*")
      .eq("cotizacion_id", cotDestino.id)
      .order("orden")

    const { data: rqs } = await supabase
      .from("requerimientos_pago")
      .select("id,proyecto_id,codigo_rq,numero_rq,estado,cotizacion_item_id,es_adicional,monto_solicitado,monto_presupuestado,descripcion,proveedor_id,proveedor_nombre,proveedor_banco,proveedor_cuenta,proveedor_tipo_pago,tipo_pago,dias_credito,tratamiento_igv,solicitado_por")
      .eq("proyecto_id", id)

    const activosDestino = (itemsDestino || []).filter((i: any) => i.tipo !== "celda_extra")
    const destinoPorKey = new Map(activosDestino.map((item: any) => [claveItemMigracion(item), item]))
    const destinoPorOrigen = new Map(activosDestino.map((item: any) => [String(item.origen_item_id || item.id), item]))

    const rqsYaProcesados = new Set(
      logsMigracionRQ
        .filter((log: any) =>
          log.rq_id &&
          [
            ...RQ_MIGRATION_SUCCESS_ACTIONS,
          ].includes(String(log.accion || "").toUpperCase())
        )
        .map((log: any) => log.rq_id)
    )

    const rqsPorMigrar = (rqs || []).filter((rq: any) =>
      rq.cotizacion_item_id &&
      !rq.es_adicional &&
      !rqsYaProcesados.has(rq.id) &&
      !["cancelado", "rechazado", "cerrado"].includes(rq.estado) &&
      !activosDestino.some((item: any) => item.id === rq.cotizacion_item_id)
    )

    if (rqsPorMigrar.length === 0) {
      return {
        cotAnterior: { id: null, version: "", label: "RQs en versiones anteriores" },
        cotNueva: cotDestino,
        mantenidos: [],
        modificados: [],
        eliminados: [],
        nuevos: [],
        rqsAfectados: [],
      }
    }

    const idsOrigen = [...new Set(rqsPorMigrar.map((rq: any) => rq.cotizacion_item_id).filter(Boolean))]

    let itemsOrigen: any[] = []
    if (idsOrigen.length > 0) {
      const { data: origen } = await supabase
        .from("cotizacion_items")
        .select("*")
        .in("id", idsOrigen)

      itemsOrigen = origen || []
    }

    const origenPorId = new Map(itemsOrigen.map((item: any) => [item.id, item]))

    const rqsAfectados = rqsPorMigrar.map((rq: any) => {
      const itemAnterior = origenPorId.get(rq.cotizacion_item_id)
      const origenEstable = String(itemAnterior?.origen_item_id || itemAnterior?.id || "")
      const itemNuevo = itemAnterior ? (destinoPorOrigen.get(origenEstable) || destinoPorKey.get(claveItemMigracion(itemAnterior))) : null
      const montoV1 = Number(itemAnterior?.costo_total || rq.monto_presupuestado || rq.monto_solicitado || 0)
      const montoV2 = itemNuevo ? Number(itemNuevo.costo_total || 0) : 0
      const diferencia = montoV2 - montoV1

      let accionSugerida = "Revisar manualmente"

      if (!itemNuevo) {
        accionSugerida = rq.estado === "pagado" ? "Mantener histórico; item no existe en destino" : "Cancelar RQ; item no existe en destino"
      } else if (Math.abs(diferencia) < 0.01) {
        accionSugerida = rq.estado === "pagado" ? "Mantener histórico; monto igual" : "Migrar RQ; monto igual"
      } else if (diferencia > 0) {
        accionSugerida = rq.estado === "pagado" ? "Mantener histórico + generar RQ por diferencia" : "Migrar RQ + generar RQ por diferencia"
      } else {
        accionSugerida = rq.estado === "pagado" ? "Mantener histórico + registrar reembolso" : "Migrar RQ + solicitar devolución/ajuste"
      }

      return { ...rq, itemAnterior, itemNuevo, montoV1, montoV2, diferencia, accionSugerida }
    })

    return {
      cotAnterior: { id: null, version: "", label: "RQs en versiones anteriores" },
      cotNueva: cotDestino,
      mantenidos: rqsAfectados.filter((rq: any) => rq.itemNuevo && Math.abs(Number(rq.diferencia || 0)) < 0.01),
      modificados: rqsAfectados.filter((rq: any) => rq.itemNuevo && Math.abs(Number(rq.diferencia || 0)) >= 0.01),
      eliminados: rqsAfectados.filter((rq: any) => !rq.itemNuevo),
      nuevos: [],
      rqsAfectados,
    }
  }
  async function registrarLogMigracionRQVersion(params: any) {
    const { error } = await supabase.from("rq_version_migration_log").insert({
      proyecto_id: id,
      cotizacion_origen_id: params.cotizacion_origen_id || comparacionPendiente?.cotAnterior?.id || null,
      cotizacion_destino_id: params.cotizacion_destino_id || params.cotizacion_nueva_id || null,
      rq_id: params.rq_id || null,
      rq_diferencia_id: params.rq_diferencia_id || null,
      cotizacion_item_origen_id: params.cotizacion_item_origen_id || null,
      cotizacion_item_destino_id: params.cotizacion_item_destino_id || null,
      accion: params.accion,
      estado_rq: params.estado_rq || null,
      monto_v1: Number(params.monto_v1 || 0),
      monto_v2: Number(params.monto_v2 || 0),
      diferencia: Number(params.diferencia || 0),
      creado_por: perfil?.id || null,
      metadata: params.metadata || {},
    })

    if (error) {
      console.error("No se pudo registrar log de migración RQ", error)
    }
  }

  function resolverAccionRQVersion(rq: any) {
    const estadoFinal = ["cancelado", "rechazado", "cerrado"].includes(rq.estado)
    const pagado = rq.estado === "pagado"
    const tieneNuevoItem = !!rq.itemNuevo
    const diferencia = Number(rq.diferencia || 0)

    if (estadoFinal) return "OMITIR_FINAL"
    if (!tieneNuevoItem && pagado) return "MANTENER_HISTORICO_ITEM_ELIMINADO"
    if (!tieneNuevoItem && !pagado) return "CANCELAR_ITEM_ELIMINADO"
    if (Math.abs(diferencia) < 0.01 && pagado) return "MIGRAR_REFERENCIA_PAGADO"
    if (Math.abs(diferencia) < 0.01 && !pagado) return "MIGRAR"
    if (diferencia > 0.01 && pagado) return "MANTENER_PAGADO_GENERAR_DIFERENCIA"
    if (diferencia > 0.01 && !pagado) return "MIGRAR_GENERAR_DIFERENCIA"
    if (diferencia < -0.01 && pagado) return "MANTENER_PAGADO_REGISTRAR_REEMBOLSO"
    if (diferencia < -0.01 && !pagado) return "MIGRAR_AJUSTAR_MONTO_MENOR"

    return "REVISAR"
  }

  async function ejecutarAccionRQVersion(rq: any, cot: any) {
    const accion = resolverAccionRQVersion(rq)
    const codigo = rqCodigo(rq)
    const diferencia = Number(rq.diferencia || 0)

    if (accion === "OMITIR_FINAL") return true

    if (accion === "MANTENER_HISTORICO_ITEM_ELIMINADO") {
      await registrarAccion({
        accion: "mantener_historico_rq",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: codigo + " se mantiene histórico porque el item fue eliminado en V" + cot.version,
        datos_nuevos: { cotizacion_nueva_id: cot.id, motivo: "item_eliminado_rq_pagado" }
      })
      return true
    }

    if (accion === "CANCELAR_ITEM_ELIMINADO") {
      const { error } = await supabase.from("requerimientos_pago").update({
        estado: "cancelado",
        cancelado_por: perfil?.id || null,
        cancelado_at: new Date().toISOString(),
        motivo_cancelacion: "Cancelado por cambio de versión de cotización: item eliminado en V" + cot.version,
      }).eq("id", rq.id)

      if (error) {
        alert("No se pudo cancelar " + codigo + ": " + error.message)
        return false
      }

      await registrarAccion({
        accion: "cancelar_rq_por_version",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: codigo + " cancelado por item eliminado en V" + cot.version,
        datos_nuevos: { cotizacion_nueva_id: cot.id, item_anterior_id: rq.itemAnterior?.id || null }
      })
      return true
    }

    if (rq.itemNuevo && ["MIGRAR", "MIGRAR_REFERENCIA_PAGADO", "MIGRAR_GENERAR_DIFERENCIA", "MIGRAR_AJUSTAR_MONTO_MENOR", "MANTENER_PAGADO_GENERAR_DIFERENCIA", "MANTENER_PAGADO_REGISTRAR_REEMBOLSO"].includes(accion)) {
      const updateBase: any = {
        cotizacion_item_id: rq.itemNuevo.id,
        monto_presupuestado: Number(rq.montoV2 || rq.montoV1 || 0),
      }

      if (accion === "MIGRAR_AJUSTAR_MONTO_MENOR") {
        updateBase.monto_solicitado = Number(rq.montoV2 || 0)
        updateBase.monto_presupuestado = Number(rq.montoV2 || 0)
      }

      const { error } = await supabase.from("requerimientos_pago").update(updateBase).eq("id", rq.id)
      if (error) {
        alert("No se pudo migrar " + codigo + ": " + error.message)
        return false
      }

      await registrarAccion({
        accion: rq.estado === "pagado" ? "migrar_referencia_rq_pagado" : "migrar_rq_version",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: codigo + " migrado a item V" + cot.version,
        datos_nuevos: {
          accion_resuelta: accion,
          cotizacion_nueva_id: cot.id,
          item_anterior_id: rq.itemAnterior?.id || null,
          item_nuevo_id: rq.itemNuevo?.id || null,
          monto_v1: rq.montoV1,
          monto_v2: rq.montoV2,
          diferencia,
        }
      })
    }

    if (["MIGRAR_GENERAR_DIFERENCIA", "MANTENER_PAGADO_GENERAR_DIFERENCIA"].includes(accion)) {
      const { data: nuevoRq, error: diffError } = await supabase.from("requerimientos_pago").insert({
        proyecto_id: id,
        cotizacion_item_id: rq.itemNuevo.id,
        es_adicional: true,
        dias_credito: rq.dias_credito || null,
        tipo_pago: rq.tipo_pago || "contado",
        estado: "pendiente_aprobacion",
        proveedor_id: rq.proveedor_id || null,
        proveedor_nombre: rq.proveedor_nombre || "",
        proveedor_banco: rq.proveedor_banco || "",
        proveedor_cuenta: rq.proveedor_cuenta || "",
        proveedor_tipo_pago: rq.proveedor_tipo_pago || null,
        tratamiento_igv: rq.tratamiento_igv || "incluye_igv",
        monto_solicitado: diferencia,
        monto_presupuestado: diferencia,
        descripcion: "Diferencia por cambio de versión: " + (rq.itemNuevo?.descripcion || rq.descripcion || codigo),
        solicitado_por: perfil?.id || rq.solicitado_por || null,
      }).select("id,codigo_rq,numero_rq").single()

      if (diffError) {
        alert("No se pudo generar el RQ por diferencia de " + codigo + ": " + diffError.message)
        return false
      }

      await registrarAccion({
        accion: "generar_rq_diferencia_version",
        modulo: "rq",
        entidad_id: nuevoRq?.id || rq.id,
        entidad_tipo: "rq",
        descripcion: "RQ por diferencia generado desde " + codigo,
        datos_nuevos: {
          rq_origen_id: rq.id,
          cotizacion_nueva_id: cot.id,
          diferencia,
          rq_diferencia_id: nuevoRq?.id || null,
        }
      })
    }

    if (["MANTENER_PAGADO_REGISTRAR_REEMBOLSO"].includes(accion)) {
      await registrarAccion({
        accion: "registrar_reembolso_pendiente_version",
        modulo: "rq",
        entidad_id: rq.id,
        entidad_tipo: "rq",
        descripcion: codigo + " requiere reembolso/ajuste por monto menor en V" + cot.version,
        datos_nuevos: {
          cotizacion_nueva_id: cot.id,
          diferencia,
          monto_reembolso_sugerido: Math.abs(diferencia),
        }
      })
    }

    return true
  }

  async function ejecutarMigracionRQVersion(comparacion: any, cot: any) {
    if (!comparacion || !cot) return

    for (const rq of comparacion.rqsAfectados || []) {
      const ok = await ejecutarAccionRQVersion(rq, cot)
      if (!ok) return
    }

    await aprobarCotizacionClienteFinal(cot)
  }

  async function marcarCotizacionAprobadaCliente(cot: any) {
    if (!cot?.id) return
    if (!puedeAccionProforma("aprobar_cliente", cot) || !puedeAccionProyecto("aprobar_cliente")) {
      alert("No tienes permisos para marcar aprobado por cliente")
      return
    }

    const comparacion = await compararVersionContraAprobada(cot)
    if (comparacion && (comparacion.modificados.length > 0 || comparacion.eliminados.length > 0 || comparacion.nuevos.length > 0 || comparacion.rqsAfectados.length > 0)) {
      setComparacionPendiente(comparacion)
      setCotizacionPendienteAprobar(cot)
      setShowMigracionRQ(true)
      return
    }

    if (!confirm("¿Confirmas que el cliente aprobó formalmente esta cotización?")) return
    await aprobarCotizacionClienteFinal(cot)
  }

  async function cambiarEstado(nuevoEstado: string) {
    const accionBRE = accionParaCambioEstado(proyecto?.estado)

    if (!puedeAccionProyecto(accionBRE)) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }

    const businessRuleResult = businessRuleEngine.allow("proyectos", accionBRE, {
      record: proyecto,
      metadata: {
        nuevoEstado,
        cotizacion_id: versionAprobar || proyecto?.cotizacion_aprobada_id || null,
      },
    })

    if (!businessRuleResult.allowed) {
      alert(businessRuleResult.reason || "La acción no cumple las reglas de negocio.")
      return
    }

    setCambiando(true)

    if (nuevoEstado === "facturado") {
      const { data: facturasProyecto, error: facturasError } = await supabase
        .from("facturas")
        .select("id, numero_factura, fecha_emision, estado, subtotal, igv, proyecto_id")
        .eq("proyecto_id", id)

      if (facturasError) {
        alert("No se pudo validar la factura del proyecto: " + facturasError.message)
        setCambiando(false)
        return
      }

      const facturaValida = (facturasProyecto || []).some((factura: any) =>
        factura.proyecto_id === id &&
        !esFacturaAnulada(factura) &&
        Boolean(factura.numero_factura) &&
        Boolean(factura.fecha_emision) &&
        totalFactura(factura) > 0
      )

      if (!facturaValida) {
        alert("Este proyecto aún no tiene una factura emitida. Registra la factura antes de marcarlo como facturado.")
        setCambiando(false)
        return
      }
    }

    if (nuevoEstado === "aprobado_gerencia" && versionAprobar) {
      await supabase.from("cotizaciones").update({ bloqueada: true }).eq("id", versionAprobar)
    }

    if (nuevoEstado === "aprobado_cliente") {
      alert("La aprobación del cliente debe realizarse desde la proforma vigente.")
      setCambiando(false)
      return
    }

    if (nuevoEstado === "cerrado_financiero") {
      try {
        const cierre = await puedeCerrarFinancieramenteProyecto(supabase, String(id))
        if (!cierre.permitido) {
          alert("No se puede cerrar financieramente el proyecto: " + cierre.razonesPendientes.join(" "))
          setCambiando(false)
          return
        }
      } catch (error: any) {
        alert("No se pudo validar el cierre financiero: " + (error?.message || "error desconocido"))
        setCambiando(false)
        return
      }
    }

    if (nuevoEstado === "en_curso") {
      const cotizacionActivaId =
        proyecto?.cotizacion_aprobada_id ||
        cotizaciones.find((c: any) => c.estado === "aprobada_cliente")?.id ||
        versionAprobar

      if (!cotizacionActivaId) {
        alert("No hay una cotización aprobada por cliente para generar RQs.")
        setCambiando(false)
        return
      }

      setVersionAprobar(cotizacionActivaId)
      setCambiando(false)

      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotizacionActivaId).order("orden")
      const { data: provs } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre")
      setProveedores(provs || [])

      const itemsFiltrados = (its || []).filter((i: any) => i.tipo !== "celda_extra")
      const itemsConSubs: any[] = []

      for (const item of itemsFiltrados) {
        if (item.tipo === "familia") {
          itemsConSubs.push({ ...item, costo_final: 0, esNuevo: false })
          continue
        }

        const { data: subs } = await supabase.from("cotizacion_subitems").select("*").eq("item_id", item.id).order("orden")

        if (subs && subs.length > 0) {
          itemsConSubs.push({ ...item, costo_final: item.costo_total || 0, esNuevo: false, _esPadre: true })

          for (const sub of subs) {
            itemsConSubs.push({
              id: "sub_" + sub.id,
              descripcion: item.descripcion + " — " + sub.descripcion,
              costo_total: sub.monto || 0,
              costo_final: sub.monto || 0,
              proveedor_id: sub.proveedor_id || item.proveedor_id || null,
              proveedor_nombre: sub.proveedor_nombre || "",
              tipo: "subitem",
              esNuevo: false,
              _subitemId: sub.id,
              tipo_pago: "contado",
              tratamiento_igv: sub.tratamiento_igv || item.tratamiento_igv || tratamientoIgvDefaultProyecto,
              pagos: [],
            })
          }
        } else {
          itemsConSubs.push({
            ...item,
            costo_final: item.costo_total || 0,
            esNuevo: false,
            tipo_pago: "contado",
            tratamiento_igv: item.tratamiento_igv || tratamientoIgvDefaultProyecto,
            pagos: [],
          })
        }
      }

      setPreCuadreItems(itemsConSubs)
      setShowPreCuadre(true)
      return
    }

    if (nuevoEstado === "terminado") {
      const cotAprobada = cotizaciones.find((c: any) => c.id === proyecto?.cotizacion_aprobada_id) || cotizaciones.find((c: any) => c.estado === "aprobada_cliente") || cotizaciones.find((c: any) => c.id === versionAprobar)
      const { data: liqExistente } = await supabase.from("liquidaciones").select("id").eq("proyecto_id", id).single()

      if (!liqExistente) {
        const { data: liq } = await supabase.from("liquidaciones").insert({
          proyecto_id: id,
          costo_presupuestado: cotAprobada?.subtotal_costo || 0,
          precio_cliente_presupuestado: cotAprobada?.total_cliente || 0,
          margen_presupuestado_pct: cotAprobada?.margen_pct || 0,
          costo_real: 0,
          precio_cliente_real: cotAprobada?.total_cliente || 0,
          margen_real_pct: 0,
          cerrada: false,
        }).select().single()

        if (liq && cotAprobada) {
          const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotAprobada.id)
          if (its && its.length > 0) {
            await supabase.from("liquidacion_items").insert(its.map((item: any) => ({
              liquidacion_id: liq.id,
              cotizacion_item_id: item.id,
              descripcion: item.descripcion,
              costo_presupuestado: item.costo_total || 0,
              costo_real: 0,
              desvio: 0,
              desvio_pct: 0,
            })))
          }
        }
      }
    }

    const { error: proyectoEstadoError } = await supabase.from("proyectos").update({ estado: nuevoEstado }).eq("id", id)
    if (proyectoEstadoError) {
      alert("No se pudo cambiar el estado del proyecto: " + proyectoEstadoError.message)
      setCambiando(false)
      return
    }
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Estado cambiado a: " + nuevoEstado, datos_nuevos: { estado: nuevoEstado } })

    await notificarATodos({
      titulo: `Proyecto ${proyecto?.codigo} — ${FLUJO[nuevoEstado]?.label || nuevoEstado}`,
      mensaje: `${proyecto?.nombre} cambió a estado: ${FLUJO[nuevoEstado]?.label || nuevoEstado}`,
      tipo: "info",
      enlace: `/proyectos/${id}`,
      perfiles: ["superadmin","gerente_general","gerente_produccion","productor","controller"],
    })

    setProyecto({ ...proyecto, estado: nuevoEstado })
    setCambiando(false)
    load()
  }

  function mensajeErrorRQ(error: any) {
    const mensaje = String(error?.message || "")
    if (mensaje.includes("solicitado_por")) {
      return "No se pudieron crear los RQs porque falta aplicar la migracion de solicitado_por en Supabase o refrescar el schema cache."
    }
    if (mensaje.includes("codigo_rq") || mensaje.includes("rq_codigo")) {
      return "No se pudieron crear los RQs porque fallo la generacion del codigo correlativo RQ."
    }
    return mensaje || "No se pudieron crear los RQs. Revisa los datos e intenta nuevamente."
  }

  async function confirmarPreCuadre() {
    const esAdicional = proyecto?.estado === "en_curso"
    if (!puedeAccionRQ("crear") || (!esAdicional && !puedeAccionProyecto("iniciar"))) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    const sinProveedor = preCuadreItems.filter(i => i.tipo !== "familia" && !i._borrado && !i.proveedor_id)
    if (sinProveedor.length > 0) {
      alert("Los siguientes items no tienen proveedor asignado:\n" + sinProveedor.map((i: any) => "• " + (i.descripcion || "Sin descripción")).join("\n"))
      return
    }
    setGuardandoPreCuadre(true)

    if (!esAdicional) {
      const cotSeleccionada = cotizaciones.find(cot => cot.id === versionAprobar)
      if (String(proyecto?.cotizacion_aprobada_id || "") !== String(versionAprobar || "")) {
        alert("Solo se pueden generar RQs desde la cotización vigente del proyecto.")
        setGuardandoPreCuadre(false)
        return
      }
      if (cotSeleccionada?.estado !== "aprobada_cliente") {
        alert("La cotización debe estar aprobada por cliente antes de iniciar el proyecto")
        setGuardandoPreCuadre(false)
        return
      }
    }
    const rqsAInsertar: any[] = []
    for (const item of preCuadreItems) {
      const esDividido = String(item.id).startsWith("div_")
      const tieneSubitemsActivos = preCuadreItems.some((s: any) => !s._borrado && (s.id === "sub_" + item.id || (s._subitemId && String(s.id).includes(String(item.id)))))
      if (item.tipo === "familia" || item._borrado) continue
      if (item._esPadre && !esDividido && tieneSubitemsActivos) continue
      if (!item.proveedor_id) continue
      const prov = proveedores.find((p: any) => p.id === item.proveedor_id)
      rqsAInsertar.push({
        proyecto_id: id,
        cotizacion_item_id: item.esNuevo ? null : String(item.id).startsWith("new_") || String(item.id).startsWith("sub_") || String(item.id).startsWith("div_") ? null : item.id,
        es_adicional: item.desdePresupuesto ? false : (esAdicional || item.esAdicional || false),
        dias_credito: item.dias_credito || null,
        tipo_pago: item.tipo_pago || "contado",
        estado: "pendiente_aprobacion",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: prov?.nombre || item.proveedor_nombre || "",
        proveedor_banco: prov?.banco || "",
        proveedor_cuenta: prov?.numero_cuenta || "",
        proveedor_tipo_pago: prov?.tipo_pago || null,
        tratamiento_igv: item.tratamiento_igv || tratamientoIgvDefaultProyecto,
        monto_solicitado: Number(item.costo_final) || 0,
        monto_presupuestado: Number(item.costo_total) || 0,
        descripcion: item.descripcion || "",
        solicitado_por: perfil?.id || null,
      })
    }
    if (rqsAInsertar.length > 0) {
      const cotizacionItemIds = rqsAInsertar
        .filter((rq: any) => !rq.es_adicional && rq.cotizacion_item_id)
        .map((rq: any) => rq.cotizacion_item_id)

      if (cotizacionItemIds.length > 0) {
        const { data: rqsExistentes, error: duplicadosError } = await supabase
          .from("requerimientos_pago")
          .select("id,codigo_rq,numero_rq,estado,cotizacion_item_id,descripcion")
          .eq("proyecto_id", id)
          .in("cotizacion_item_id", cotizacionItemIds)

        if (duplicadosError) {
          alert("No se pudo validar duplicados de RQ: " + duplicadosError.message)
          setGuardandoPreCuadre(false)
          return
        }

        const duplicadosActivos = (rqsExistentes || []).filter((rq: any) => !["cancelado", "rechazado"].includes(String(rq.estado || "")))
        if (duplicadosActivos.length > 0) {
          alert("Ya existen RQ activos o pagados para estos ítems:\n" + duplicadosActivos.map((rq: any) => "• " + (rq.codigo_rq || rq.numero_rq || rq.descripcion || rq.id)).join("\n"))
          setGuardandoPreCuadre(false)
          return
        }

        const duplicadosHistoricos = (rqsExistentes || []).filter((rq: any) => ["cancelado", "rechazado"].includes(String(rq.estado || "")))
        if (duplicadosHistoricos.length > 0 && !confirm("Existen RQ cancelados/rechazados para algunos ítems. Se conservarán como historial. ¿Deseas continuar?")) {
          setGuardandoPreCuadre(false)
          return
        }
      }

      console.info("Generando RQs desde Proyecto 360", {
        proyecto_id: id,
        proyecto_codigo: proyecto?.codigo,
        total_items: rqsAInsertar.length,
        solicitado_por: perfil?.id || null,
        items: rqsAInsertar.map(rq => ({
          descripcion: rq.descripcion,
          proveedor_id: rq.proveedor_id,
          proveedor_nombre: rq.proveedor_nombre,
          monto_solicitado: rq.monto_solicitado,
        })),
      })
      const { data: rqsCreados, error: rqError } = await supabase
        .from("requerimientos_pago")
        .insert(rqsAInsertar)
        .select("id,proyecto_id,codigo_rq,numero_rq,proveedor_id,proveedor_nombre,descripcion,solicitado_por")
      if (rqError) {
        console.error("Error creando RQs:", {
          proyecto_id: id,
          proyecto_codigo: proyecto?.codigo,
          solicitado_por: perfil?.id || null,
          error: rqError,
          items: rqsAInsertar,
        })
        alert(mensajeErrorRQ(rqError))
        setGuardandoPreCuadre(false)
        return
      }
      const rqsSinCodigo = (rqsCreados || []).filter((rq: any) => !rq.codigo_rq && !rq.numero_rq)
      if ((rqsCreados || []).length !== rqsAInsertar.length || rqsSinCodigo.length > 0) {
        console.error("RQs creados con respuesta incompleta", {
          esperados: rqsAInsertar.length,
          recibidos: rqsCreados?.length || 0,
          rqs_sin_codigo: rqsSinCodigo,
          rqs_creados: rqsCreados,
        })
        alert("Los RQs fueron creados, pero la respuesta de Supabase no confirmo todos los codigos RQ. Refresca y verifica el listado antes de continuar.")
        setGuardandoPreCuadre(false)
        return
      }
      console.info("RQs creados desde Proyecto 360", {
        proyecto_id: id,
        proyecto_codigo: proyecto?.codigo,
        total_creados: rqsCreados?.length || 0,
        solicitado_por: perfil?.id || null,
        codigos: (rqsCreados || []).map((rq: any) => rq.codigo_rq || rq.numero_rq),
        rqs: rqsCreados,
      })
    }
    if (!esAdicional) {
      const { error: proyectoError } = await supabase.from("proyectos").update({ cotizacion_aprobada_id: versionAprobar, estado: "en_curso" }).eq("id", id)
      if (proyectoError) {
        alert("Los RQs fueron creados, pero no se pudo actualizar el proyecto a En curso: " + proyectoError.message)
        setGuardandoPreCuadre(false)
        return
      }
    }
    if (!esAdicional) {
      await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Estado cambiado a: en_curso" })
      await notificarATodos({
        titulo: `Proyecto ${proyecto?.codigo} — En curso`,
        mensaje: `${proyecto?.nombre} inició ejecución. RQs generados.`,
        tipo: "success",
        enlace: `/proyectos/${id}`,
        perfiles: ["superadmin","gerente_general","gerente_produccion","controller"]
      })
      setProyecto({ ...proyecto, estado: "en_curso" })
    }
    setShowPreCuadre(false)
    setGuardandoPreCuadre(false)
    load()
  }
  async function rechazar() {
    if (!puedeAccionProyecto("rechazar")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }

    const rechazarBusinessRuleResult = businessRuleEngine.allow("proyectos", "rechazar", {
      record: proyecto,
    })

    if (!rechazarBusinessRuleResult.allowed) {
      alert(rechazarBusinessRuleResult.reason || "La acción no cumple las reglas de negocio.")
      return
    }

    if (!confirm("¿Rechazar este proyecto?")) return
    setCambiando(true)
    const { error } = await supabase
      .from("proyectos")
      .update({ estado: "rechazado" })
      .eq("id", id)

    if (error) {
      console.error("ERROR RECHAZANDO PROYECTO", error)
      alert(error.message)
      setCambiando(false)
      return
    }
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto rechazado", datos_nuevos: { estado: "rechazado" } })
    setProyecto({ ...proyecto, estado: "rechazado" })
    setCambiando(false)
  }

  async function cambiarEntidad(entidad: string) {
    if (!puedeAccionProyecto("editar")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    await supabase.from("proyectos").update({ entidad }).eq("id", id)
    setProyecto({ ...proyecto, entidad })
    setEditandoEntidad(false)
  }

  async function eliminarVersion(cotId: string, version: number) {
    const cot = cotizaciones.find((c: any) => c.id === cotId)
    if (!puedeAccionProforma("eliminar", cot)) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    if (!confirm(`¿Eliminar cotización V${version}? Podrás recuperarla en los próximos 2 días.`)) return
    await supabase.from("cotizaciones").update({ deleted_at: new Date().toISOString() }).eq("id", cotId)
    load()
  }

  async function recuperarVersion(cotId: string) {
    const cot = cotizacionesEliminadas.find((c: any) => c.id === cotId)
    if (!puedeAccionProforma("editar", cot)) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    await supabase.from("cotizaciones").update({ deleted_at: null }).eq("id", cotId)
    load()
  }

  async function copiarItemsABiblioteca(cotizacion: any, itemsPersistidos: any[]) {
    const candidatos = itemsPersistidos.filter(item =>
      item.id &&
      item.tipo !== "familia" &&
      item.tipo !== "celda_extra" &&
      item.descripcion?.trim()
    )
    if (candidatos.length === 0) return

    const itemIds = candidatos.map(item => item.id)
    const { data: existentes } = await supabase
      .from("items_biblioteca")
      .select("origen_cotizacion_item_id")
      .eq("origen_cotizacion_id", cotizacion.id)
      .in("origen_cotizacion_item_id", itemIds)

    const yaImportados = new Set((existentes || []).map((item: any) => String(item.origen_cotizacion_item_id)))
    const nuevos = candidatos.filter(item => !yaImportados.has(String(item.id)))
    if (nuevos.length === 0) return

    const registros = nuevos.map(item => ({
      descripcion: item.descripcion,
      categoria: item.categoria || "Cotización",
      notas: item.notas || null,
      centro_costos: item.centro_costos || null,
      margen_pct: Number(item.margen_pct) || 0,
      precio_cliente_manual: item.precio_cliente_manual !== null && item.precio_cliente_manual !== "" ? Number(item.precio_cliente_manual) : null,
      proveedor_id: item.proveedor_id || null,
      proveedor_nombre: item.proveedor_nombre || null,
      costo_almacenaje: Number(item.costo_almacenaje) || 0,
      costo_impresion: Number(item.costo_impresion) || 0,
      costo_permisos: Number(item.costo_permisos) || 0,
      costo_instalacion: Number(item.costo_instalacion) || 0,
      costo_performer: Number(item.costo_performer) || 0,
      costo_alquiler: Number(item.costo_alquiler) || 0,
      costo_supervision: Number(item.costo_supervision) || 0,
      costo_movilidad: Number(item.costo_movilidad) || 0,
      costo_total: Number(item.costo_total) || 0,
      precio_cliente: Number(item.precio_cliente) || 0,
      activo: true,
      origen_proyecto_id: id,
      origen_proyecto_nombre: proyecto?.nombre || null,
      origen_proyecto_codigo: proyecto?.codigo || null,
      origen_cotizacion_id: cotizacion.id,
      origen_cotizacion_item_id: item.id,
      origen_cotizacion_version: cotizacion.version || null,
      origen_fecha: new Date().toISOString(),
      origen_usuario_id: perfil?.id || null,
    }))

    const { error } = await supabase.from("items_biblioteca").insert(registros)
    if (error) console.error("Error copiando items a biblioteca:", error)
  }

  async function nuevaVersion(copiarDeId?: string) {
    if (!puedeAccionProforma("crear")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    setCreando(true)
    const { data: todasCots } = await supabase.from("cotizaciones").select("version").eq("proyecto_id", id)
const ultimaVersion = todasCots && todasCots.length > 0 ? Math.max(...todasCots.map((c: any) => c.version || 1)) : 0
    let condicion = "50% adelanto / 50% contra entrega"
    let validez = 10, fee_pct = 10, fee_activo = true, igv_pct = 18
    let itemsACopiar: any[] = []
    if (copiarDeId) {
      const cot = cotizaciones.find((c: any) => c.id === copiarDeId)
      if (cot) {
        condicion = cot.condicion_pago || condicion
        validez = cot.validez_dias || validez
        fee_pct = cot.fee_agencia_pct || fee_pct
        fee_activo = cot.fee_activo !== false
        igv_pct = cot.igv_pct || igv_pct
      }
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", copiarDeId).order("orden")
      itemsACopiar = its || []
    }
    const { data: nueva } = await supabase.from("cotizaciones").insert({
      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",
      condicion_pago: condicion, validez_dias: validez,
      fee_agencia_pct: fee_pct, fee_activo, igv_pct, total_cliente: 0, margen_pct: 0,
    }).select().single()
    if (nueva && itemsACopiar.length > 0) {
      const copias = itemsACopiar.map(({ id: itemOriginalId, cotizacion_id: _cid, rq_generado_id: _rqid, estado_rq: _estadoRq, ...rest }: any) => ({ ...rest, cotizacion_id: nueva.id, origen_item_id: rest.origen_item_id || itemOriginalId, estado_rq: "pendiente", rq_generado_id: null }))
      const { data: insertados } = await supabase.from("cotizacion_items").insert(copias).select()
      await copiarItemsABiblioteca(nueva, insertados || [])
    }
    setCreando(false)
    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)
  }

  async function abrirPreCuadreDesdeItem(item: any) {
    if (!puedeAccionRQ("crear")) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    if (!item?.id) return
    const { data: provs } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre")
    setProveedores(provs || [])
    setPreCuadreItems([{
      ...item,
      costo_final: item.costo_total || item.costo_unitario || 0,
      proveedor_id: item.proveedor_id || null,
      proveedor_nombre: item.proveedor_nombre || "",
      tipo: item.tipo || "item",
      esNuevo: false,
      esAdicional: false,
      desdePresupuesto: true,
      tipo_pago: item.tipo_pago || "contado",
      tratamiento_igv: item.tratamiento_igv || tratamientoIgvDefaultProyecto,
    }])
    setShowPreCuadre(true)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const estadoInfo = FLUJO[proyecto?.estado] || { label: proyecto?.estado, bg: "#f3f4f6", color: "#6b7280" }
  const tieneCotizacion = cotizaciones.length > 0
  const esEstadoFinal = ["cerrado_financiero", "cancelado", "rechazado"].includes(proyecto?.estado)
  const puedeAvanzar = Boolean(estadoInfo.siguiente) && puedeAccionProyecto(accionParaCambioEstado(proyecto?.estado)) && !esEstadoFinal
  const puedeRechazar = puedeAccionProyecto("rechazar") && !esEstadoFinal
  const puedeEditar = puedeAccionProyecto("editar")
  const puedeCambiarProductor = puedeAccionProyecto("cambiar_productor")
  const puedeAprobarCliente = puedeAccionProforma("aprobar_cliente") && puedeAccionProyecto("aprobar_cliente")
  const puedeCrearProforma = puedeAccionProforma("crear")
  const puedeEditarProforma = puedeAccionProforma("editar")
  const puedeEliminarProforma = puedeAccionProforma("eliminar")
  const puedeCrearRQ = puedeAccionRQ("crear")
  const puedeVerFacturacionProyecto = puedeAccionProyecto("ver_facturacion") && puedeVerInformacionSensible(perfil, "facturas")
  const puedeExportarProyecto = puedeAccionProyecto("exportar")
  const puedeReabrirProyecto = puedeAccionProyecto("reabrir")
  const cotAprobada = cotizaciones.find(c => c.estado === "aprobada_cliente") || cotizaciones.find(c => c.id === proyecto?.cotizacion_aprobada_id)
  const entidadLabel = ENTIDADES.find(e => e.value === proyecto?.entidad)?.label || proyecto?.entidad || "Sin entidad"
  const tratamientoIgvDefaultProyecto = proyecto?.entidad === "selva" ? "no_aplica" : "incluye_igv"
  const productorNombre = proyecto?.productor ? `${proyecto.productor.nombre} ${proyecto.productor.apellido}` : "Sin productor"
  const montoAprobado = cotAprobada?.total_cliente || 0
  const clienteProyecto = proyecto?.cliente || {}
  const clienteId = proyecto?.cliente_id
  const clienteNombre = clienteProyecto.razon_social || "Sin cliente"
  const clienteContacto = clienteProyecto.nombre_contacto || "Sin contacto principal"
  const clienteEmail = clienteProyecto.email_contacto || "Sin correo"
  const clienteTelefono = clienteProyecto.telefono_contacto || "Sin telefono"
  const rqsActivos = rqsProyecto.filter(rq => !["rechazado", "cancelado", "cerrado"].includes(rq.estado))
  const rqsPendientes = rqsProyecto.filter(rq => ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "programado"].includes(rq.estado))
  const rqsPagados = rqsProyecto.filter(rq => rq.estado === "pagado")
  const totalRqs = rqsActivos.reduce((sum, rq) => sum + rqIgvDetalle(rq).total, 0)
  const totalRqsPendientes = rqsPendientes.reduce((sum, rq) => sum + rqIgvDetalle(rq).total, 0)
  const rqsPresupuesto = rqsProyecto.filter((rq: any) => !rq.es_adicional)
  const rqsPresupuestoActivos = rqsPresupuesto.filter((rq: any) => !["cancelado", "rechazado", "cerrado"].includes(rq.estado))
  const rqsPresupuestoCancelados = rqsPresupuesto.filter((rq: any) => rq.estado === "cancelado")
  const rqsAdicionales = rqsProyecto.filter((rq: any) => rq.es_adicional)
  const pendientesRQ = itemsCotizadosPresupuesto.filter((item: any) =>
    !rqsPresupuestoActivos.some((rq: any) => rq.cotizacion_item_id === item.id)
  )
  const porcentajeEjecucion = itemsCotizadosPresupuesto.length
    ? Math.round((rqsPresupuestoActivos.length / itemsCotizadosPresupuesto.length) * 100)
    : 0
  const rqsPorItem = new Map<string, any[]>()
  rqsProyecto
    .filter((rq: any) => rq.cotizacion_item_id && !rq.es_adicional)
    .forEach((rq: any) => {
      const key = String(rq.cotizacion_item_id)
      if (!rqsPorItem.has(key)) rqsPorItem.set(key, [])
      rqsPorItem.get(key)?.push(rq)
    })

  const filasRqsProyecto = itemsCotizadosPresupuesto.map((item: any) => {
    const relacionados = rqsPorItem.get(String(item.id)) || []
    const activo = relacionados.find((rq: any) => !["cancelado", "rechazado", "cerrado"].includes(rq.estado))
    const cancelado = relacionados.find((rq: any) => rq.estado === "cancelado")
    const rq = activo || cancelado || null
    const estadoVista = activo ? "generado" : cancelado ? "cancelado" : "pendiente"

    return {
      key: "item-" + item.id,
      origen: "cotizacion",
      estadoVista,
      item,
      rq,
      descripcion: item.descripcion || rq?.descripcion || "Sin descripción",
      proveedor: rq?.proveedor_nombre || item.proveedor_nombre || "—",
      fecha: rq?.created_at || null,
      montoPresupuestado: Number(item.costo_total || item.costo_unitario || rq?.monto_presupuestado || 0),
      montoFinal: Number(rq?.monto_solicitado || item.costo_total || item.costo_unitario || 0),
      legacy: false,
    }
  })

  const idsRqsRepresentados = new Set(
    filasRqsProyecto
      .map((fila: any) => fila.rq?.id)
      .filter(Boolean)
  )

  const filasRqsNoRepresentados = rqsProyecto
    .filter((rq: any) => !idsRqsRepresentados.has(rq.id))
    .map((rq: any) => ({
      key: "rq-" + rq.id,
      origen: rq.es_adicional ? "adicional" : "cotizacion",
      estadoVista: rq.es_adicional ? "adicional" : rq.estado === "cancelado" ? "cancelado" : "generado",
      item: null,
      rq,
      descripcion: rq.descripcion || "Sin descripción",
      proveedor: rq.proveedor_nombre || "—",
      fecha: rq.created_at || null,
      montoPresupuestado: Number(rq.monto_presupuestado || 0),
      montoFinal: Number(rqIgvDetalle(rq).total || rq.monto_solicitado || 0),
      legacy: !rq.es_adicional && !rq.cotizacion_item_id,
    }))

  const filasEjecucionRqs = [...filasRqsProyecto, ...filasRqsNoRepresentados]

  const rqsProcesadosPorMigracion = new Set(
    logsMigracionRQ
      .filter((log: any) =>
        log.rq_id &&
        RQ_MIGRATION_SUCCESS_ACTIONS.includes(String(log.accion || "").toUpperCase())
      )
      .map((log: any) => String(log.rq_id))
  )

  const rqsVersionAnterior = rqsProyecto.filter((rq: any) =>
    rq.cotizacion_item_id &&
    !rq.es_adicional &&
    !["cancelado", "rechazado", "cerrado"].includes(String(rq.estado || "")) &&
    !rqsProcesadosPorMigracion.has(String(rq.id)) &&
    !itemsCotizadosPresupuesto.some((i: any) => String(i.id) === String(rq.cotizacion_item_id))
  )

  const requiereMigracionRQ = rqsVersionAnterior.length > 0
  const resumenAlertas = [
    !tieneCotizacion ? { label: "Sin cotización", detalle: "Crea una cotización para continuar el flujo comercial." } : null,
    tieneCotizacion && !cotAprobada ? { label: "Sin versión aprobada", detalle: "Aún no hay una versión aprobada por cliente." } : null,
    ["aprobado", "aprobado_cliente"].includes(proyecto?.estado) && cotAprobada ? { label: "Pendiente de RQ", detalle: "Al iniciar el proyecto se mantiene el flujo actual de pre-cuadre y generación de RQs." } : null,
    proyecto?.estado === "terminado" ? { label: "Pendiente de liquidación", detalle: "El proyecto está terminado y debe pasar por liquidación." } : null,
  ].filter(Boolean) as any[]

  const ecCotTone: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
    borrador: "warning",
    enviada_cliente: "info",
    pendiente: "neutral",
    aprobada_cliente: "success",
    rechazada: "danger",
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }
  const historialCount = Object.values(historial).reduce((total, items) => total + items.length, 0)
  // Conteos por pestana de primer nivel (Lote 1). Mismos valores que antes mostraba
  // tabsProyecto360 por ancla; "seguimiento" agrupa Tareas/Logistica/Facturacion/
  // Liquidacion/Archivos/Historial y no tiene un conteo unico real, se deja sin badge.
  const tabCounts: Partial<Record<ProjectDetailTabId, number>> = {
    cotizaciones: cotizaciones.length,
    "costos-rq": rqsProyecto.length,
    cliente: proyecto?.cliente ? 1 : 0,
  }
  const placeholderStyle = { padding: 16, border: "1px dashed #d1d5db", borderRadius: 10, background: "#fafafa", color: "#6b7280", fontSize: 13 }

  if (loading) {
    return <V2DetailPageTemplate state="loading" title="Cargando proyecto..." />
  }
  if (accesoRestringido) {
    return (
      <V2DetailPageTemplate
        errorState={<V2ErrorState description="No tienes permiso para ver este proyecto." errorCode="403-PROYECTO" title="Acceso restringido" />}
        state="error"
        title="Proyecto"
      />
    )
  }

  return (
    <div>
      {showMigracionRQ && comparacionPendiente && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 980, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Migración de RQs por cambio de versión</h2>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  Revisa los RQs afectados antes de aprobar V{cotizacionPendienteAprobar?.version}.
                </p>
              </div>
              <button onClick={() => { setShowMigracionRQ(false); setComparacionPendiente(null); setCotizacionPendienteAprobar(null) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>

            {(() => {
              const rqsImpacto = comparacionPendiente.rqsAfectados || []
              const montoV1Total = rqsImpacto.reduce((sum: number, rq: any) => sum + Number(rq.montoV1 || 0), 0)
              const montoV2Total = rqsImpacto.reduce((sum: number, rq: any) => sum + Number(rq.itemNuevo ? rq.montoV2 || 0 : 0), 0)
              const impactoNeto = montoV2Total - montoV1Total
              const rqsDiferencia = rqsImpacto.filter((rq: any) => rq.itemNuevo && Number(rq.diferencia || 0) > 0.01).length
              const rqsCancelar = rqsImpacto.filter((rq: any) => !rq.itemNuevo && rq.estado !== "pagado").length
              const reembolsos = rqsImpacto.filter((rq: any) => rq.estado === "pagado" && Number(rq.diferencia || 0) < -0.01).length
              const impactoColor = Math.abs(impactoNeto) < 0.01 ? "#6b7280" : impactoNeto > 0 ? "#dc2626" : "#15803d"

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 12 }}>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Versión anterior</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>V{comparacionPendiente.cotAnterior?.version}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#f0fdf4" }}>
                      <div style={{ fontSize: 10, color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Nueva versión</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>V{comparacionPendiente.cotNueva?.version}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Modificados</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#92400e" }}>{comparacionPendiente.modificados?.length || 0}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Eliminados</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{comparacionPendiente.eliminados?.length || 0}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>RQs afectados</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0F6E56" }}>{rqsImpacto.length}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Monto V1</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{fmt(montoV1Total)}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Monto V2</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{fmt(montoV2Total)}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Variación</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: impactoColor }}>{impactoNeto > 0 ? "+" : ""}{fmt(impactoNeto)}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>RQ diferencia</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#dc2626" }}>{rqsDiferencia}</div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Ajustes/reembolsos</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#92400e" }}>{rqsCancelar + reembolsos}</div>
                    </div>
                  </div>
                </>
              )
            })()}

            <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Revisión requerida</div>
              <div style={{ fontSize: 12, color: "#92400e" }}>
                Al continuar, el sistema ejecutará la migración: actualizará referencias, cancelará RQs no vigentes, generará RQs por diferencia y dejará trazabilidad completa.
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#1D2040" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>RQ</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Item V1</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Item V2</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Monto V1</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Monto V2</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>Variación</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>Acción sugerida</th>
                </tr>
              </thead>
              <tbody>
                {(comparacionPendiente.rqsAfectados || []).map((rq: any, idx: number) => {
                  const estadoRq = ESTADOS_RQ[rq.estado] || { bg: "#f3f4f6", color: "#6b7280", label: rq.estado || "Sin estado" }
                  const diferencia = Number(rq.diferencia || 0)
                  const diffColor = Math.abs(diferencia) < 0.01 ? "#6b7280" : diferencia > 0 ? "#dc2626" : "#15803d"
                  return (
                    <tr key={rq.id} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 800, color: "#0F6E56", whiteSpace: "nowrap" }}>{rqCodigo(rq)}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ background: estadoRq.bg, color: estadoRq.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{estadoRq.label}</span>
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#374151", maxWidth: 180 }}>{rq.itemAnterior?.descripcion || rq.descripcion || "—"}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: rq.itemNuevo ? "#374151" : "#dc2626", maxWidth: 180 }}>{rq.itemNuevo?.descripcion || "Item eliminado en V2"}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{fmt(rq.montoV1 || 0)}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 12, fontWeight: 700, color: rq.itemNuevo ? "#111827" : "#dc2626", whiteSpace: "nowrap" }}>{rq.itemNuevo ? fmt(rq.montoV2 || 0) : "—"}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 12, fontWeight: 800, color: diffColor, whiteSpace: "nowrap" }}>
                        {rq.itemNuevo ? (diferencia > 0 ? "+" : "") + fmt(diferencia) : "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: rq.estado === "pagado" ? "#92400e" : "#0F6E56", fontWeight: 700 }}>{rq.accionSugerida}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <V2Button onClick={() => { setShowMigracionRQ(false); setComparacionPendiente(null); setCotizacionPendienteAprobar(null) }} variant="secondary">Cancelar</V2Button>
              <V2Button onClick={() => {
                setShowMigracionRQ(false)
                if (cotizacionPendienteAprobar) {
                  const pendiente = cotizacionPendienteAprobar
                  setComparacionPendiente(null)
                  setCotizacionPendienteAprobar(null)
                  ejecutarMigracionRQVersion(comparacionPendiente, pendiente)
                }
              }} variant="primary">
                Continuar aprobación
              </V2Button>
            </div>
          </div>
        </div>
      )}
      {showPreCuadre && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Pre-cuadre de costos</h2>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Confirma o ajusta los costos finales antes de generar los RQs</p>
              </div>
              <button onClick={() => setShowPreCuadre(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#1D2040" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", minWidth: 180 }}>Descripción</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 130 }}>Costo Presup.</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#03E373", width: 130 }}>Costo Final</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 200 }}>Proveedor</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 130 }}>IGV</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 120 }}>Tipo pago</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {preCuadreItems.map((item: any, idx: number) => {
                  if (item.tipo === "familia") return (
                    <tr key={item.id} style={{ background: "#1D2040" }}>
                      <td colSpan={6} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#03E373" }}>{item.descripcion}</td>
                    </tr>
                  )
                  const diff = (item.costo_final || 0) - (item.costo_total || 0)
                  if (item._borrado) return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: "#fff5f5", opacity: 0.6 }}>
                      <td colSpan={6} style={{ padding: "8px 12px", fontSize: 12, color: "#dc2626", textDecoration: "line-through" }}>{item.descripcion || "Sin descripción"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <button onClick={() => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, _borrado: false } : i))}
                          style={{ fontSize: 11, color: "#0F6E56", background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                          ↩ Deshacer
                        </button>
                      </td>
                    </tr>
                  )
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "8px 12px" }}>
                        {item.esNuevo ? (
                          <input style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%" }}
                            value={item.descripcion || ""} placeholder="Descripción del item..."
                            onChange={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, descripcion: e.target.value } : i))} />
                        ) : (
                          <span style={{ fontSize: 13, color: "#374151" }}>{item.descripcion || "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>
                        S/ {Number(item.costo_total || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          {diff !== 0 && <span style={{ fontSize: 11, color: diff > 0 ? "#dc2626" : "#15803d", fontWeight: 600 }}>{diff > 0 ? "+" : ""}{Number(diff).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>}
                          <input type="number" value={item.costo_final} onChange={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, costo_final: e.target.value } : i))}
                            onBlur={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, costo_final: parseFloat(e.target.value) || 0 } : i))}
                            style={{ padding: "4px 8px", border: "1px solid " + (diff !== 0 ? (diff > 0 ? "#fca5a5" : "#86efac") : "#e5e7eb"), borderRadius: 6, fontSize: 13, width: 100, textAlign: "right", fontFamily: "inherit" }} />
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <select value={item.proveedor_id || ""} onChange={e => {
                          const prov = proveedores.find((p: any) => p.id === e.target.value)
                          setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, proveedor_id: e.target.value || null, proveedor_nombre: prov?.nombre || "" } : i))
                        }} style={{ padding: "4px 8px", border: "1px solid " + (!item.proveedor_id ? "#fca5a5" : "#e5e7eb"), borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", background: !item.proveedor_id ? "#fff5f5" : "#fff" }}>
                          <option value="">⚠ Sin proveedor</option>
                          {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <select value={item.tratamiento_igv || tratamientoIgvDefaultProyecto} onChange={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, tratamiento_igv: e.target.value } : i))}
                          style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", background: "#fff" }}>
                          <option value="incluye_igv">Incluye IGV</option>
                          <option value="mas_igv">Más IGV</option>
                          <option value="no_aplica">No aplica</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <select value={item.tipo_pago || "contado"} onChange={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, tipo_pago: e.target.value } : i))}
                            style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%" }}>
                            <option value="contado">Contado</option>
                            <option value="adelanto">Adelanto</option>
                            <option value="credito">Crédito</option>
                          </select>
                          <input type="number" min={1} placeholder="Días pago"
                            value={item.dias_credito || ""}
                            onChange={e => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, dias_credito: Number(e.target.value) } : i))}
                            style={{ padding: "4px 8px", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%" }} />
                        </div>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button onClick={() => {
                            const mitad = Math.round((item.costo_final || 0) / 2 * 100) / 100
                            const id1 = "div_" + Date.now() + "_1"
                            const id2 = "div_" + Date.now() + "_2"
                            setPreCuadreItems(prev => {
                              const idx = prev.findIndex((i: any) => i.id === item.id)
                              const nuevos = [
                                { ...item, id: id1, descripcion: item.descripcion + " (50% adelanto)", costo_final: mitad, tipo_pago: "adelanto", _esPadre: false },
                                { ...item, id: id2, descripcion: item.descripcion + " (50% saldo)", costo_final: item.costo_final - mitad, tipo_pago: "contado", _esPadre: false },
                              ]
                              return [...prev.slice(0, idx), ...nuevos, ...prev.slice(idx + 1)]
                            })
                          }} style={{ background: "none", border: "1px dashed #3b82f6", borderRadius: 4, cursor: "pointer", color: "#3b82f6", fontSize: 10, padding: "2px 6px", whiteSpace: "nowrap" }}>÷ Dividir</button>
                          <button onClick={() => setPreCuadreItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, _borrado: true } : i))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 16 }}>×</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button onClick={() => setPreCuadreItems(prev => [...prev, { id: "new_pc_" + Date.now(), descripcion: "", costo_total: 0, costo_final: 0, proveedor_id: null, proveedor_nombre: "", tipo: "item", esNuevo: true, tratamiento_igv: tratamientoIgvDefaultProyecto }])}
              style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "6px 16px", fontSize: 12, color: "#6b7280", cursor: "pointer", marginBottom: 20 }}>
              + Agregar item imprevisto
            </button>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <V2Button onClick={() => setShowPreCuadre(false)} variant="secondary">Cancelar</V2Button>
              <V2Button loading={guardandoPreCuadre} onClick={confirmarPreCuadre} variant="primary">
                {guardandoPreCuadre ? "Generando RQs..." : "Confirmar y generar RQs"}
              </V2Button>
            </div>
          </div>
        </div>
      )}
      <ProjectDetailShellV2
        activeTab={activeTab}
        header={
          <ProjectDetailHeaderV2
            cotAprobada={cotAprobada}
            editandoEntidad={editandoEntidad}
            entidades={ENTIDADES}
            estadoLabel={estadoInfo.label}
            onAbrirEditar={abrirEditar}
            onCambiarEntidad={cambiarEntidad}
            onToggleEditarEntidad={setEditandoEntidad}
            proyecto={proyecto}
            puedeEditar={puedeEditar}
            puedeExportarProyecto={puedeExportarProyecto}
            reportePdfHref={"/api/reporte-pdf?proyecto_id=" + id}
          />
        }
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
        actionsBar={
          <ProjectActionToolbarV2
            primary={puedeCrearProforma ? {
              key: "crear-cotizacion",
              label: creando ? "Creando..." : "Crear cotización",
              icon: <FilePlus2 size={15} />,
              loading: creando,
              onClick: () => {
                const sel = cotizaciones.length > 0 ? document.getElementById("copiar-version") as HTMLSelectElement : null
                const val = sel?.value
                nuevaVersion(val && val !== "" ? val : undefined)
              },
            } : undefined}
            secondary={([
              puedeCrearRQ ? { key: "crear-rq", label: "Crear RQ", icon: <FileText size={15} />, onClick: () => router.push(`/rq?proyecto_id=${id}`) } : null,
              { key: "crear-tarea", label: "Crear tarea", icon: <ClipboardList size={15} />, onClick: () => router.push(`/tareas?proyecto_id=${id}`) },
              { key: "solicitar-audiovisual", label: "Solicitar audiovisual", icon: <Video size={15} />, onClick: () => router.push(`/audiovisual/requerimientos?proyecto_id=${id}`) },
              puedeVerFacturacionProyecto ? { key: "emitir-factura", label: "Emitir factura", icon: <Receipt size={15} />, onClick: () => router.push(`/facturacion?proyecto_id=${id}`) } : null,
              { key: "ver-liquidacion", label: "Ver liquidación", icon: <FileCheck2 size={15} />, onClick: () => router.push(`/liquidaciones?proyecto_id=${id}`) },
              puedeExportarProyecto ? { key: "ver-documentos", label: "Ver documentos", icon: <FolderOpen size={15} />, href: "/api/reporte-pdf?proyecto_id=" + id } : null,
            ].filter(Boolean)) as ProjectToolbarAction[]}
          />
        }
      >
      <section id="estado-proyecto" style={{ scrollMarginTop: 120 }}>
        <ProjectWorkflowCardV2
          estadoLabel={estadoInfo.label}
          estadoTone={estadoTone(proyecto?.estado)}
          steps={FLUJO_BREADCRUMB.map((estado, idx) => {
            const info = FLUJO[estado]
            const idxActual = FLUJO_BREADCRUMB.indexOf(proyecto?.estado)
            const completado = idx <= idxActual
            const actual = estado === proyecto?.estado
            const clickable = Boolean(puedeReabrirProyecto) && !actual && idx < idxActual
            return {
              key: estado,
              index: idx,
              label: info.label,
              color: info.color,
              completed: completado,
              current: actual,
              clickable,
              onClick: clickable ? async () => {
                const { data: rqsPendientes } = await supabase.from("requerimientos_pago").select("id, estado").eq("proyecto_id", id).in("estado", ["pendiente_aprobacion","aprobado_produccion"])
                const nRqs = rqsPendientes?.length || 0
                const msgRqs = nRqs > 0 ? `\n\nSe cancelarán ${nRqs} RQ(s) pendientes automáticamente.` : ""
                if (confirm(`¿Regresar el proyecto al estado "${info.label}"?${msgRqs}`)) {
                  if (nRqs > 0) {
                    await supabase.from("requerimientos_pago").update({ estado: "rechazado" }).eq("proyecto_id", id).in("estado", ["pendiente_aprobacion","aprobado_produccion"])
                  }
                  cambiarEstado(estado)
                }
              } : undefined,
            } as ProjectWorkflowStep
          })}
          nextActionTitle={proyecto?.estado === "aprobado_gerencia" ? "Aprobación desde cotización" : puedeAvanzar && estadoInfo.accion ? estadoInfo.accion : esEstadoFinal ? "Sin acciones pendientes" : "Sin acción disponible"}
          nextActionDescription={
            proyecto?.estado === "aprobado_gerencia"
              ? "Esperando aprobación del cliente desde la cotización."
              : proyecto?.estado === "aprobado_cliente"
                ? "Abre el pre-cuadre para revisar proveedores, costos y generar los RQs iniciales."
                : estadoInfo.accion
                  ? "Avanza el proyecto al siguiente estado del flujo."
                  : esEstadoFinal
                    ? "El proyecto no tiene acciones pendientes."
                    : "No hay acción disponible para tu rol."
          }
          responsibleText={(() => {
            const roles = estadoInfo.roles || []
            const rolLabels: Record<string, string> = {
              superadmin: "Superadmin",
              gerente_general: "Gerente General",
              gerente_produccion: "Gerente de Producción",
              controller: "Controller",
              productor: "Productor",
              comercial: "Comercial",
              logistica: "Logística",
              audiovisual: "Audiovisual",
              administrador: "Administrador",
            }
            const rolResponsable = proyecto?.estado === "aprobado_cliente" && roles.includes("productor")
              ? "productor"
              : roles.find((rol: string) => rol !== "superadmin") || roles[0]
            const nombreResponsable = rolResponsable === "productor" && proyecto?.productor
              ? `${proyecto.productor.nombre} ${proyecto.productor.apellido}`.trim()
              : ""
            return rolResponsable
              ? `Responsable del siguiente paso: ${rolLabels[rolResponsable] || rolResponsable}${nombreResponsable ? ` (${nombreResponsable})` : ""}`
              : "Responsable del siguiente paso: Sin responsable asignado"
          })()}
          primaryAction={puedeAvanzar && estadoInfo.siguiente ? {
            label: estadoInfo.accion,
            loading: cambiando,
            onClick: () => cambiarEstado(estadoInfo.siguiente),
          } : undefined}
          secondaryActions={([
            (() => {
              const cotObjetivo = cotizaciones.find((c: any) => c.id === versionAprobar)
              const puedeMostrar = puedeAprobarCliente && ["aprobado_gerencia", "aprobado_cliente"].includes(proyecto?.estado) && cotObjetivo && cotObjetivo.estado !== "aprobada_cliente"
              return puedeMostrar ? {
                label: "Marcar aprobado por cliente",
                icon: <CheckCircle2 size={15} />,
                onClick: () => marcarCotizacionAprobadaCliente(cotObjetivo),
              } : null
            })(),
            proyecto?.estado === "pendiente_facturacion" ? {
              label: "Ir a Facturación",
              onClick: () => router.push(`/facturacion?proyecto_id=${id}`),
            } : null,
          ].filter(Boolean)) as any[]}
          dangerAction={puedeRechazar ? {
            label: "Rechazar proyecto",
            disabled: cambiando,
            onClick: rechazar,
          } : undefined}
        />
      </section>
      <ProjectDetailSection activeTab={activeTab} tab="cotizaciones">
      <section id="tab-proformas" style={{ scrollMarginTop: 120 }}>
      <div className="card" style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 4 }}>Tab Cotizaciones</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Cotizaciones</h2>
            <p style={{ fontSize: 13, color: "var(--v2-muted)", margin: "4px 0 0" }}>
              Administra versiones, estados, vistas previas y recuperación de cotizaciones del proyecto.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: "var(--v2-surface-muted)", color: "var(--v2-text-secondary)", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {cotizaciones.length} {cotizaciones.length === 1 ? "versión" : "versiones"}
            </span>
            {cotizacionesEliminadas.length > 0 && (
              <span style={{ background: "var(--v2-danger-bg)", color: "var(--v2-danger)", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                {cotizacionesEliminadas.length} recuperable{cotizacionesEliminadas.length !== 1 ? "s" : ""}
              </span>
            )}
            {cotizaciones.length > 0 && (
              <V2Select
                compact
                fullWidth={false}
                id="copiar-version"
                options={[
                  { label: "Nueva vacía", value: "" },
                  ...cotizaciones.map((cot: any) => ({ label: `Copiar V${cot.version}`, value: cot.id })),
                ]}
              />
            )}
            {puedeCrearProforma && (
            <V2Button loading={creando} onClick={() => {
              const sel = cotizaciones.length > 0 ? document.getElementById("copiar-version") as HTMLSelectElement : null
              const val = sel?.value
              nuevaVersion(val && val !== "" ? val : undefined)
            }} variant="primary">
              {creando ? "Creando..." : "Crear cotización"}
            </V2Button>
            )}
          </div>
        </div>
      </div>

      {cotizacionesEliminadas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowVersionesEliminadas(!showVersionesEliminadas)}
            style={{ fontSize: 12, color: "var(--v2-danger)", background: "var(--v2-danger-bg)", border: "none", borderRadius: 99, padding: "3px 10px", cursor: "pointer", marginBottom: 8 }}>
            🗑 {cotizacionesEliminadas.length} {cotizacionesEliminadas.length > 1 ? "versiones eliminadas" : "versión eliminada"} (recuperable{cotizacionesEliminadas.length > 1 ? "s" : ""})
          </button>
          {showVersionesEliminadas && (
            <div style={{ background: "var(--v2-danger-bg)", borderRadius: 10, padding: 12 }}>
              {cotizacionesEliminadas.map(cot => {
                const horasRestantes = 48 - Math.floor((Date.now() - new Date(cot.deleted_at).getTime()) / (1000 * 60 * 60))
                return (
                  <div key={cot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>V{cot.version}</span>
                      {cot.total_cliente > 0 && <span style={{ fontSize: 12, color: "var(--v2-muted)", marginLeft: 8 }}>{fmt(cot.total_cliente)}</span>}
                      <span style={{ fontSize: 11, color: "var(--v2-danger)", marginLeft: 8 }}>Expira en {horasRestantes}h</span>
                    </div>
                    <V2Button leadingIcon={<RotateCcw size={13} />} onClick={() => recuperarVersion(cot.id)} size="sm" variant="secondary">
                      Recuperar
                    </V2Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--v2-text)" }}>Versiones</h2>
          <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>{cotizaciones.length} {cotizaciones.length === 1 ? "versión" : "versiones"}</span>
        </div>
        {cotizaciones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--v2-muted)" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No hay cotizaciones aún</div>
            <div style={{ fontSize: 12 }}>Crea la primera versión para comenzar</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--v2-surface-muted)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>VERSIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)" }}>ESTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>TOTAL CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>MARGEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)" }}>CONDICIÓN DE PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>HISTORIAL</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((cot, idx) => {
                // Cada fila se resuelve unicamente con el dato real de esa cotizacion
                // (no con el estado general del proyecto ni con versionAprobar/cotizacion_aprobada_id,
                // que pueden desincronizarse del estado real de la version).
                const isClientApproved = cot.estado === "aprobada_cliente"
                return (
                  <tr style={{ background: isClientApproved ? "var(--v2-success-bg)" : idx % 2 === 0 ? "var(--v2-surface)" : "var(--v2-surface-soft)" }} key={cot.id}>
                    <td style={{ padding: "10px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--v2-text)" }}>V{cot.version}</span>
                        {isClientApproved && <V2StatusBadge size="sm" tone="success">Aprobada</V2StatusBadge>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                      <V2StatusSelect
                        onChange={async (ev) => {
                          const nuevoEstado = ev.target.value
                          if (nuevoEstado === "aprobada_cliente") {
                            alert("Usa la acción independiente para marcar aprobado por cliente")
                            return
                          }
                          await supabase.from("cotizaciones").update({ estado: nuevoEstado }).eq("id", cot.id)
                          load()
                        }}
                        options={[
                          { label: "Borrador", value: "borrador" },
                          { label: "Enviada", value: "enviada_cliente" },
                          { label: "Pendiente", value: "pendiente" },
                          ...(cot.estado === "aprobada_cliente" ? [{ label: "Aprobada", value: "aprobada_cliente" }] : []),
                          { label: "Rechazada", value: "rechazada" },
                        ]}
                        tone={ecCotTone[cot.estado] || "neutral"}
                        value={cot.estado || "borrador"}
                      />
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: 14, fontWeight: 700, color: "var(--v2-accent)" }}>
                      {cot.total_cliente > 0 ? fmt(cot.total_cliente) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: (cot.margen_pct || 0) >= 35 ? "var(--v2-accent)" : "var(--v2-muted)" }}>
                      {cot.margen_pct > 0 ? cot.margen_pct.toFixed(1) + "%" : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", verticalAlign: "middle", fontSize: 12, color: "var(--v2-muted)" }}>{cot.condicion_pago || "—"}</td>
                    <td style={{ padding: "10px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      {historial[cot.id] && historial[cot.id].length > 0 && (
                        <div style={{ display: "grid", gap: 2 }}>
                          {historial[cot.id].slice(0, 3).map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: 10, color: "var(--v2-subtle)", display: "flex", gap: 4, alignItems: "center" }}>
                              <span style={{ color: h.accion === "aprobada_cliente" ? "var(--v2-success)" : "var(--v2-muted)" }}>
                                {h.accion === "aprobada_cliente" ? "✓" : "✎"}
                              </span>
                              <span>{h.usuario_nombre}</span>
                              <span>·</span>
                              <span>{new Date(h.created_at).toLocaleDateString("es-PE")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", verticalAlign: "middle" }}>
                      <div className={styles.rowActions}>
                        {puedeEditarProforma && (
                          <V2Button leadingIcon={<Pencil size={13} />} onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}`)} size="sm" variant="secondary">
                            Editar
                          </V2Button>
                        )}
                        <V2Button leadingIcon={<Eye size={13} />} onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}/preview`)} size="sm" variant="secondary">
                          Vista previa
                        </V2Button>
                        {isClientApproved ? (
                          <V2Button disabled leadingIcon={<CheckCircle2 size={13} />} size="sm" variant="success">
                            Aprobado cliente
                          </V2Button>
                        ) : puedeAprobarCliente && ["aprobado_gerencia", "aprobado_cliente"].includes(proyecto?.estado) ? (
                          <V2Button leadingIcon={<CheckCircle2 size={13} />} onClick={() => marcarCotizacionAprobadaCliente(cot)} size="sm" variant="successSoft">
                            Aprobado cliente
                          </V2Button>
                        ) : null}
                        {!isClientApproved && puedeEliminarProforma && (
                          <V2Button leadingIcon={<Trash2 size={13} />} onClick={() => eliminarVersion(cot.id, cot.version)} size="sm" variant="danger">
                            Borrar
                          </V2Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      </section>
      </ProjectDetailSection>

      <ProjectDetailSection activeTab={activeTab} tab="costos-rq">
      <section id="tab-costos-rq" style={{ scrollMarginTop: 120 }}>
        <V2SectionHeader
          actions={
            <V2Button leadingIcon={<Receipt size={15} />} onClick={() => router.push(`/rq?proyecto_id=${id}`)} size="sm" variant="secondary">
              Ver módulo RQ
            </V2Button>
          }
          description="Ordena pre-cuadre, proveedores y RQs del proyecto sin cambiar la lógica actual."
          title="Costos y requerimientos de pago"
        />

        <div className={styles.metricsRow} style={{ marginTop: 16 }}>
          <V2MetricCard
            label="Versión aprobada"
            subtext={cotAprobada?.total_cliente ? fmt(cotAprobada.total_cliente) : "Se define desde Cotizaciones / aprobación"}
            value={cotAprobada ? `V${cotAprobada.version}` : "Pendiente"}
          />
          <V2MetricCard
            label="Pre-cuadre"
            subtext="Usa el flujo actual de proveedores y costos."
            value={proyecto?.estado === "en_curso" ? "Disponible" : "Según estado"}
          />
          <V2MetricCard
            label="RQs del proyecto"
            subtext={rqsProyecto.length ? `${fmt(totalRqs)} activos` : "Sin requerimientos vinculados"}
            value={rqsProyecto.length}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <V2AlertCard
            actionLabel={proyecto?.estado === "en_curso" && puedeCrearRQ ? "+ Generar RQs adicionales" : "No disponible"}
            message="Pre-cuadre y RQs adicionales: mantiene el flujo actual — selecciona proveedores, costos finales y genera requerimientos de pago adicionales."
            onClick={proyecto?.estado === "en_curso" && puedeCrearRQ ? async () => {
              const { data: provs } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre")
              setProveedores(provs || [])
              setPreCuadreItems([{ id: "new_pc_" + Date.now(), descripcion: "", costo_total: 0, costo_final: 0, proveedor_id: null, proveedor_nombre: "", tipo: "item", esNuevo: true, esAdicional: true, tipo_pago: "contado", tratamiento_igv: tratamientoIgvDefaultProyecto }])
              setShowPreCuadre(true)
            } : undefined}
            tipo="warning"
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <V2SectionHeader
            actions={
              <V2Button leadingIcon={<Receipt size={15} />} onClick={() => router.push(`/rq?proyecto_id=${id}`)} size="sm" variant="secondary">
                Ver en módulo RQ
              </V2Button>
            }
            description={`${rqsProyecto.length} RQs · ${rqsPendientes.length} pendientes · ${rqsPagados.length} pagados · ${fmt(totalRqsPendientes)} por gestionar`}
            title="Ejecución de RQs del proyecto"
          />

          {requiereMigracionRQ && cotAprobada && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 10,
                borderLeft: "3px solid var(--v2-warning)",
                background: "var(--v2-warning-bg)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--v2-warning)",
                    marginBottom: 4,
                  }}
                >
                  ⚠ Hay requerimientos asociados a una versión anterior.
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--v2-text-secondary)",
                  }}
                >
                  Se detectaron <b>{rqsVersionAnterior.length}</b> RQs que aún apuntan a una versión anterior de la cotización. Se recomienda ejecutar la migración antes de continuar.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={cotizacionDestinoMigracionId || proyecto?.cotizacion_aprobada_id || ""}
                  onChange={(e) => setCotizacionDestinoMigracionId(e.target.value)}
                  style={{ padding: "8px 10px", border: "1px solid var(--v2-border)", borderRadius: 8, fontSize: 13, background: "var(--v2-surface)", color: "var(--v2-text)" }}
                >
                  <option value="">Seleccionar versión destino</option>
                  {[...cotizaciones]
                    .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))
                    .map((cot: any) => (
                      <option key={cot.id} value={cot.id}>
                        V{cot.version} {cot.id === proyecto?.cotizacion_aprobada_id ? "(actual aprobada)" : ""}
                      </option>
                    ))}
                </select>

                <V2Button
                  onClick={async () => {
                    const destinoId =
                      cotizacionDestinoMigracionId ||
                      proyecto?.cotizacion_aprobada_id ||
                      cotizaciones.sort((a: any, b: any) => (b.version || 0) - (a.version || 0))[0]?.id

                    const cotizacionDestino = cotizaciones.find((cot: any) => cot.id === destinoId)

                    if (!cotizacionDestino) {
                      alert("Selecciona una versión destino para migrar los RQs.")
                      return
                    }

                    const comparacion = await compararRQsContraVersionDestino(cotizacionDestino)

                    if (!comparacion) {
                      alert("No fue posible calcular la migración hacia la versión seleccionada.")
                      return
                    }

                    setComparacionPendiente(comparacion)
                    setCotizacionPendienteAprobar(cotizacionDestino)
                    setShowMigracionRQ(true)
                  }}
                  size="sm"
                  variant="primary"
                >
                  Migrar RQs
                </V2Button>
              </div>
            </div>
          )}

          {rqsProyecto.length === 0 ? (
            <div style={{ marginTop: 16 }}>
              <V2EmptyState
                compact
                description="Este proyecto todavía no tiene requerimientos de pago vinculados."
                title="Sin requerimientos vinculados"
              />
            </div>
          ) : (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--v2-surface-muted)" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ORIGEN</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ESTADO</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ÍTEM DEL PRESUPUESTO</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>RQ</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>PROVEEDOR</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>FECHA SOLICITUD</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>PRESUP.</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>FINAL RQ</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>VARIACIÓN</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {filasEjecucionRqs.map((fila: any, idx: number) => {
                    const estilosEstadoRQ: Record<string, any> = {
                      generado: { dot: "var(--v2-success)", label: "Generado", color: "var(--v2-success)", bg: "var(--v2-success-bg)" },
                      pendiente: { dot: "var(--v2-warning)", label: "Pendiente", color: "var(--v2-warning)", bg: "var(--v2-warning-bg)" },
                      cancelado: { dot: "var(--v2-info)", label: "Cancelado", color: "var(--v2-info)", bg: "var(--v2-info-bg)" },
                      adicional: { dot: "var(--v2-indigo)", label: "Adicional", color: "var(--v2-indigo)", bg: "var(--v2-indigo-bg)" },
                    }
                    const estadoStyle = estilosEstadoRQ[String(fila.estadoVista)] || { dot: "var(--v2-subtle)", label: String(fila.estadoVista || "Sin estado"), color: "var(--v2-text-secondary)", bg: "var(--v2-neutral-bg)" }

                    return (
                      <tr key={fila.key} style={{ borderTop: "1px solid var(--v2-border-soft)", background: idx % 2 === 0 ? "var(--v2-surface)" : "var(--v2-surface-soft)" }}>
                        <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: fila.origen === "adicional" ? "var(--v2-indigo)" : "var(--v2-text-secondary)", whiteSpace: "nowrap" }}>
                          {fila.origen === "adicional" ? "➕ Adicional" : fila.legacy ? "📋 Proyecto legacy" : "📋 Proyecto"}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: estadoStyle.bg, color: estadoStyle.color, padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: estadoStyle.dot, display: "inline-block" }} />
                            {estadoStyle.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, color: "var(--v2-text-secondary)", minWidth: 240 }}>{fila.descripcion}</td>
                        <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: fila.rq ? "var(--v2-accent)" : "var(--v2-subtle)", whiteSpace: "nowrap" }}>
                          {fila.rq ? rqCodigo(fila.rq) : "—"}
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, color: "var(--v2-muted)", minWidth: 160 }}>{fila.proveedor}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "var(--v2-muted)", whiteSpace: "nowrap" }}>
                          {fila.fecha ? new Date(fila.fecha).toLocaleDateString("es-PE") : "—"}
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: "var(--v2-text-secondary)", textAlign: "right", whiteSpace: "nowrap" }}>
                          {fmt(fila.montoPresupuestado)}
                        </td>
                        <td style={{ padding: "12px", fontSize: 13, fontWeight: 900, color: "var(--v2-accent)", textAlign: "right", whiteSpace: "nowrap" }}>
                          {fmt(fila.montoFinal)}
                          {fila.rq && <div style={{ fontSize: 10, color: "var(--v2-muted)", fontWeight: 600 }}>{rqTratamientoIgvLabel(fila.rq)}</div>}
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}>
                          {(() => {
                            const presup = Number(fila.montoPresupuestado || 0)
                            const final = Number(fila.montoFinal || 0)
                            const diff = final - presup
                            const pct = presup > 0 ? (diff / presup) * 100 : 0
                            const color = Math.abs(diff) < 0.01 ? "var(--v2-muted)" : diff > 0 ? "var(--v2-danger)" : "var(--v2-success)"
                            return (
                              <div style={{ color }}>
                                {Math.abs(diff) < 0.01 ? "S/ 0.00" : `${diff > 0 ? "+" : "-"}${fmt(Math.abs(diff))}`}
                                {presup > 0 && <div style={{ fontSize: 10, fontWeight: 700 }}>{Math.abs(pct).toFixed(1)}%</div>}
                              </div>
                            )
                          })()}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {fila.estadoVista === "pendiente" && (
                            <V2Button onClick={() => abrirPreCuadreDesdeItem(fila.item)} size="sm" variant="primary">Generar</V2Button>
                          )}
                          {fila.estadoVista === "cancelado" && (
                            <V2Button onClick={() => abrirPreCuadreDesdeItem(fila.item)} size="sm" variant="secondary">Regenerar</V2Button>
                          )}
                          {(fila.estadoVista === "generado" || fila.estadoVista === "adicional") && fila.rq && (
                            <V2Button onClick={() => router.push(`/rq?proyecto_id=${id}&rq_id=${fila.rq.id}&view=list`)} size="sm" variant="secondary">Abrir</V2Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      </ProjectDetailSection>

      <ProjectDetailSection activeTab={activeTab} tab="resumen">
      <section id="tab-resumen" style={{ scrollMarginTop: 120 }}>
        <V2SectionHeader
          actions={<V2StatusBadge tone={estadoTone(proyecto?.estado)}>{estadoInfo.label}</V2StatusBadge>}
          description="Vista rápida del proyecto, estado, economía base y alertas operativas."
          title="Resumen ejecutivo"
        />

        <div className={styles.summaryGrid} style={{ marginTop: 16 }}>
          <ProjectInfoCardV2
            rows={[
              { label: "Código", value: proyecto?.codigo || "-" },
              { label: "Nombre", value: proyecto?.nombre || "-" },
              { label: "Cliente", value: proyecto?.cliente?.razon_social || "Sin cliente" },
              { label: "Productor", value: productorNombre },
              { label: "Entidad", value: entidadLabel },
              { label: "Inicio", value: proyecto?.fecha_inicio || "-" },
              { label: "Fin estimado", value: proyecto?.fecha_fin_estimada || "-" },
            ]}
            title="Datos base del proyecto"
          />

          <ProjectInfoCardV2
            rows={[
              { label: "Presupuesto referencial", value: proyecto?.presupuesto_referencial ? fmt(proyecto.presupuesto_referencial) : "-", emphasis: true },
              { label: "Versión aprobada", value: cotAprobada ? `V${cotAprobada.version}` : "Sin versión aprobada" },
              { label: "Monto aprobado", value: montoAprobado ? fmt(montoAprobado) : "-" },
            ]}
            title="Información económica"
          />

          <div className={styles.summaryGridFull}>
            <V2SectionCard description="Condiciones operativas que requieren atención." title="Alertas del sistema">
              {resumenAlertas.length === 0 ? (
                <span className={styles.alertsEmpty}>Sin alertas operativas</span>
              ) : (
                <div className={styles.alertsList}>
                  {resumenAlertas.map((alerta: any) => {
                    const alertaAccion: Record<string, { actionLabel: string; onClick: () => void }> = {
                      "Sin cotización": { actionLabel: "Ir a Cotizaciones", onClick: () => handleTabChange("cotizaciones") },
                      "Sin versión aprobada": { actionLabel: "Ir a Cotizaciones", onClick: () => handleTabChange("cotizaciones") },
                      "Pendiente de RQ": { actionLabel: "Ir a Costos/RQ", onClick: () => handleTabChange("costos-rq") },
                      "Pendiente de liquidación": { actionLabel: "Ir a Liquidaciones", onClick: () => router.push(`/liquidaciones?proyecto_id=${id}`) },
                    }
                    const accion = alertaAccion[alerta.label]
                    return (
                      <V2AlertCard
                        actionLabel={accion?.actionLabel}
                        key={alerta.label}
                        message={`${alerta.label}: ${alerta.detalle}`}
                        onClick={accion?.onClick}
                        tipo="warning"
                      />
                    )
                  })}
                </div>
              )}
            </V2SectionCard>
          </div>

          <div className={styles.summaryGridFull}>
            <V2SectionCard description="Últimos cambios registrados en las cotizaciones del proyecto." title="Actividad reciente">
              <V2ActivityTimeline
                items={Object.entries(historial)
                  .flatMap(([cotId, entradas]: [string, any[]]) => {
                    const cot = cotizaciones.find((c: any) => c.id === cotId)
                    return entradas.map((h: any, i: number): V2TimelineItem => ({
                      id: `${cotId}-${i}`,
                      date: h.created_at ? new Date(h.created_at).toLocaleDateString("es-PE") : "-",
                      title: cot ? `V${cot.version} - ${h.accion || "Actualización"}` : (h.accion || "Actualización"),
                      subtitle: h.usuario_nombre || undefined,
                    }))
                  })
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .slice(0, 6)}
              />
            </V2SectionCard>
          </div>

          <div className={styles.summaryGridFull}>
            <V2SectionCard description="Accesos directos usados con frecuencia desde el Resumen." title="Acciones rápidas">
              <V2QuickActions layout="auto">
                <V2Button leadingIcon={<FileText size={15} />} onClick={() => handleTabChange("cotizaciones")} variant="secondary">
                  Ver historial económico
                </V2Button>
                {puedeExportarProyecto && (
                  <V2Button leadingIcon={<FolderOpen size={15} />} onClick={() => window.open(`/api/reporte-pdf?proyecto_id=${id}`, "_blank")} variant="secondary">
                    Ver documentos
                  </V2Button>
                )}
              </V2QuickActions>
            </V2SectionCard>
          </div>
        </div>
      </section>
      </ProjectDetailSection>

      <ProjectDetailSection activeTab={activeTab} tab="cliente">
      <section id="tab-cliente" style={{ scrollMarginTop: 120 }}>
        <V2SectionHeader
          actions={clienteId && <V2StatusBadge tone="neutral">1 proyecto en esta vista</V2StatusBadge>}
          description="Contexto comercial y datos principales del cliente asociados a este proyecto."
          title={clienteNombre}
        />

        <div className={styles.clienteGrid} style={{ marginTop: 16 }}>
          <ProjectInfoCardV2
            columns={4}
            density="compact"
            rows={[
              { label: "Razón social", value: clienteNombre },
              { label: "Nombre comercial", value: clienteProyecto.nombre_comercial || "No disponible en esta vista" },
              { label: "RUC", value: clienteProyecto.ruc || "-" },
              { label: "Dirección principal", value: clienteProyecto.direccion || "Sin dirección" },
              { label: "Contacto principal", value: clienteContacto },
              { label: "Correo", value: clienteEmail },
              { label: "Teléfono", value: clienteTelefono },
              { label: "Responsable comercial", value: productorNombre },
            ]}
            title="Ficha rápida"
          />

          <div style={{ display: "grid", gap: 12 }}>
            <V2SectionCard title="Acciones del cliente">
              <V2QuickActions layout="weighted">
                <V2Button disabled={!clienteId} leadingIcon={<Eye size={15} />} onClick={() => clienteId && router.push(`/clientes/${clienteId}`)} variant="secondary">
                  Ver ficha completa
                </V2Button>
                <V2Button disabled={!clienteId} leadingIcon={<Pencil size={15} />} onClick={() => clienteId && router.push(`/clientes/${clienteId}`)} variant="secondary">
                  Editar cliente
                </V2Button>
                <V2Button disabled={!clienteId} leadingIcon={<FolderOpen size={15} />} onClick={() => clienteId && router.push(`/proyectos?cliente_id=${clienteId}`)} variant="secondary">
                  Ver proyectos del cliente
                </V2Button>
                <V2Button disabled={!clienteId} leadingIcon={<FilePlus2 size={15} />} onClick={() => clienteId && router.push(`/proyectos/nuevo?cliente_id=${clienteId}`)} variant="primary">
                  Crear nuevo proyecto
                </V2Button>
              </V2QuickActions>
            </V2SectionCard>

            <V2SectionCard title="Proyectos relacionados">
              <div className={styles.relatedProjectCard}>
                <div className={styles.relatedProjectCode}>{proyecto?.codigo || "Proyecto actual"}</div>
                <div className={styles.relatedProjectName}>{proyecto?.nombre || "-"}</div>
                <div style={{ marginTop: 6 }}>
                  <V2StatusBadge size="sm" tone={estadoTone(proyecto?.estado)}>{estadoInfo.label}</V2StatusBadge>
                </div>
              </div>
              <p className={styles.relatedProjectHint}>
                El listado completo se mantiene en Proyectos para evitar consultas adicionales en este tab.
              </p>
            </V2SectionCard>
          </div>
        </div>
      </section>
      </ProjectDetailSection>

      <ProjectDetailSection activeTab={activeTab} tab="seguimiento">
      <section id="tab-tareas" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Tareas</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => router.push(`/tareas?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Crear tarea</button>
            <button onClick={() => router.push(`/audiovisual/requerimientos?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Solicitar audiovisual</button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para tareas vinculadas al proyecto, responsables, estados, fechas limite y comentarios recientes.
          </div>
        </div>
      </section>

      <section id="tab-logistica" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Logística</h2>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para envios de materiales, inventario, ordenes asociadas, responsables logisticos y estados de entrega.
          </div>
        </div>
      </section>

      <section id="tab-facturacion" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Facturación</h2>
          {puedeVerFacturacionProyecto && (
            <button onClick={() => router.push(`/facturacion?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Emitir factura</button>
          )}
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para facturas asociadas al proyecto, estado de cobro, detracciones, retenciones y documentos.
          </div>
        </div>
      </section>

      <section id="tab-liquidacion" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Liquidación</h2>
          <button onClick={() => router.push(`/liquidaciones?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver liquidación</button>
        </div>
        <div style={{ padding: 20 }}>
          {!liquidacionProyecto ? (
            <div style={placeholderStyle}>
              Aún no existe liquidación registrada para este proyecto.
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                {[
                  { label: "Presupuesto aprobado", value: fmt(liquidacionProyecto.precio_cliente_presupuestado || 0) },
                  { label: "Costo real", value: fmt(liquidacionProyecto.costo_real || 0) },
                  { label: "Adicionales", value: "Ver liquidación" },
                  { label: "Caja chica", value: "Ver liquidación" },
                  { label: "Traslados", value: "Ver liquidación" },
                  { label: "Margen", value: `${Number(liquidacionProyecto.margen_real_pct || 0).toFixed(1)}%` },
                  { label: "Rentabilidad", value: `${Number(liquidacionProyecto.margen_real_pct || 0).toFixed(1)}%` },
                  { label: "Estado", value: liquidacionProyecto.cerrada ? "Cerrada" : "Abierta" },
                  { label: "Controller", value: liquidacionProyecto.aprobado_controller ? "Aprobado" : "Pendiente" },
                ].map((item: any) => (
                  <div key={item.label} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, background: "#FFFFFF" }}>
                    <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 800, textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: "#111827", fontWeight: 800, marginTop: 4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!liquidacionProyecto.aprobado_controller && (
                  <span style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 999, padding: "5px 10px", fontWeight: 700 }}>Pendiente aprobación Controller</span>
                )}
                {Number(liquidacionProyecto.costo_real || 0) <= 0 && (
                  <span style={{ fontSize: 12, color: "#991B1B", background: "#FEE2E2", borderRadius: 999, padding: "5px 10px", fontWeight: 700 }}>Costo real pendiente de consolidar</span>
                )}
                {Number(liquidacionProyecto.margen_real_pct || 0) < 0 && (
                  <span style={{ fontSize: 12, color: "#991B1B", background: "#FEE2E2", borderRadius: 999, padding: "5px 10px", fontWeight: 700 }}>Rentabilidad negativa</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="tab-archivos" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Archivos</h2>
          <a href={"/api/reporte-pdf?proyecto_id=" + id} target="_blank" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}>Reporte PDF</a>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para reporte PDF, previews de cotización, facturas, vouchers, sustentos y enlaces externos del proyecto.
          </div>
        </div>
      </section>

      <section id="tab-historial" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Historial</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{historialCount} evento{historialCount !== 1 ? "s" : ""} de cotizaciones</span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para trazabilidad consolidada del proyecto. Por ahora el historial visible se mantiene dentro de cada cotización.
          </div>
        </div>
      </section>
      </ProjectDetailSection>
      </ProjectDetailShellV2>

      {showEditar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Editar proyecto</h2>
              <button onClick={() => setShowEditar(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>NOMBRE</label>
                <input style={inp} value={formEditar.nombre} onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>CLIENTE</label>
                <select style={inp} value={formEditar.cliente_id} onChange={e => setFormEditar({ ...formEditar, cliente_id: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>PRODUCTOR</label>
                <select style={inp} value={formEditar.productor_id} onChange={e => setFormEditar({ ...formEditar, productor_id: e.target.value })} disabled={!puedeCambiarProductor}>
                  <option value="">Sin productor</option>
                  {productores.map(p => <option key={p.id} value={p.id}>{p.apellido} {p.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA INICIO</label>
                  <input type="date" style={inp} value={formEditar.fecha_inicio} onChange={e => setFormEditar({ ...formEditar, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>FECHA FIN ESTIMADA</label>
                  <input type="date" style={inp} value={formEditar.fecha_fin_estimada} onChange={e => setFormEditar({ ...formEditar, fecha_fin_estimada: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>PRESUPUESTO REF.</label>
                <input type="number" style={inp} value={formEditar.presupuesto_referencial} onChange={e => setFormEditar({ ...formEditar, presupuesto_referencial: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowEditar(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarEdicion} className="btn-primary" style={{ fontSize: 13 }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




























































