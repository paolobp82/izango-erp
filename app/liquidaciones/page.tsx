"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { enviarAlerta } from "@/lib/alertas"
import { useRouter } from "next/navigation"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceDataError from "@/components/finanzas/FinanceDataError"
import { puedeAccederRuta } from "@/lib/permissions"
import { esFacturaAnulada, montoCobradoFactura, saldoPendienteFactura, totalFactura } from "@/lib/finance"
import {
  consolidarCostosProyecto,
  resumenDesdeItemsConsolidados,
  validarConsolidacionParaController,
  type ConsolidacionCostos,
  type RegistroCostoConsolidado,
} from "@/lib/liquidaciones/consolidacion"

export default function LiquidacionesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [liquidaciones, setLiquidaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [facturacionResumen, setFacturacionResumen] = useState<any>({ facturado: 0, cobrado: 0, pendiente: 0, facturas: 0 })
  const [loadingItems, setLoadingItems] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [error, setError] = useState("")
  const [detailError, setDetailError] = useState("")
  const [consolidacion, setConsolidacion] = useState<ConsolidacionCostos | null>(null)

  useEffect(() => { load() }, [])

  function itemDesdeRegistroCosto(record: RegistroCostoConsolidado, liquidacionId: string) {
    const costoPresupuestado = Number(record.metadata.costo_presupuestado || 0)
    const desvio = record.monto - costoPresupuestado
    const sourceType = record.source_type
    const liquidacionItemId = String(record.metadata.liquidacion_item_id || "")

    return {
      id: liquidacionItemId || `${sourceType}_${record.source_id}`,
      liquidacion_item_id: liquidacionItemId || null,
      source_type: sourceType,
      source_id: record.source_id,
      liquidacion_id: liquidacionId,
      cotizacion_item_id: record.metadata.cotizacion_item_id || null,
      descripcion: record.metadata.descripcion || record.referencia,
      proveedor_id: record.metadata.proveedor_id || null,
      proveedor_nombre: record.metadata.proveedor_nombre || null,
      costo_presupuestado: costoPresupuestado,
      costo_real: record.monto,
      desvio,
      desvio_pct: costoPresupuestado > 0 ? (desvio / costoPresupuestado) * 100 : record.monto > 0 ? 100 : 0,
      es_adicional_rq: sourceType === "rq_adicional",
      es_caja_chica: sourceType === "caja_chica",
      es_traslado_logistica: sourceType === "traslado",
      caja_chica_id: record.metadata.caja_chica_id || null,
      traslado_logistica_id: record.metadata.traslado_logistica_id || null,
      rq_id: record.metadata.rq_id || null,
      rq_codigo: record.metadata.rq_codigo || null,
      rq_estado: record.metadata.rq_estado || record.estado || null,
      monto_solicitado: Number(record.metadata.monto_solicitado || 0),
      monto_rendido: Number(record.metadata.monto_rendido || 0),
      monto_devolucion: Number(record.metadata.monto_devolucion || 0),
      fecha_rendicion: record.metadata.fecha_rendicion || null,
      observacion_rendicion: record.metadata.observacion_rendicion || null,
      fecha_traslado: record.metadata.fecha_traslado || null,
      afecta_rentabilidad: record.afecta_rentabilidad,
      estado: record.estado,
    }
  }

  async function load() {
    setError("")
    const proyectoIdParam = new URLSearchParams(window.location.search).get("proyecto_id") || ""
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeAccederRuta(p?.perfil, "/liquidaciones")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const { data: liqs, error: liquidacionesError } = await supabase
      .from("liquidaciones")
      .select("*, proyecto:proyectos(nombre, codigo, deleted_at, cliente:clientes(razon_social))")
      .order("created_at", { ascending: false })

    const liqsActivas = (liqs || []).filter((liq: any) => !rowBelongsToDeletedProject(liq))
    setLiquidaciones(liqsActivas)

    const liqProyecto = proyectoIdParam ? liqsActivas.find((liq: any) => liq.proyecto_id === proyectoIdParam) : null
    if (liqProyecto) await abrirLiquidacion(liqProyecto)

    const { data: provs, error: proyectosError } = await supabase
      .from("proyectos")
      .select("id, nombre, codigo, cotizacion_aprobada_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    setProyectos(provs || [])
    const loadErrors = [liquidacionesError?.message, proyectosError?.message].filter(Boolean)
    if (loadErrors.length) setError(loadErrors.join(" · "))
    setLoading(false)
  }
  async function crearLiquidacion(proyectoId: string) {
    if (!autorizado) return
    const proyectoActivo = proyectos.find((p: any) => p.id === proyectoId)
    if (!proyectoActivo) {
      alert("No se puede liquidar un proyecto eliminado o no disponible.")
      return
    }
    setCreando(true)
    if (!proyectoActivo.cotizacion_aprobada_id) {
      alert("No hay cotización vigente aprobada para este proyecto")
      setCreando(false)
      return
    }

    const { data: cotAprobada } = await supabase
      .from("cotizaciones")
      .select("*, cotizacion_items(*)")
      .eq("id", proyectoActivo.cotizacion_aprobada_id)
      .maybeSingle()

    if (!cotAprobada) { alert("No hay cotización aprobada para este proyecto"); setCreando(false); return }

    const totalCostoPresup = cotAprobada.subtotal_costo || 0
    const totalPrecioPresup = cotAprobada.total_cliente || 0
    const margenPresup = cotAprobada.margen_pct || 0

    const { data: liq } = await supabase.from("liquidaciones").insert({
      proyecto_id: proyectoId,
      costo_presupuestado: totalCostoPresup,
      precio_cliente_presupuestado: totalPrecioPresup,
      margen_presupuestado_pct: margenPresup,
      costo_real: 0,
      precio_cliente_real: totalPrecioPresup,
      margen_real_pct: 0,
      cerrada: false,
    }).select().single()

    if (liq && cotAprobada.cotizacion_items?.length > 0) {
      const liqItems = cotAprobada.cotizacion_items.map((item: any) => ({
        liquidacion_id: liq.id,
        cotizacion_item_id: item.id,
        descripcion: item.descripcion,
        proveedor_id: item.proveedor_id || null,
        proveedor_nombre: item.proveedor_nombre || null,
        costo_presupuestado: item.costo_total || 0,
        costo_real: 0,
        desvio: 0,
        desvio_pct: 0,
      }))
      await supabase.from("liquidacion_items").insert(liqItems)
    }

    setCreando(false)
    load()
    if (liq) abrirLiquidacion(liq)
  }

  async function abrirLiquidacion(liq: any) {
    if (!autorizado) return
    if (rowBelongsToDeletedProject(liq)) {
      alert("Esta liquidacion pertenece a un proyecto eliminado y no puede abrirse como activa.")
      return
    }

    setSelected(liq)
    setLoadingItems(true)
    setDetailError("")

    const { data: liqItems, error: itemsError } = await supabase
      .from("liquidacion_items")
      .select("*")
      .eq("liquidacion_id", liq.id)

    const { data: cotItems, error: cotizacionItemsError } = await supabase
      .from("cotizacion_items")
      .select("id, proveedor_id, proveedor_nombre")
      .in("id", (liqItems || []).map((i: any) => i.cotizacion_item_id).filter(Boolean))

    const { data: rqs, error: rqsError } = await supabase
      .from("requerimientos_pago")
      .select("id, codigo_rq, numero_rq, estado, proveedor_id, proveedor_nombre, descripcion, monto_solicitado, monto_rendido, monto_devolucion, fecha_rendicion, observacion_rendicion, cotizacion_item_id, es_adicional, solicitado_por")
      .eq("proyecto_id", liq.proyecto_id)

    const { data: facturasProyecto, error: facturasError } = await supabase
      .from("facturas")
      .select("id, estado, subtotal, igv, monto_final_abonado")
      .eq("proyecto_id", liq.proyecto_id)

    const { data: cajaChicaProyecto, error: cajaChicaError } = await supabase
      .from("caja_chica")
      .select("id, concepto, categoria, monto_debe, monto_haber, estado, fecha, observaciones, proyecto_id, rq_id")
      .eq("proyecto_id", liq.proyecto_id)
      .eq("estado", "aprobado")

    const { data: trasladosLogistica, error: trasladosError } = await supabase
      .from("logistica_traslados")
      .select("id,codigo,titulo,estado,costo_real,afecta_rentabilidad,punto_recojo,punto_entrega,fecha_salida,fecha_entrega,fecha_entrega_real,proyecto_id")
      .eq("proyecto_id", liq.proyecto_id)

    const detailErrors = [itemsError?.message, cotizacionItemsError?.message, rqsError?.message, facturasError?.message, cajaChicaError?.message, trasladosError?.message].filter(Boolean)
    if (detailErrors.length) setDetailError(detailErrors.join(" · "))

    const facturasActivasProyecto = (facturasProyecto || []).filter((f: any) => !esFacturaAnulada(f))
    const facturado = facturasActivasProyecto.reduce((s: number, f: any) => s + totalFactura(f), 0)
    const cobrado = facturasActivasProyecto.reduce((s: number, f: any) => s + montoCobradoFactura(f), 0)
    const pendiente = facturasActivasProyecto.reduce((s: number, f: any) => s + saldoPendienteFactura(f), 0)
    setFacturacionResumen({ facturado, cobrado, pendiente, facturas: facturasActivasProyecto.length })

    const cotItemMap = new Map((cotItems || []).map((c: any) => [c.id, c]))
    const liquidacionItemsConProveedor = (liqItems || []).map((item: any) => {
      const cotItem: any = cotItemMap.get(item.cotizacion_item_id)
      return {
        ...item,
        proveedor_id: item.proveedor_id || cotItem?.proveedor_id || null,
        proveedor_nombre: item.proveedor_nombre || cotItem?.proveedor_nombre || null,
      }
    })

    const consolidado = consolidarCostosProyecto({
      proyectoId: liq.proyecto_id,
      precioBase: liq.precio_cliente_presupuestado || 0,
      liquidacionItems: liquidacionItemsConProveedor,
      rqs: rqs || [],
      cajaChica: cajaChicaProyecto || [],
      traslados: trasladosLogistica || [],
    })

    setConsolidacion(consolidado)
    setItems(consolidado.registrosIncluidos.map((record) => itemDesdeRegistroCosto(record, liq.id)))
    setLoadingItems(false)
  }

  async function updateItemReal(itemId: string, costoReal: number) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const desvio = costoReal - (item.costo_presupuestado || 0)
    const desvioPct = item.costo_presupuestado > 0 ? (desvio / item.costo_presupuestado) * 100 : 0
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, costo_real: costoReal, desvio, desvio_pct: desvioPct } : i))
  }

  async function guardarRendicionAdicional(item: any, montoRendido: number) {
    if (!item?.rq_id || selected?.cerrada) return

    const montoSolicitado = Number(item.monto_solicitado || item.costo_real || 0)
    const montoDevolucion = Math.max(0, montoSolicitado - (Number(montoRendido) || 0))

    await supabase.from("requerimientos_pago").update({
      monto_rendido: Number(montoRendido) || 0,
      monto_devolucion: montoDevolucion,
      fecha_rendicion: new Date().toISOString().split("T")[0],
    }).eq("id", item.rq_id)

    setItems(prev => prev.map((i:any) => i.id === item.id ? {
      ...i,
      monto_rendido: Number(montoRendido) || 0,
      monto_devolucion: montoDevolucion,
      costo_real: Number(montoRendido) || 0,
      desvio: Number(montoRendido) || 0,
    } : i))
  }
  async function guardarItems() {
    const rol = perfil?.perfil
    const puedeGuardar =
      (rol === "gerente_produccion" && !selected.aprobado_produccion) ||
      (["controller", "superadmin"].includes(rol) && !selected.aprobado_controller && !selected.cerrada)

    if (!puedeGuardar) {
      alert("No tienes permisos para guardar cambios en esta liquidación.")
      return
    }

    for (const item of items) {
      if (!item.liquidacion_item_id) continue
      const { error: itemError } = await supabase.from("liquidacion_items").update({
        costo_real: item.costo_real || 0,
        desvio: item.desvio || 0,
        desvio_pct: item.desvio_pct || 0,
      }).eq("id", item.liquidacion_item_id)
      if (itemError) {
        alert("No se pudo guardar un ítem de liquidación: " + itemError.message)
        return
      }
    }
    const resumen = resumenDesdeItemsConsolidados(items, selected.precio_cliente_presupuestado || 0)
    const costoReal = resumen.totalReal
    const precioReal = selected.precio_cliente_presupuestado || 0
    const margenReal = resumen.rentabilidadPct
    const desvioCosto = costoReal - (selected.costo_presupuestado || 0)
    const desvioMargen = margenReal - (selected.margen_presupuestado_pct || 0)
    const { error: liquidacionError } = await supabase.from("liquidaciones").update({
      costo_real: costoReal,
      precio_cliente_real: precioReal,
      margen_real_pct: margenReal,
      desvio_costo: desvioCosto,
      desvio_margen_pp: desvioMargen,
    }).eq("id", selected.id)
    if (liquidacionError) {
      alert("No se pudo actualizar la liquidación: " + liquidacionError.message)
      return
    }
    setSelected({ ...selected, costo_real: costoReal, margen_real_pct: margenReal, desvio_costo: desvioCosto, desvio_margen_pp: desvioMargen })
    alert("Liquidación actualizada")
    load()
  }

  async function aprobarLiquidacion() {
    if (!perfil) return
    const rol = perfil.perfil
    const updates: any = {}
    if (rol === "gerente_produccion" && !selected.aprobado_produccion) {
      updates.aprobado_produccion = true
      updates.aprobado_produccion_por = perfil.id
      updates.aprobado_produccion_at = new Date().toISOString()
    } else if (rol === "controller" && selected.aprobado_produccion && !selected.aprobado_controller) {
      if (consolidacion) {
        const validacion = validarConsolidacionParaController(consolidacion)
        if (validacion.bloqueos.length > 0) {
          alert("No se puede aprobar la liquidación:\n" + validacion.bloqueos.join("\n"))
          return
        }
        if (validacion.advertencias.length > 0 && !confirm("Advertencias de consolidación:\n" + validacion.advertencias.join("\n") + "\n\n¿Confirmas que fueron revisadas?")) {
          return
        }
      }
      const resumen = resumenDesdeItemsConsolidados(items, selected.precio_cliente_presupuestado || 0)
      const desvioCosto = resumen.totalReal - (selected.costo_presupuestado || 0)
      updates.aprobado_controller = true
      updates.aprobado_controller_por = perfil.id
      updates.aprobado_controller_at = new Date().toISOString()
      updates.cerrada = true
      updates.costo_real = resumen.totalReal
      updates.precio_cliente_real = selected.precio_cliente_presupuestado || 0
      updates.margen_real_pct = resumen.rentabilidadPct
      updates.desvio_costo = desvioCosto
      updates.desvio_margen_pp = resumen.rentabilidadPct - (selected.margen_presupuestado_pct || 0)
      await enviarAlerta("proyecto_liquidado", { nombre: selected?.proyecto?.nombre || "Proyecto", codigo: selected?.proyecto?.codigo || "", margen: selected?.margen_real_pct?.toFixed(1) || "0" })
      updates.fecha_cierre = new Date().toISOString()
    }
    if (Object.keys(updates).length > 0) {
      const { error: aprobarError } = await supabase.from("liquidaciones").update(updates).eq("id", selected.id)
      if (aprobarError) {
        alert("No se pudo aprobar la liquidación: " + aprobarError.message)
        return
      }
      setSelected({ ...selected, ...updates })
      load()
    }
  }

  async function cerrarLiquidacion() {
    if (!autorizado) return
    if (!["controller", "superadmin"].includes(perfil?.perfil)) {
      alert("Solo Controller o Superadmin pueden cerrar una liquidación.")
      return
    }
    if (!selected?.aprobado_controller) {
      alert("No se puede cerrar una liquidación sin aprobación de Controller.")
      return
    }
    if (consolidacion) {
      const validacion = validarConsolidacionParaController(consolidacion)
      if (validacion.bloqueos.length > 0) {
        alert("No se puede cerrar la liquidación:\n" + validacion.bloqueos.join("\n"))
        return
      }
    }
    const resumen = resumenDesdeItemsConsolidados(items, selected.precio_cliente_presupuestado || 0)
    if (Math.abs(Number(selected.costo_real || 0) - resumen.totalReal) > 0.01) {
      alert("El costo real guardado no coincide con la consolidación actual. Guarda la liquidación antes de cerrar.")
      return
    }
    if (!confirm("¿Cerrar esta liquidación? Ya no se podrá editar.")) return
    const { error: cerrarError } = await supabase.from("liquidaciones").update({ cerrada: true, aprobada_por: perfil?.id, fecha_cierre: new Date().toISOString() }).eq("id", selected.id)
    if (cerrarError) {
      alert("No se pudo cerrar la liquidación: " + cerrarError.message)
      return
    }
    setSelected({ ...selected, cerrada: true })
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtPct = (n: number) => Number(n || 0).toFixed(1) + "%"
  const precioClientePresupuestadoLive = Number(selected?.precio_cliente_presupuestado || 0)
  const precioClienteRealLive = Number(selected?.precio_cliente_real || selected?.precio_cliente_presupuestado || 0)
  const resumenLive = resumenDesdeItemsConsolidados(items, precioClienteRealLive)
  const totalPresupuestadoLive = resumenLive.totalPresupuestado
  const totalRealLive = resumenLive.totalReal
  const totalRealAdicionalesLive = resumenLive.totalAdicionales
  const totalRealCajaChicaLive = resumenLive.totalCajaChica
  const totalRealTrasladosLive = resumenLive.totalTraslados
  const margenInicialLive = Number(selected?.margen_presupuestado_pct || 0)
  const margenRealLive = resumenLive.rentabilidadPct
  const desvioCostoLive = totalRealLive - totalPresupuestadoLive
  const desvioMargenLive = margenRealLive - margenInicialLive
  const utilidadProyectadaLive = precioClientePresupuestadoLive - totalPresupuestadoLive
  const utilidadRealLive = precioClienteRealLive - totalRealLive
  const precioFacturadoLive = Number(facturacionResumen.facturado || 0)
  const precioBaseFinancieroLive = precioFacturadoLive > 0 ? precioFacturadoLive : precioClienteRealLive
  const utilidadFinancieraLive = precioBaseFinancieroLive - totalRealLive
  const margenFinancieroLive = precioBaseFinancieroLive > 0 ? (utilidadFinancieraLive / precioBaseFinancieroLive) * 100 : 0
  const variacionFacturacionLive = precioFacturadoLive > 0 ? precioFacturadoLive - precioClientePresupuestadoLive : 0
  const estadoFinancieroLive =
    margenFinancieroLive < 0 ? { label: "Pérdida", color: "#111827", bg: "#F3F4F6" } :
    margenFinancieroLive < 10 ? { label: "Crítico", color: "#DC2626", bg: "#FEF2F2" } :
    margenFinancieroLive < 20 ? { label: "Atención", color: "#D97706", bg: "#FFFBEB" } :
    { label: "Saludable", color: "#15803D", bg: "#F0FDF4" }

  const itemsLiquidacionOrdenados = [...items].sort((a:any, b:any) => {
    const aRealizado = Number(a.costo_real || 0) > 0 || ["pagado", "programado", "aprobado", "aprobado_produccion"].includes(a.rq_estado)
    const bRealizado = Number(b.costo_real || 0) > 0 || ["pagado", "programado", "aprobado", "aprobado_produccion"].includes(b.rq_estado)
    if (aRealizado !== bRealizado) return aRealizado ? -1 : 1
    return String(a.descripcion || "").localeCompare(String(b.descripcion || ""))
  })

  const getRqNumber = (item:any) => {
    const raw = String(item.rq_codigo || "")
    const match = raw.match(/(\d+)$/)
    return match ? Number(match[1]) : 999999999
  }

  const itemsPresupuestados = itemsLiquidacionOrdenados.filter((i:any) => !i.es_adicional_rq && !i.es_caja_chica && !i.es_traslado_logistica)

  const itemsAdicionales = itemsLiquidacionOrdenados
    .filter((i:any) => i.es_adicional_rq)
    .sort((a:any, b:any) => getRqNumber(a) - getRqNumber(b))

  const itemsCajaChica = itemsLiquidacionOrdenados
    .filter((i:any) => i.es_caja_chica)

  const itemsTraslados = itemsLiquidacionOrdenados
    .filter((i:any) => i.es_traslado_logistica)

  const inp: any = { padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Liquidaciones</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{liquidaciones.length} liquidaciones</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            onChange={e => { if (e.target.value) crearLiquidacion(e.target.value); e.target.value = "" }}>
            <option value="">+ Nueva liquidación</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </select>
          <ImportExport modulo="liquidaciones" campos={[{key:"proyecto_nombre",label:"Proyecto"},{key:"costo_presupuestado",label:"Costo presupuestado"},{key:"precio_cliente_presupuestado",label:"Precio cliente"},{key:"margen_presupuestado_pct",label:"Margen %"},{key:"margen_real_pct",label:"Margen real %"}]} datos={liquidaciones.map((l:any)=>({...l,proyecto_nombre:l.proyecto?.nombre,proyecto_codigo:l.proyecto?.codigo}))} onImportar={async () => ({ exitosos: 0, errores: ["Las liquidaciones se generan automaticamente"] })} />
        </div>
      </div>
      <FinanceDataError detail={[error, detailError].filter(Boolean).join(" · ")} />

      <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Proyectos</div>
          </div>
          {liquidaciones.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay liquidaciones</div>
          ) : (
            liquidaciones.map((liq, idx) => (
              <div key={liq.id} onClick={() => abrirLiquidacion(liq)}
                style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selected?.id === liq.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{liq.proyecto?.codigo}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{liq.proyecto?.nombre}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{liq.proyecto?.cliente?.razon_social}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ background: liq.cerrada ? "#dcfce7" : "#fef9c3", color: liq.cerrada ? "#15803d" : "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                      {liq.cerrada ? "Cerrada" : "Abierta"}
                    </span>
                    {liq.margen_real_pct > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: liq.margen_real_pct >= 30 ? "#0F6E56" : "#dc2626", marginTop: 4 }}>
                        {fmtPct(liq.margen_real_pct)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{selected.proyecto?.codigo} — {selected.proyecto?.nombre}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.proyecto?.cliente?.razon_social}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!selected.cerrada && perfil?.perfil === "gerente_produccion" && !selected.aprobado_produccion && (
                  <button onClick={aprobarLiquidacion} className="btn-primary" style={{ fontSize: 12 }}>Aprobar (Produccion)</button>
                )}
                {!selected.cerrada && perfil?.perfil === "controller" && selected.aprobado_produccion && !selected.aprobado_controller && (
                  <button onClick={aprobarLiquidacion} className="btn-primary" style={{ fontSize: 12 }}>Aprobar liquidación</button>
                )}
                {selected.aprobado_produccion && !selected.aprobado_controller && (
                  <span style={{ fontSize: 11, color: "#15803d" }}>✓ Aprobado Producción · Pendiente Controller</span>
                )}
                {selected.aprobado_controller && (
                  <span style={{ fontSize: 11, color: "#15803d" }}>✓ Aprobado Controller</span>
                )}
                {selected.cerrada && (
                  <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>✓ Liquidacion cerrada y aprobada</span>
                )}
                {!selected.cerrada && (
                    <>
                      <button onClick={guardarItems} className="btn-secondary" style={{ fontSize: 12 }}>Guardar</button>

                    </>
                  )}
                  {selected.cerrada && <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>✓ Liquidación cerrada</span>}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 16,
                }}
              >
                <KpiCard
                  label="PRECIO CLIENTE"
                  value={fmt(precioClienteRealLive)}
                  sub="Venta final"
                  icon="wallet"
                  borderColor="#16A34A"
                  valueColor="#15803D"
                />

                <KpiCard
                  label="COSTO PRESUPUESTADO"
                  value={fmt(totalPresupuestadoLive)}
                  sub="Costo planificado"
                  icon="chart"
                  borderColor="#2563EB"
                  valueColor="#1E40AF"
                />

                <KpiCard
                  label="COSTO REAL"
                  value={fmt(totalRealLive)}
                  sub="Costo ejecutado"
                  icon="money"
                  borderColor="#64748B"
                />

                <KpiCard
                  label="DESVÍO"
                  value={fmt(desvioCostoLive)}
                  sub={`${Math.abs(totalPresupuestadoLive > 0 ? (desvioCostoLive / totalPresupuestadoLive) * 100 : 0).toFixed(1)}%`}
                  icon="shield"
                  borderColor={desvioCostoLive > 0 ? "#DC2626" : "#16A34A"}
                  valueColor={desvioCostoLive > 0 ? "#DC2626" : "#15803D"}
                />

                <KpiCard
                  label="MARGEN INICIAL"
                  value={fmtPct(margenInicialLive)}
                  sub="Presupuestado"
                  icon="chart"
                  borderColor="#2563EB"
                  valueColor="#1E40AF"
                />

                <KpiCard
                  label="MARGEN FINAL"
                  value={fmtPct(margenRealLive)}
                  sub="Resultado real"
                  icon="chart"
                  borderColor={margenRealLive >= margenInicialLive ? "#16A34A" : "#DC2626"}
                  valueColor={margenRealLive >= margenInicialLive ? "#15803D" : "#DC2626"}
                />

                <KpiCard
                  label="UTILIDAD REAL"
                  value={fmt(utilidadRealLive)}
                  sub="Ganancia final"
                  icon="wallet"
                  borderColor="#16A34A"
                  valueColor="#15803D"
                />

                <KpiCard
                  label="ESTADO FINANCIERO"
                  value={margenRealLive >= 30 ? "Rentable" : margenRealLive >= 15 ? "Riesgo" : "Pérdida"}
                  sub="Rentabilidad proyecto"
                  icon="shield"
                  borderColor={margenRealLive >= 30 ? "#16A34A" : margenRealLive >= 15 ? "#D97706" : "#DC2626"}
                />
              </div>

              {consolidacion && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 12, color: "#475569" }}>
                  <strong style={{ color: "#0F172A" }}>Consolidación:</strong>{" "}
                  Adicionales {fmt(totalRealAdicionalesLive)} · Caja chica {fmt(totalRealCajaChicaLive)} · Traslados {fmt(totalRealTrasladosLive)}
                  {consolidacion.errores.length > 0 && (
                    <div style={{ marginTop: 8, color: "#B91C1C", fontWeight: 700 }}>
                      Bloqueos: {consolidacion.errores.join(" · ")}
                    </div>
                  )}
                  {(consolidacion.advertencias.length > 0 || consolidacion.posiblesColisiones.length > 0) && (
                    <div style={{ marginTop: 8, color: "#92400E" }}>
                      Advertencias: {[...consolidacion.advertencias, ...consolidacion.posiblesColisiones].join(" · ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <SectionCard title="Facturación del proyecto" action={<span style={{ background: estadoFinancieroLive.bg, color: estadoFinancieroLive.color, border: `1px solid ${estadoFinancieroLive.color}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 900 }}>Estado: {estadoFinancieroLive.label}</span>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12 }}>
                {[
                  { label: "Presupuestado", value: fmt(precioClientePresupuestadoLive), color: "#1E40AF" },
                  { label: "Facturado", value: fmt(precioFacturadoLive), color: precioFacturadoLive >= precioClientePresupuestadoLive ? "#15803D" : "#D97706" },
                  { label: "Cobrado", value: fmt(facturacionResumen.cobrado), color: "#15803D" },
                  { label: "Pendiente", value: fmt(facturacionResumen.pendiente), color: facturacionResumen.pendiente > 0 ? "#DC2626" : "#15803D" },
                  { label: "Variación", value: fmt(variacionFacturacionLive), color: variacionFacturacionLive >= 0 ? "#15803D" : "#DC2626" },
                ].map((item: any) => (
                  <div key={item.label} style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 12, background: "#FFFFFF" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Margen financiero · {estadoFinancieroLive.label}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Calculado con facturación real si existe; si no, usa precio cliente de la liquidación.</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: margenFinancieroLive >= 15 ? "#15803D" : "#DC2626" }}>{fmtPct(margenFinancieroLive)}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{facturacionResumen.facturas} factura(s)</div>
                </div>
              </div>
            </SectionCard>

            <div style={{ height: 16 }} />

            <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>Gastos presupuestados <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 999, padding: "2px 8px", fontSize: 11, marginLeft: 8 }}>{itemsPresupuestados.length} items</span></div>
              </div>
              {loadingItems ? (
                <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>Cargando ítems...</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RQ</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO RQ</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRESUPUESTADO</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>REAL</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESVÍO</th>
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESVÍO %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPresupuestados.map((item, idx) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #F1F5F9", background: item.es_adicional_rq ? "#FFFBEB" : "#FFFFFF" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151" }}>
                          {item.es_adicional_rq && (
                            <span style={{ display: "inline-block", marginRight: 6, background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>
                              ADICIONAL
                            </span>
                          )}
                          {item.descripcion || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569" }}>{item.proveedor_nombre || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12 }}>
                          {item.rq_id ? (
                            <a href={`/rq?rq_id=${item.rq_id}`} style={{ color: "#0F6E56", fontWeight: 700, textDecoration: "none" }}>
                              {item.rq_codigo || "RQ"}
                            </a>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11 }}>
                          {item.rq_estado ? (
                            <StatusBadge
                              label={item.rq_estado === "pendiente_aprobacion" ? "Pendiente" : item.rq_estado}
                              type={item.rq_estado}
                            />
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>{fmt(item.costo_presupuestado)}</td>
                        <td style={{ padding: "6px 12px" }}>
                          {selected.cerrada ? (
                            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: item.costo_real > item.costo_presupuestado ? "#dc2626" : "#15803d" }}>{fmt(item.costo_real)}</div>
                          ) : (
                            <input type="number" style={{ ...inp, textAlign: "right" }} value={item.costo_real || ""}
                              placeholder="0" onChange={e => updateItemReal(item.id, Number(e.target.value))} />
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (item.desvio || 0) > 0 ? "#dc2626" : "#15803d" }}>
                          {item.desvio !== 0 ? fmt(item.desvio) : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 600, color: (item.desvio_pct || 0) > 0 ? "#dc2626" : "#15803d" }}>
                          {item.desvio_pct !== 0 ? fmtPct(item.desvio_pct) : "—"}
                        </td>
                      </tr>
                    ))}
                    {itemsPresupuestados.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay ítems</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ height: 16 }} />

            <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                  Gastos adicionales <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "2px 8px", fontSize: 11, marginLeft: 8 }}>{itemsAdicionales.length} RQ extras</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#DC2626" }}>
                  Impacto: {fmt(totalRealAdicionalesLive)}
                </div>
              </div>

              {loadingItems ? (
                <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>Cargando RQ adicionales...</div>
              ) : itemsAdicionales.length === 0 ? (
                <div style={{ padding: 24, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                  No hay gastos adicionales registrados
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FFFBEB", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RQ</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SOLICITADO</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RENDIDO</th>
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DEVUELTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsAdicionales.map((item:any) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #F1F5F9", background: "#FFFBEB" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151" }}>{item.descripcion || "RQ adicional"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#475569" }}>{item.proveedor_nombre || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12 }}>
                          {item.rq_id ? (
                            <a href={`/rq?rq_id=${item.rq_id}`} style={{ color: "#0F6E56", fontWeight: 700, textDecoration: "none" }}>
                              {item.rq_codigo || "RQ"}
                            </a>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11 }}>
                          {item.rq_estado ? (
                            <StatusBadge
                              label={item.rq_estado === "pendiente_aprobacion" ? "Pendiente" : item.rq_estado}
                              type={item.rq_estado}
                            />
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>
                          {fmt(item.monto_solicitado || item.costo_real)}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          {selected.cerrada ? (
                            <div style={{ fontSize: 13, fontWeight: 800, color: item.monto_rendido > 0 ? "#DC2626" : "#92400E" }}>
                              {item.monto_rendido > 0 ? fmt(item.monto_rendido) : "Pendiente"}
                            </div>
                          ) : (
                            <input
                              type="number"
                              style={{ ...inp, textAlign: "right", fontWeight: 700 }}
                              value={item.monto_rendido || ""}
                              placeholder="Rendir"
                              onChange={e => guardarRendicionAdicional(item, Number(e.target.value))}
                            />
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: item.monto_devolucion > 0 ? "#15803d" : "#9ca3af" }}>
                          {item.monto_devolucion > 0 ? fmt(item.monto_devolucion) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ height: 16 }} />

            <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                  Caja chica y traslados <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 999, padding: "2px 8px", fontSize: 11, marginLeft: 8 }}>{itemsCajaChica.length + itemsTraslados.length} costos</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#334155" }}>
                  Total: {fmt(totalRealCajaChicaLive + totalRealTrasladosLive)}
                </div>
              </div>

              {itemsCajaChica.length + itemsTraslados.length === 0 ? (
                <div style={{ padding: 24, color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                  No hay caja chica ni traslados que afecten rentabilidad
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ORIGEN</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONCEPTO</th>
                      <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>COSTO REAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...itemsCajaChica, ...itemsTraslados].map((item:any) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 800, color: item.es_traslado_logistica ? "#1E40AF" : "#0F6E56" }}>
                          {item.es_traslado_logistica ? "Traslado" : "Caja chica"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>{item.descripcion || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11 }}>
                          <StatusBadge label={item.rq_estado || item.estado || "Aprobado"} type={item.rq_estado || item.estado || "aprobado"} />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 800 }}>{fmt(item.costo_real)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

































