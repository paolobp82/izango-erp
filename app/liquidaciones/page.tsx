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
import { puedeAccederRuta } from "@/lib/permissions"

export default function LiquidacionesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [liquidaciones, setLiquidaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
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

    const { data: liqs } = await supabase
      .from("liquidaciones")
      .select("*, proyecto:proyectos(nombre, codigo, deleted_at, cliente:clientes(razon_social))")
      .order("created_at", { ascending: false })

    const liqsActivas = (liqs || []).filter((liq: any) => !rowBelongsToDeletedProject(liq))
    setLiquidaciones(liqsActivas)

    const liqProyecto = proyectoIdParam ? liqsActivas.find((liq: any) => liq.proyecto_id === proyectoIdParam) : null
    if (liqProyecto) await abrirLiquidacion(liqProyecto)

    const { data: provs } = await supabase
      .from("proyectos")
      .select("id, nombre, codigo")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    setProyectos(provs || [])
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
    const { data: cots } = await supabase
      .from("cotizaciones")
      .select("*, cotizacion_items(*)")
      .eq("proyecto_id", proyectoId)
      .eq("estado", "aprobada_cliente")
      .order("version", { ascending: false })
      .limit(1)

    const cotAprobada = cots?.[0]
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

    const { data: liqItems } = await supabase
      .from("liquidacion_items")
      .select("*")
      .eq("liquidacion_id", liq.id)

    const { data: cotItems } = await supabase
      .from("cotizacion_items")
      .select("id, proveedor_id, proveedor_nombre")
      .in("id", (liqItems || []).map((i: any) => i.cotizacion_item_id).filter(Boolean))

    const { data: rqs } = await supabase
      .from("requerimientos_pago")
      .select("id, codigo_rq, numero_rq, estado, proveedor_id, proveedor_nombre, descripcion, monto_solicitado, cotizacion_item_id, es_adicional")
      .eq("proyecto_id", liq.proyecto_id)

    const cotItemMap = new Map((cotItems || []).map((c: any) => [c.id, c]))
    const rqByCotizacionItemId = new Map(
      (rqs || [])
        .filter((rq: any) => rq.cotizacion_item_id)
        .map((rq: any) => [rq.cotizacion_item_id, rq])
    )

    const normalizar = (txt: string) =>
      String(txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()

    const enriched = (liqItems || []).map((item: any) => {
      const cotItem: any = cotItemMap.get(item.cotizacion_item_id)
      const proveedorId = item.proveedor_id || cotItem?.proveedor_id || null
      const proveedorNombre = item.proveedor_nombre || cotItem?.proveedor_nombre || null
      const descItem = normalizar(item.descripcion)

      const rqExacto = rqByCotizacionItemId.get(item.cotizacion_item_id)

      const rqMatch = rqExacto || (rqs || []).find((rq: any) => {
        const mismoProveedor =
          proveedorId && rq.proveedor_id
            ? rq.proveedor_id === proveedorId
            : normalizar(rq.proveedor_nombre) && normalizar(proveedorNombre) && normalizar(rq.proveedor_nombre) === normalizar(proveedorNombre)

        const descRq = normalizar(rq.descripcion)
        const descripcionParecida =
          descItem &&
          descRq &&
          (descRq.includes(descItem.slice(0, 24)) || descItem.includes(descRq.slice(0, 24)))

        return mismoProveedor || descripcionParecida
      })

      const montoRq = Number(rqMatch?.monto_solicitado || 0)
      const costoRealActual = Number(item.costo_real || 0)
      const costoRealCalculado = costoRealActual > 0 ? costoRealActual : montoRq
      const costoPresupuestado = Number(item.costo_presupuestado || 0)
      const desvioCalculado = costoRealCalculado - costoPresupuestado

      return {
        ...item,
        proveedor_id: proveedorId,
        proveedor_nombre: proveedorNombre,
        costo_real: costoRealCalculado,
        desvio: desvioCalculado,
        desvio_pct: costoPresupuestado > 0 ? (desvioCalculado / costoPresupuestado) * 100 : 0,
        rq_id: rqMatch?.id || null,
        rq_codigo: rqMatch?.codigo_rq || (rqMatch?.numero_rq ? `RQ-${String(rqMatch.numero_rq).padStart(5, "0")}` : null),
        rq_estado: rqMatch?.estado || null,
      }
    })

    const idsRqYaMostrados = new Set(enriched.map((item: any) => item.rq_id).filter(Boolean))

    const adicionales = (rqs || [])
      .filter((rq: any) =>
        !rq.cotizacion_item_id &&
        !idsRqYaMostrados.has(rq.id) &&
        !["cancelado", "rechazado"].includes(rq.estado)
      )
      .map((rq: any) => ({
        id: `rq_extra_${rq.id}`,
        liquidacion_id: liq.id,
        cotizacion_item_id: null,
        descripcion: rq.descripcion || "RQ adicional",
        proveedor_id: rq.proveedor_id || null,
        proveedor_nombre: rq.proveedor_nombre || null,
        costo_presupuestado: 0,
        costo_real: rq.monto_solicitado || 0,
        desvio: rq.monto_solicitado || 0,
        desvio_pct: 100,
        es_adicional_rq: true,
        rq_id: rq.id,
        rq_codigo: rq.codigo_rq || (rq.numero_rq ? `RQ-${String(rq.numero_rq).padStart(5, "0")}` : "RQ"),
        rq_estado: rq.estado || null,
      }))

    setItems([...enriched, ...adicionales])
    setLoadingItems(false)
  }

  async function updateItemReal(itemId: string, costoReal: number) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const desvio = costoReal - (item.costo_presupuestado || 0)
    const desvioPct = item.costo_presupuestado > 0 ? (desvio / item.costo_presupuestado) * 100 : 0
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, costo_real: costoReal, desvio, desvio_pct: desvioPct } : i))
  }

  async function guardarItems() {
    for (const item of items) {
      if (String(item.id).startsWith("rq_extra_")) continue
      await supabase.from("liquidacion_items").update({
        costo_real: item.costo_real || 0,
        desvio: item.desvio || 0,
        desvio_pct: item.desvio_pct || 0,
      }).eq("id", item.id)
    }
    const costoReal = items.reduce((s, i) => s + (Number(i.costo_real) || 0), 0)
    const precioReal = selected.precio_cliente_presupuestado || 0
    const margenReal = precioReal > 0 ? ((precioReal - costoReal) / precioReal) * 100 : 0
    const desvioCosto = costoReal - (selected.costo_presupuestado || 0)
    const desvioMargen = margenReal - (selected.margen_presupuestado_pct || 0)
    await supabase.from("liquidaciones").update({
      costo_real: costoReal,
      precio_cliente_real: precioReal,
      margen_real_pct: margenReal,
      desvio_costo: desvioCosto,
      desvio_margen_pp: desvioMargen,
    }).eq("id", selected.id)
    const updatedLiq = { ...selected, costo_real: costoReal, margen_real_pct: margenReal, desvio_costo: desvioCosto, desvio_margen_pp: desvioMargen }
    setSelected(updatedLiq)
    setLiquidaciones(prev => prev.map(l => l.id === selected.id ? { ...l, ...updatedLiq } : l))
    alert("Guardado correctamente")
  }

  async function aprobarLiquidacion() {
    if (!perfil) return
    const rol = perfil.perfil
    const updates: any = {}
    if (rol === "gerente_produccion" && !selected.aprobado_produccion) {
      updates.aprobado_produccion = true
      updates.aprobado_produccion_por = perfil.id
      updates.aprobado_produccion_at = new Date().toISOString()
    } else if (rol === "gerente_general" && selected.aprobado_produccion && !selected.aprobado_gg) {
      updates.aprobado_gg = true
      updates.aprobado_gg_por = perfil.id
      updates.aprobado_gg_at = new Date().toISOString()
      updates.cerrada = true
      await enviarAlerta("proyecto_liquidado", { nombre: selected?.proyecto?.nombre || "Proyecto", codigo: selected?.proyecto?.codigo || "", margen: selected?.margen_real_pct?.toFixed(1) || "0" })
      updates.fecha_cierre = new Date().toISOString()
      if (selected.proyecto_id) {
        await supabase.from("proyectos").update({ estado: "facturado" }).eq("id", selected.proyecto_id)
      }
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("liquidaciones").update(updates).eq("id", selected.id)
      setSelected({ ...selected, ...updates })
      load()
    }
  }

  async function cerrarLiquidacion() {
    if (!autorizado) return
    if (!confirm("¿Cerrar esta liquidación? Ya no se podrá editar.")) return
    await supabase.from("liquidaciones").update({ cerrada: true, aprobada_por: perfil?.id, fecha_cierre: new Date().toISOString() }).eq("id", selected.id)
    setSelected({ ...selected, cerrada: true })
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtPct = (n: number) => Number(n || 0).toFixed(1) + "%"
  const totalPresupuestadoLive = items.filter((i:any) => !i.es_adicional_rq).reduce((s:number, i:any) => s + (Number(i.costo_presupuestado) || 0), 0)
  const totalRealPresupuestoLive = items.filter((i:any) => !i.es_adicional_rq).reduce((s:number, i:any) => s + (Number(i.costo_real) || 0), 0)
  const totalRealAdicionalesLive = items.filter((i:any) => i.es_adicional_rq).reduce((s:number, i:any) => s + (Number(i.costo_real) || 0), 0)
  const totalRealLive = totalRealPresupuestoLive + totalRealAdicionalesLive
  const precioClientePresupuestadoLive = Number(selected?.precio_cliente_presupuestado || 0)
  const precioClienteRealLive = Number(selected?.precio_cliente_real || selected?.precio_cliente_presupuestado || 0)
  const margenInicialLive = Number(selected?.margen_presupuestado_pct || 0)
  const margenRealLive = precioClienteRealLive > 0 ? ((precioClienteRealLive - totalRealLive) / precioClienteRealLive) * 100 : 0
  const desvioCostoLive = totalRealLive - totalPresupuestadoLive
  const desvioMargenLive = margenRealLive - margenInicialLive
  const utilidadProyectadaLive = precioClientePresupuestadoLive - totalPresupuestadoLive
  const utilidadRealLive = precioClienteRealLive - totalRealLive

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

  const itemsPresupuestados = itemsLiquidacionOrdenados.filter((i:any) => !i.es_adicional_rq)

  const itemsAdicionales = itemsLiquidacionOrdenados
    .filter((i:any) => i.es_adicional_rq)
    .sort((a:any, b:any) => getRqNumber(a) - getRqNumber(b))

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
                {!selected.cerrada && perfil?.perfil === "gerente_general" && selected.aprobado_produccion && !selected.aprobado_gg && (
                  <button onClick={aprobarLiquidacion} className="btn-primary" style={{ fontSize: 12 }}>Aprobar GG - Pasar a Facturacion</button>
                )}
                {selected.aprobado_produccion && !selected.aprobado_gg && (
                  <span style={{ fontSize: 11, color: "#15803d" }}>✓ Aprobado Produccion</span>
                )}
                {selected.cerrada && (
                  <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>✓ Liquidacion cerrada y aprobada</span>
                )}
                {!selected.cerrada && (
                    <>
                      <button onClick={guardarItems} className="btn-secondary" style={{ fontSize: 12 }}>Guardar</button>
                      <button onClick={cerrarLiquidacion} className="btn-primary" style={{ fontSize: 12 }}>Cerrar liquidación</button>
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
            </div>

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
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO REAL</th>
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
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#DC2626" }}>
                          {fmt(item.costo_real)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>          </div>
        )}
      </div>
    </div>
  )
}

















