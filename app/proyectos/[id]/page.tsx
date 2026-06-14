"use client"
import { registrarAccion } from "@/lib/trazabilidad"
import { registrarHistorial } from "@/lib/historial"
import { enviarAlerta } from "@/lib/alertas"
import { notificarATodos } from "@/lib/notificaciones"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { rqCodigo } from "@/lib/rq-code"
import { rqIgvDetalle, rqTratamientoIgvLabel } from "@/lib/rq-igv"

const FLUJO: Record<string, any> = {
  pendiente_aprobacion: { label: "Pendiente aprobación", bg: "#fef9c3", color: "#92400e", siguiente: "aprobado_produccion", accion: "Aprobar (Producción)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  aprobado_produccion:  { label: "Aprobado Producción",  bg: "#fed7aa", color: "#9a3412", siguiente: "aprobado_gerencia",   accion: "Aprobar (Gerencia)",      roles: ["gerente_general", "superadmin"] },
  aprobado_gerencia:    { label: "Aprobado Gerencia",    bg: "#e0e7ff", color: "#3730a3", siguiente: "aprobado_cliente",    accion: "Aprobado por Cliente",    roles: ["gerente_general", "superadmin"] },
  aprobado_cliente:     { label: "Aprobado Cliente",     bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Iniciar proyecto",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  aprobado:             { label: "Aprobado",              bg: "#dbeafe", color: "#1e40af", siguiente: "en_curso",            accion: "Iniciar proyecto",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  en_curso:             { label: "En curso",              bg: "#dcfce7", color: "#15803d", siguiente: "terminado",           accion: "Marcar terminado",        roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  terminado:            { label: "Terminado",             bg: "#f3f4f6", color: "#6b7280", siguiente: "liquidado",           accion: "Pasar a liquidación",     roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },
  liquidado:            { label: "Liquidado",             bg: "#f5f3ff", color: "#6d28d9", siguiente: "facturado",           accion: "Marcar facturado",        roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  facturado:            { label: "Facturado",             bg: "#e0f2fe", color: "#0369a1", siguiente: "cancelado",           accion: "Marcar pagado",           roles: ["gerente_general", "superadmin"] },
  cancelado:            { label: "Pagado",                bg: "#f0fdf4", color: "#166534", siguiente: null,                  accion: null,                      roles: [] },
  rechazado:            { label: "Rechazado",             bg: "#fde8d8", color: "#c2410c", siguiente: null,                  accion: null,                      roles: [] },
}

const FLUJO_BREADCRUMB = ["pendiente_aprobacion", "aprobado_produccion", "aprobado_gerencia", "aprobado_cliente", "en_curso", "terminado", "liquidado", "facturado", "cancelado"]

const ENTIDADES = [
  { value: "peru", label: "Izango Peru" },
  { value: "selva", label: "Izango Selva" },
]

const ESTADOS_RQ: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  aprobado_produccion: { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Produccion" },
  aprobado: { bg: "#dcfce7", color: "#15803d", label: "Aprobado GG" },
  programado: { bg: "#dbeafe", color: "#1e40af", label: "Programado" },
  pagado: { bg: "#f0fdf4", color: "#166534", label: "Pagado" },
  cancelado: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelado" },
  rechazado: { bg: "#fee2e2", color: "#991b1b", label: "Rechazado" },
}

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [cotizacionesEliminadas, setCotizacionesEliminadas] = useState<any[]>([])
  const [historial, setHistorial] = useState<Record<string, any[]>>({})
  const [rqsProyecto, setRqsProyecto] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [showPreCuadre, setShowPreCuadre] = useState(false)
  const [preCuadreItems, setPreCuadreItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [guardandoPreCuadre, setGuardandoPreCuadre] = useState(false)
  const [versionAprobar, setVersionAprobar] = useState("")
  const [editandoEntidad, setEditandoEntidad] = useState(false)
  const [showVersionesEliminadas, setShowVersionesEliminadas] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [formEditar, setFormEditar] = useState<any>({})

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
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

    const rqSelect = "id,proyecto_id,codigo_rq,numero_rq,estado,descripcion,monto_solicitado,monto_presupuestado,proveedor_nombre,tipo_pago,dias_credito,es_adicional,tratamiento_igv,created_at"
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
    setRqsProyecto(rqsVinculados)

    const hace2dias = new Date()
    hace2dias.setDate(hace2dias.getDate() - 2)
    const { data: elim } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", id).not("deleted_at", "is", null).gte("deleted_at", hace2dias.toISOString()).order("deleted_at", { ascending: false })
    setCotizacionesEliminadas(elim || [])
    setLoading(false)
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
    await supabase.from("proyectos").update({
      nombre: formEditar.nombre,
      cliente_id: formEditar.cliente_id || null,
      productor_id: formEditar.productor_id || null,
      fecha_inicio: formEditar.fecha_inicio || null,
      fecha_fin_estimada: formEditar.fecha_fin_estimada || null,
      presupuesto_referencial: formEditar.presupuesto_referencial ? Number(formEditar.presupuesto_referencial) : null,
    }).eq("id", id)
    await registrarAccion({ accion: "editar", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto editado: " + formEditar.nombre })
    setProyecto((prev: any) => ({ ...prev, ...formEditar }))
    setShowEditar(false)
    setTimeout(() => load(), 500)
  }

  async function marcarCotizacionAprobadaCliente(cot: any) {
    if (!cot?.id) return
    if (!puedeAprobarCliente) {
      alert("No tienes permisos para marcar aprobado por cliente")
      return
    }
    if (!confirm("¿Confirmas que el cliente aprobó formalmente esta proforma?")) return
    const aprobadoAt = new Date().toISOString()
    for (const otra of cotizaciones) {
      if (otra.id !== cot.id && otra.estado === "aprobada_cliente") {
        await supabase.from("cotizaciones").update({ estado: "enviada_cliente" }).eq("id", otra.id)
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
    await supabase.from("proyectos").update({ cotizacion_aprobada_id: cot.id }).eq("id", id)
    await registrarHistorial({
      cotizacion_id: cot.id,
      accion: "aprobada_cliente",
      estado_anterior: cot.estado || "borrador",
      estado_nuevo: "aprobada_cliente",
      descripcion: "Cliente aprobo formalmente la proforma. Total: " + fmt(cot.total_cliente || 0),
      datos: { aprobado_por: perfil?.id || null, aprobado_at: aprobadoAt },
    })
    await registrarAccion({ accion: "aprobar", modulo: "cotizaciones", entidad_id: cot.id, entidad_tipo: "cotizacion", descripcion: "Proforma marcada como aprobada por cliente", datos_nuevos: { aprobado_por: perfil?.id || null, aprobado_at: aprobadoAt } })
    await enviarAlerta("cotizacion_aprobada", { nombre: proyecto?.nombre, codigo: proyecto?.codigo, version: cot.version, total: cot.total_cliente || 0, proyecto_id: id })
    alert("Proforma marcada como aprobada por cliente")
    load()
  }

  async function cambiarEstado(nuevoEstado: string) {
    setCambiando(true)
    if (nuevoEstado === "aprobado_gerencia" && versionAprobar) {
      await supabase.from("cotizaciones").update({ bloqueada: true }).eq("id", versionAprobar)
    }
    if (nuevoEstado === "en_curso" && versionAprobar) {
      setCambiando(false)
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", versionAprobar).order("orden")
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
              pagos: [],
            })
          }
        } else {
          itemsConSubs.push({ ...item, costo_final: item.costo_total || 0, esNuevo: false, tipo_pago: "contado", pagos: [] })
        }
      }
      setPreCuadreItems(itemsConSubs)
      setShowPreCuadre(true)
      return
    }
    if (nuevoEstado === "en_curso_confirmar" && versionAprobar) {
      const cotSeleccionada = cotizaciones.find(cot => cot.id === versionAprobar)
      if (cotSeleccionada?.estado !== "aprobada_cliente") {
        alert("La proforma debe estar aprobada por cliente antes de iniciar el proyecto")
        setCambiando(false)
        return
      }
      await supabase.from("proyectos").update({ cotizacion_aprobada_id: versionAprobar }).eq("id", id)
    }
    if (nuevoEstado === "terminado") {
      const cotAprobada = cotizaciones.find(c => c.id === versionAprobar) || cotizaciones.find(c => c.estado === "aprobada_cliente")
      const { data: liqExistente } = await supabase.from("liquidaciones").select("id").eq("proyecto_id", id).single()
      if (!liqExistente) {
        const { data: liq } = await supabase.from("liquidaciones").insert({
          proyecto_id: id,
          costo_presupuestado: cotAprobada?.subtotal_costo || 0,
          precio_cliente_presupuestado: cotAprobada?.total_cliente || 0,
          margen_presupuestado_pct: cotAprobada?.margen_pct || 0,
          costo_real: 0, precio_cliente_real: cotAprobada?.total_cliente || 0,
          margen_real_pct: 0, cerrada: false,
        }).select().single()
        if (liq && cotAprobada) {
          const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotAprobada.id)
          if (its && its.length > 0) {
            await supabase.from("liquidacion_items").insert(its.map((item: any) => ({
              liquidacion_id: liq.id, cotizacion_item_id: item.id,
              descripcion: item.descripcion, costo_presupuestado: item.costo_total || 0,
              costo_real: 0, desvio: 0, desvio_pct: 0,
            })))
          }
        }
      }
    }
    await supabase.from("proyectos").update({ estado: nuevoEstado }).eq("id", id)
   await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Estado cambiado a: " + nuevoEstado, datos_nuevos: { estado: nuevoEstado } })
    await notificarATodos({
      titulo: `Proyecto ${proyecto?.codigo} — ${FLUJO[nuevoEstado]?.label || nuevoEstado}`,
      mensaje: `${proyecto?.nombre} cambió a estado: ${FLUJO[nuevoEstado]?.label || nuevoEstado}`,
      tipo: "info",
      enlace: `/proyectos/${id}`,
      perfiles: ["superadmin","gerente_general","gerente_produccion","productor","controller"]
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
    const sinProveedor = preCuadreItems.filter(i => i.tipo !== "familia" && !i._borrado && !i.proveedor_id)
    if (sinProveedor.length > 0) {
      alert("Los siguientes items no tienen proveedor asignado:\n" + sinProveedor.map((i: any) => "• " + (i.descripcion || "Sin descripción")).join("\n"))
      return
    }
    setGuardandoPreCuadre(true)
    const esAdicional = proyecto?.estado === "en_curso"

    if (!esAdicional) {
      const cotSeleccionada = cotizaciones.find(cot => cot.id === versionAprobar)
      if (cotSeleccionada?.estado !== "aprobada_cliente") {
        alert("La proforma debe estar aprobada por cliente antes de iniciar el proyecto")
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
        es_adicional: esAdicional || item.esAdicional || false,
        dias_credito: item.dias_credito || null,
        tipo_pago: item.tipo_pago || "contado",
        estado: "pendiente_aprobacion",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: prov?.nombre || item.proveedor_nombre || "",
        proveedor_banco: prov?.banco || "",
        proveedor_cuenta: prov?.numero_cuenta || "",
        proveedor_tipo_pago: prov?.tipo_pago || null,
        monto_solicitado: Number(item.costo_final) || 0,
        monto_presupuestado: Number(item.costo_total) || 0,
        descripcion: item.descripcion || "",
        solicitado_por: perfil?.id || null,
      })
    }
    if (rqsAInsertar.length > 0) {
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
    if (!confirm("¿Rechazar este proyecto?")) return
    setCambiando(true)
    await supabase.from("proyectos").update({ estado: "rechazado" }).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "proyectos", entidad_id: id, entidad_tipo: "proyecto", descripcion: "Proyecto rechazado", datos_nuevos: { estado: "rechazado" } })
    setProyecto({ ...proyecto, estado: "rechazado" })
    setCambiando(false)
  }

  async function cambiarEntidad(entidad: string) {
    await supabase.from("proyectos").update({ entidad }).eq("id", id)
    setProyecto({ ...proyecto, entidad })
    setEditandoEntidad(false)
  }

  async function eliminarVersion(cotId: string, version: number) {
    if (!confirm(`¿Eliminar proforma V${version}? Podrás recuperarla en los próximos 2 días.`)) return
    await supabase.from("cotizaciones").update({ deleted_at: new Date().toISOString() }).eq("id", cotId)
    load()
  }

  async function recuperarVersion(cotId: string) {
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
      categoria: item.categoria || "Proforma",
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
      const copias = itemsACopiar.map(({ id: _id, cotizacion_id: _cid, ...rest }: any) => ({ ...rest, cotizacion_id: nueva.id }))
      const { data: insertados } = await supabase.from("cotizacion_items").insert(copias).select()
      await copiarItemsABiblioteca(nueva, insertados || [])
    }
    setCreando(false)
    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const estadoInfo = FLUJO[proyecto?.estado] || { label: proyecto?.estado, bg: "#f3f4f6", color: "#6b7280" }
  const tieneCotizacion = cotizaciones.length > 0
  const esEstadoFinal = ["cancelado", "rechazado"].includes(proyecto?.estado)
  const puedeAvanzar = estadoInfo.roles?.includes(perfil?.perfil) && !esEstadoFinal
  const puedeRechazar = ["gerente_produccion", "gerente_general", "superadmin"].includes(perfil?.perfil) && !esEstadoFinal
  const puedeEditar = ["superadmin", "gerente_general", "gerente_produccion", "administrador", "controller", "productor"].includes(perfil?.perfil)
  const puedeAprobarCliente = ["superadmin", "gerente_general"].includes(perfil?.perfil)
  const cotAprobada = cotizaciones.find(c => c.estado === "aprobada_cliente") || cotizaciones.find(c => c.id === proyecto?.cotizacion_aprobada_id)
  const entidadLabel = ENTIDADES.find(e => e.value === proyecto?.entidad)?.label || proyecto?.entidad || "Sin entidad"
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
  const resumenAlertas = [
    !tieneCotizacion ? { label: "Sin proforma", detalle: "Crea una proforma para continuar el flujo comercial." } : null,
    tieneCotizacion && !cotAprobada ? { label: "Sin version aprobada", detalle: "Aun no hay una version aprobada por cliente." } : null,
    ["aprobado", "aprobado_cliente"].includes(proyecto?.estado) && cotAprobada ? { label: "Pendiente de RQ", detalle: "Al iniciar el proyecto se mantiene el flujo actual de pre-cuadre y generacion de RQs." } : null,
    proyecto?.estado === "terminado" ? { label: "Pendiente de liquidacion", detalle: "El proyecto esta terminado y debe pasar por liquidacion." } : null,
  ].filter(Boolean) as any[]

  const ecCot: any = {
    borrador: { bg: "#fef9c3", color: "#92400e" },
    enviada_cliente: { bg: "#dbeafe", color: "#1e40af" },
    aprobada_cliente: { bg: "#dcfce7", color: "#15803d" },
    rechazada: { bg: "#fee2e2", color: "#991b1b" },
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }
  const historialCount = Object.values(historial).reduce((total, items) => total + items.length, 0)
  const tabsProyecto360 = [
    { label: "Proformas", href: "#tab-proformas", count: cotizaciones.length },
    { label: "Costos / RQ", href: "#tab-costos-rq", count: rqsProyecto.length },
    { label: "Resumen", href: "#tab-resumen" },
    { label: "Cliente", href: "#tab-cliente", count: proyecto?.cliente ? 1 : 0 },
    { label: "Tareas", href: "#tab-tareas" },
    { label: "Logística", href: "#tab-logistica" },
    { label: "Facturación", href: "#tab-facturacion" },
    { label: "Liquidación", href: "#tab-liquidacion" },
    { label: "Archivos", href: "#tab-archivos" },
    { label: "Historial", href: "#tab-historial", count: historialCount },
  ]
  const placeholderStyle = { padding: 16, border: "1px dashed #d1d5db", borderRadius: 10, background: "#fafafa", color: "#6b7280", fontSize: 13 }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
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
                  <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 120 }}>Tipo pago</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {preCuadreItems.map((item: any, idx: number) => {
                  if (item.tipo === "familia") return (
                    <tr key={item.id} style={{ background: "#1D2040" }}>
                      <td colSpan={5} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#03E373" }}>{item.descripcion}</td>
                    </tr>
                  )
                  const diff = (item.costo_final || 0) - (item.costo_total || 0)
                  if (item._borrado) return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: "#fff5f5", opacity: 0.6 }}>
                      <td colSpan={5} style={{ padding: "8px 12px", fontSize: 12, color: "#dc2626", textDecoration: "line-through" }}>{item.descripcion || "Sin descripción"}</td>
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
            <button onClick={() => setPreCuadreItems(prev => [...prev, { id: "new_pc_" + Date.now(), descripcion: "", costo_total: 0, costo_final: 0, proveedor_id: null, proveedor_nombre: "", tipo: "item", esNuevo: true }])}
              style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "6px 16px", fontSize: 12, color: "#6b7280", cursor: "pointer", marginBottom: 20 }}>
              + Agregar item imprevisto
            </button>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <button onClick={() => setShowPreCuadre(false)} style={{ padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmarPreCuadre} disabled={guardandoPreCuadre}
                style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: guardandoPreCuadre ? 0.7 : 1 }}>
                {guardandoPreCuadre ? "Generando RQs..." : "Confirmar y generar RQs"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>{proyecto?.codigo}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>{proyecto?.nombre}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{proyecto?.cliente?.razon_social}</span>
            {proyecto?.productor && <span style={{ color: "#9ca3af", fontSize: 13 }}>· Productor: {proyecto.productor.nombre} {proyecto.productor.apellido}</span>}
            {cotAprobada && (
              <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                ✓ V{cotAprobada.version} aprobada
              </span>
            )}
            {editandoEntidad ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {ENTIDADES.map(e => (
                  <button key={e.value} onClick={() => cambiarEntidad(e.value)}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, border: proyecto?.entidad === e.value ? "2px solid #0F6E56" : "1px solid #e5e7eb", background: proyecto?.entidad === e.value ? "#f0fdf4" : "#fff", color: proyecto?.entidad === e.value ? "#0F6E56" : "#6b7280", cursor: "pointer", fontWeight: proyecto?.entidad === e.value ? 700 : 400 }}>
                    {e.label}
                  </button>
                ))}
                <button onClick={() => setEditandoEntidad(false)} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>×</button>
              </div>
            ) : (
              <button onClick={() => setEditandoEntidad(true)}
                style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 99, padding: "2px 8px", cursor: "pointer" }}>
                🏢 {ENTIDADES.find(e => e.value === proyecto?.entidad)?.label || proyecto?.entidad || "Sin entidad"}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {puedeEditar && (
            <button onClick={abrirEditar}
              style={{ padding: "7px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ✏️ Editar
            </button>
          )}
          <a href={"/api/reporte-pdf?proyecto_id=" + id} target="_blank"
            style={{ padding: "7px 14px", border: "1px solid #1D9E75", borderRadius: 8, background: "#fff", color: "#0F6E56", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            📥 Reporte PDF
          </a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Acciones del proyecto</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => {
            const sel = cotizaciones.length > 0 ? document.getElementById("copiar-version") as HTMLSelectElement : null
            const val = sel?.value
            nuevaVersion(val && val !== "" ? val : undefined)
          }} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
            {creando ? "Creando..." : "Crear proforma / cotización"}
          </button>
          <button onClick={() => router.push(`/rq?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
            Crear RQ
          </button>
          <button onClick={() => router.push(`/tareas?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
            Crear tarea
          </button>
          <button onClick={() => router.push(`/audiovisual/requerimientos?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
            Solicitar audiovisual
          </button>
          <button onClick={() => router.push(`/facturacion?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
            Emitir factura
          </button>
          <button onClick={() => router.push(`/liquidaciones?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
            Ver liquidación
          </button>
          <a href={"/api/reporte-pdf?proyecto_id=" + id} target="_blank"
            style={{ padding: "7px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Ver documentos
          </a>
        </div>
      </div>

      <nav className="card" style={{ marginBottom: 16, padding: "10px 12px", position: "sticky", top: 57, zIndex: 40, overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
          {tabsProyecto360.map(tab => (
            <a key={tab.href} href={tab.href}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 8, color: "#374151", textDecoration: "none", fontSize: 12, fontWeight: 600, background: "#fff", whiteSpace: "nowrap" }}>
              {tab.label}
              {typeof tab.count === "number" && (
                <span style={{ minWidth: 18, height: 18, padding: "0 6px", borderRadius: 99, background: tab.count > 0 ? "#dcfce7" : "#f3f4f6", color: tab.count > 0 ? "#15803d" : "#9ca3af", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {tab.count}
                </span>
              )}
            </a>
          ))}
        </div>
      </nav>

      <section id="tab-proformas" style={{ scrollMarginTop: 120 }}>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tab Proformas</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Proformas / cotizaciones</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Administra versiones, estados, previews y recuperacion de proformas del proyecto.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: "#f3f4f6", color: "#374151", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {cotizaciones.length} version{cotizaciones.length !== 1 ? "es" : ""}
            </span>
            {cotizacionesEliminadas.length > 0 && (
              <span style={{ background: "#fee2e2", color: "#991b1b", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                {cotizacionesEliminadas.length} recuperable{cotizacionesEliminadas.length !== 1 ? "s" : ""}
              </span>
            )}
            {cotizaciones.length > 0 && (
              <select id="copiar-version" style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
                <option value="">Nueva vacía</option>
                {cotizaciones.map((cot: any) => (
                  <option key={cot.id} value={cot.id}>Copiar V{cot.version}</option>
                ))}
              </select>
            )}
            <button onClick={() => {
              const sel = cotizaciones.length > 0 ? document.getElementById("copiar-version") as HTMLSelectElement : null
              const val = sel?.value
              nuevaVersion(val && val !== "" ? val : undefined)
            }} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
              {creando ? "Creando..." : "+ Crear proforma"}
            </button>
          </div>
        </div>
      </div>

      {cotizacionesEliminadas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowVersionesEliminadas(!showVersionesEliminadas)}
            style={{ fontSize: 12, color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: 99, padding: "3px 10px", cursor: "pointer", marginBottom: 8 }}>
            🗑 {cotizacionesEliminadas.length} version{cotizacionesEliminadas.length > 1 ? "es eliminadas" : " eliminada"} (recuperable{cotizacionesEliminadas.length > 1 ? "s" : ""})
          </button>
          {showVersionesEliminadas && (
            <div style={{ background: "#fff8f8", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
              {cotizacionesEliminadas.map(cot => {
                const horasRestantes = 48 - Math.floor((Date.now() - new Date(cot.deleted_at).getTime()) / (1000 * 60 * 60))
                return (
                  <div key={cot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fee2e2" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>V{cot.version}</span>
                      {cot.total_cliente > 0 && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{fmt(cot.total_cliente)}</span>}
                      <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 8 }}>Expira en {horasRestantes}h</span>
                    </div>
                    <button onClick={() => recuperarVersion(cot.id)}
                      style={{ fontSize: 12, padding: "3px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>
                      Recuperar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Versiones</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{cotizaciones.length} version{cotizaciones.length !== 1 ? "es" : ""}</span>
        </div>
        {cotizaciones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No hay proformas aun</div>
            <div style={{ fontSize: 12 }}>Crea la primera version para comenzar</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VERSION</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONDICION PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HISTORIAL</th>
                <th style={{ padding: "10px 20px", width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((cot, idx) => {
                const e = ecCot[cot.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                const esAprobada = (cot.id === proyecto?.cotizacion_aprobada_id || cot.estado === "aprobada_cliente") && ["en_curso","terminado","liquidado","facturado","cancelado"].includes(proyecto?.estado)
                return (
                  <tr key={cot.id} style={{ borderTop: "1px solid #f3f4f6", background: esAprobada ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>V{cot.version}</span>
                        {esAprobada && <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>✓ Aprobada</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <select value={cot.estado || "borrador"} onChange={async ev => {
                        const nuevoEstado = ev.target.value
                        if (nuevoEstado === "aprobada_cliente") {
                          alert("Usa la accion independiente para marcar aprobado por cliente")
                          return
                        }
                        await supabase.from("cotizaciones").update({ estado: nuevoEstado }).eq("id", cot.id)
                        load()
                      }}
                        style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid " + e.color, background: e.bg, color: e.color, cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
                        <option value="borrador">Borrador</option>
                        <option value="enviada_cliente">Enviada</option>
                        <option value="pendiente">Pendiente</option>
                        {cot.estado === "aprobada_cliente" && <option value="aprobada_cliente">Aprobada</option>}
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {cot.total_cliente > 0 ? fmt(cot.total_cliente) : "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (cot.margen_pct || 0) >= 35 ? "#0F6E56" : "#6b7280" }}>
                      {cot.margen_pct > 0 ? cot.margen_pct.toFixed(1) + "%" : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{cot.condicion_pago || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      {historial[cot.id] && historial[cot.id].length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {historial[cot.id].slice(0, 3).map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: 10, color: "#9ca3af", display: "flex", gap: 4, alignItems: "center" }}>
                              <span style={{ color: h.accion === "aprobada_cliente" ? "#15803d" : "#6b7280" }}>
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
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>
                          Editar
                        </button>
                        <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cot.id}/preview`)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer" }}>
                          Preview
                        </button>
                        {puedeAprobarCliente && cot.estado !== "aprobada_cliente" && (
                          <button onClick={() => marcarCotizacionAprobadaCliente(cot)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #bbf7d0", borderRadius: 6, background: "#f0fdf4", color: "#15803d", cursor: "pointer", fontWeight: 600 }}>
                            Marcar aprobado por cliente
                          </button>
                        )}
                        {!esAprobada && (
                          <button onClick={() => eliminarVersion(cot.id, cot.version)}
                            style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                            Borrar
                          </button>
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


      <section id="tab-costos-rq" className="card" style={{ marginTop: 24, marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tab Costos / RQ</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Costos y requerimientos de pago</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Ordena pre-cuadre, proveedores y RQs del proyecto sin cambiar la logica actual.
            </p>
          </div>
          <button onClick={() => router.push(`/rq?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Crear RQ manual</button>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Version aprobada</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: cotAprobada ? "#15803d" : "#9ca3af" }}>
                {cotAprobada ? `V${cotAprobada.version}` : "Pendiente"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                {cotAprobada?.total_cliente ? fmt(cotAprobada.total_cliente) : "Se define desde Proformas / aprobación"}
              </div>
            </div>
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Pre-cuadre</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: proyecto?.estado === "en_curso" ? "#92400e" : "#9ca3af" }}>
                {proyecto?.estado === "en_curso" ? "Disponible" : "Segun estado"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Usa el flujo actual de proveedores y costos.</div>
            </div>
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>RQs del proyecto</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: rqsProyecto.length ? "#0F6E56" : "#9ca3af" }}>
                {rqsProyecto.length}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                {rqsProyecto.length ? `${fmt(totalRqs)} activos` : "Sin requerimientos vinculados"}
              </div>
            </div>
          </div>

          <div style={{ padding: 16, border: "1px solid #fcd34d", borderRadius: 10, background: "#fffbeb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Pre-cuadre y RQs adicionales</div>
                <div style={{ fontSize: 12, color: "#92400e" }}>
                  Mantiene el flujo actual: selecciona proveedores, costos finales y genera requerimientos de pago adicionales.
                </div>
              </div>
              {proyecto?.estado === "en_curso" && ["superadmin","gerente_general","gerente_produccion","productor"].includes(perfil?.perfil) ? (
                <button onClick={async () => {
                  const { data: provs } = await supabase.from("proveedores").select("id, nombre, banco, numero_cuenta, tipo_pago").order("nombre")
                  setProveedores(provs || [])
                  setPreCuadreItems([{ id: "new_pc_" + Date.now(), descripcion: "", costo_total: 0, costo_final: 0, proveedor_id: null, proveedor_nombre: "", tipo: "item", esNuevo: true, esAdicional: true, tipo_pago: "contado" }])
                  setShowPreCuadre(true)
                }} style={{ padding: "8px 16px", border: "1px dashed #f59e0b", borderRadius: 8, background: "#fff", color: "#92400e", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Generar RQs adicionales
                </button>
              ) : (
                <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>Disponible cuando el proyecto este en curso y el rol lo permita</span>
              )}
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>RQs relacionados al proyecto</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {rqsProyecto.length} RQs · {rqsPendientes.length} pendientes · {rqsPagados.length} pagados · {fmt(totalRqsPendientes)} por gestionar
                </div>
              </div>
              <button onClick={() => router.push(`/rq?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver en módulo RQ</button>
            </div>
            {rqsProyecto.length === 0 ? (
              <div style={{ padding: 20, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                Este proyecto todavia no tiene requerimientos de pago vinculados.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>RQ</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>ESTADO</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>DESCRIPCION</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>PROVEEDOR</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>FECHA</th>
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>MONTO</th>
                      <th style={{ padding: "10px 16px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rqsProyecto.map((rq, idx) => {
                      const estado = ESTADOS_RQ[rq.estado] || { bg: "#f3f4f6", color: "#6b7280", label: rq.estado || "Sin estado" }
                      return (
                        <tr key={rq.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 800, color: "#0F6E56", whiteSpace: "nowrap" }}>
                            {rqCodigo(rq)}
                            {rq.es_adicional && <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>Adicional</div>}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ background: estado.bg, color: estado.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {estado.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px", fontSize: 12, color: "#374151", minWidth: 220 }}>{rq.descripcion || "—"}</td>
                          <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", minWidth: 160 }}>{rq.proveedor_nombre || "—"}</td>
                          <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{rq.created_at ? new Date(rq.created_at).toLocaleDateString("es-PE") : "—"}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#0F6E56", textAlign: "right", whiteSpace: "nowrap" }}>
                            {fmt(rqIgvDetalle(rq).total)}
                            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{rqTratamientoIgvLabel(rq)}</div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button onClick={() => router.push(`/rq?proyecto_id=${id}&rq_id=${rq.id}&view=list`)} className="btn-secondary" style={{ fontSize: 11 }}>Abrir RQ</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>


      <section id="tab-resumen" style={{ scrollMarginTop: 120 }}>
        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tab Resumen</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Resumen ejecutivo</h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                Vista rapida del proyecto, estado, economia base y alertas operativas.
              </p>
            </div>
            <span style={{ background: estadoInfo.bg, color: estadoInfo.color, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {estadoInfo.label}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fff" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Datos base del proyecto</h3>
              <div style={{ display: "grid", gap: 8 }}>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Codigo</span><div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.codigo || "-"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Nombre</span><div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.nombre || "-"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Cliente</span><div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.cliente?.razon_social || "Sin cliente"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Productor</span><div style={{ fontSize: 13, color: "#374151" }}>{productorNombre}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Entidad</span><div style={{ fontSize: 13, color: "#374151" }}>{entidadLabel}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Inicio</span><div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.fecha_inicio || "-"}</div></div>
                  <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Fin estimado</span><div style={{ fontSize: 13, color: "#374151" }}>{proyecto?.fecha_fin_estimada || "-"}</div></div>
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fff" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Estado del proyecto</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {FLUJO_BREADCRUMB.map((estado, idx) => {
                  const info = FLUJO[estado]
                  const idxActual = FLUJO_BREADCRUMB.indexOf(proyecto?.estado)
                  const completado = idx <= idxActual
                  const actual = estado === proyecto?.estado
                  return (
                    <div key={estado} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        onClick={async () => {
                          if (!["superadmin","gerente_general"].includes(perfil?.perfil)) return
                          if (actual) return
                          if (idx >= FLUJO_BREADCRUMB.indexOf(proyecto?.estado)) return
                          const estadosAntesDeEnCurso = ["pendiente_aprobacion","aprobado_produccion","aprobado_gerencia","aprobado_cliente"]
                          const { data: rqsPendientes } = await supabase.from("requerimientos_pago").select("id, estado").eq("proyecto_id", id).in("estado", ["pendiente_aprobacion","aprobado_produccion"])
                          const nRqs = rqsPendientes?.length || 0
                          const msgRqs = nRqs > 0 ? `\n\n⚠️ Se cancelarán ${nRqs} RQ(s) pendientes automáticamente.` : ""
                          if (confirm(`¿Regresar el proyecto al estado "${info.label}"?${msgRqs}`)) {
                            if (nRqs > 0) {
                              await supabase.from("requerimientos_pago").update({ estado: "rechazado" }).eq("proyecto_id", id).in("estado", ["pendiente_aprobacion","aprobado_produccion"])
                            }
                            cambiarEstado(estado)
                          }
                        }}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: completado ? info.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: ["superadmin","gerente_general"].includes(perfil?.perfil) && !actual && idx < FLUJO_BREADCRUMB.indexOf(proyecto?.estado) ? "pointer" : "default" }}>
                        <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                      </div>
                      {actual && <span style={{ fontSize: 11, fontWeight: 700, color: info.color }}>{info.label}</span>}
                    </div>
                  )
                })}
              </div>

              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Siguiente accion disponible</div>
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
                  {puedeAvanzar && estadoInfo.accion ? estadoInfo.accion : esEstadoFinal ? "Sin acciones pendientes" : "Sin accion disponible para tu rol"}
                </div>

                {proyecto?.estado === "rechazado" && (
                  <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fde8d8", border: "1px solid #fdba74", borderRadius: 8, fontSize: 12, color: "#c2410c", fontWeight: 600 }}>
                    Este proyecto fue rechazado y no puede avanzar.
                  </div>
                )}

                {puedeAvanzar && proyecto?.estado === "aprobado" && cotizaciones.length > 0 && (
                  <div style={{ marginBottom: 10, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0F6E56", marginBottom: 8 }}>
                      Selecciona la version aprobada por el cliente
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {cotizaciones.map((cot: any) => (
                        <button key={cot.id} type="button" onClick={() => setVersionAprobar(cot.id)}
                          style={{
                            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: versionAprobar === cot.id ? 700 : 400,
                            border: versionAprobar === cot.id ? "2px solid #0F6E56" : "1px solid #e5e7eb",
                            background: versionAprobar === cot.id ? "#dcfce7" : "#fff",
                            color: versionAprobar === cot.id ? "#15803d" : "#374151", cursor: "pointer",
                          }}>
                          V{cot.version}
                          {cot.total_cliente > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: versionAprobar === cot.id ? "#15803d" : "#9ca3af" }}>{fmt(cot.total_cliente)}</span>}
                          {cot.estado === "aprobada_cliente" && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {puedeAvanzar && estadoInfo.siguiente && (
                    <button onClick={() => cambiarEstado(estadoInfo.siguiente)} disabled={cambiando || (proyecto?.estado === "aprobado" && !versionAprobar)}
                      style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (proyecto?.estado === "aprobado" && !versionAprobar) ? 0.5 : 1 }}>
                      {cambiando ? "..." : estadoInfo.accion}
                    </button>
                  )}
                  {puedeRechazar && (
                    <button onClick={rechazar} disabled={cambiando}
                      style={{ padding: "8px 16px", border: "1px solid #fde8d8", borderRadius: 8, background: "#fff", color: "#c2410c", cursor: "pointer", fontSize: 13 }}>
                      Rechazar proyecto
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fff" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Informacion economica basica</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Presupuesto referencial</span>
                  <div style={{ fontSize: 18, color: "#111827", fontWeight: 700 }}>{proyecto?.presupuesto_referencial ? fmt(proyecto.presupuesto_referencial) : "-"}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Version aprobada</span>
                  <div style={{ fontSize: 13, color: "#374151" }}>{cotAprobada ? `V${cotAprobada.version}` : "Sin version aprobada"}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Monto aprobado</span>
                  <div style={{ fontSize: 13, color: "#374151" }}>{montoAprobado ? fmt(montoAprobado) : "-"}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: resumenAlertas.length > 0 ? 10 : 0 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Alertas simples</h3>
              {resumenAlertas.length === 0 && <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>Sin alertas operativas</span>}
            </div>
            {resumenAlertas.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {resumenAlertas.map((alerta: any) => (
                  <div key={alerta.label} style={{ padding: "10px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", marginBottom: 3 }}>{alerta.label}</div>
                    <div style={{ fontSize: 12, color: "#7c2d12" }}>{alerta.detalle}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>


      <section id="tab-cliente" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tab Cliente</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>{clienteNombre}</h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Contexto comercial y datos principales del cliente asociados a este proyecto.
            </p>
          </div>
          {clienteId && (
            <span style={{ background: "#f3f4f6", color: "#374151", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              1 proyecto en esta vista
            </span>
          )}
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, 0.8fr)", gap: 16 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fff" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Ficha rapida</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Razon social</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteNombre}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Nombre comercial</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteProyecto.nombre_comercial || "No disponible en esta vista"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>RUC</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteProyecto.ruc || "-"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Direccion principal</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteProyecto.direccion || "Sin direccion"}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Contacto principal</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteContacto}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Correo</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteEmail}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Telefono</span><div style={{ fontSize: 13, color: "#374151" }}>{clienteTelefono}</div></div>
                <div><span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Responsable comercial</span><div style={{ fontSize: 13, color: "#374151" }}>{productorNombre}</div></div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fff" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Acciones del cliente</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <button onClick={() => clienteId && router.push(`/clientes/${clienteId}`)} disabled={!clienteId} className="btn-secondary" style={{ fontSize: 13, justifyContent: "center", opacity: clienteId ? 1 : 0.5 }}>
                    Ver ficha completa
                  </button>
                  <button onClick={() => clienteId && router.push(`/clientes/${clienteId}`)} disabled={!clienteId} className="btn-secondary" style={{ fontSize: 13, justifyContent: "center", opacity: clienteId ? 1 : 0.5 }}>
                    Editar cliente
                  </button>
                  <button onClick={() => clienteId && router.push(`/proyectos?cliente_id=${clienteId}`)} disabled={!clienteId} className="btn-secondary" style={{ fontSize: 13, justifyContent: "center", opacity: clienteId ? 1 : 0.5 }}>
                    Ver proyectos del cliente
                  </button>
                  <button onClick={() => clienteId && router.push(`/proyectos/nuevo?cliente_id=${clienteId}`)} disabled={!clienteId} className="btn-primary" style={{ fontSize: 13, justifyContent: "center", opacity: clienteId ? 1 : 0.5 }}>
                    Crear nuevo proyecto
                  </button>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fafafa" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>Proyectos relacionados</h3>
                <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{proyecto?.codigo || "Proyecto actual"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{proyecto?.nombre || "-"}</div>
                  <div style={{ fontSize: 11, color: estadoInfo.color, fontWeight: 700, marginTop: 6 }}>{estadoInfo.label}</div>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 0" }}>
                  El listado completo se mantiene en Proyectos para evitar consultas adicionales en este tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          <button onClick={() => router.push(`/facturacion?proyecto_id=${id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Emitir factura</button>
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
          <div style={placeholderStyle}>
            Fase 1: placeholder para liquidacion, costos reales, margen real, desvios y aprobaciones de cierre.
          </div>
        </div>
      </section>

      <section id="tab-archivos" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Archivos</h2>
          <a href={"/api/reporte-pdf?proyecto_id=" + id} target="_blank" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}>Reporte PDF</a>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para reporte PDF, previews de proforma, facturas, vouchers, sustentos y enlaces externos del proyecto.
          </div>
        </div>
      </section>

      <section id="tab-historial" className="card" style={{ marginBottom: 24, scrollMarginTop: 120 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#374151" }}>Historial</h2>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{historialCount} evento{historialCount !== 1 ? "s" : ""} de proformas</span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={placeholderStyle}>
            Fase 1: placeholder para trazabilidad consolidada del proyecto. Por ahora el historial visible se mantiene dentro de cada proforma.
          </div>
        </div>
      </section>

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
                <select style={inp} value={formEditar.productor_id} onChange={e => setFormEditar({ ...formEditar, productor_id: e.target.value })}>
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
