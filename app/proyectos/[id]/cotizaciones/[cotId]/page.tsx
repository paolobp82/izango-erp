"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import { enviarAlerta } from "@/lib/alertas"

const COSTOS_INTERNOS = [
  { key: "costo_almacenaje", label: "Almacenaje" },
  { key: "costo_impresion", label: "Impresión" },
  { key: "costo_permisos", label: "Permisos" },
  { key: "costo_instalacion", label: "Instalación" },
  { key: "costo_performer", label: "Performer" },
  { key: "costo_alquiler", label: "Alquiler" },
  { key: "costo_supervision", label: "Supervisión" },
  { key: "costo_movilidad", label: "Movilidad" },
]

function calcItem(item: any) {
  const costoBase = COSTOS_INTERNOS.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_produccion || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
    + (item.extras_alquiler || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const costoTotal = item.costo_manual !== null && item.costo_manual !== undefined && item.costo_manual !== ""
    ? Number(item.costo_manual) : costoBase
  const cantidad = Number(item.cantidad) || 1
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0
  const margenPct = Number(item.margen_pct) || 0
  const precioCliente = margenPct < 100 ? costoTotal / (1 - margenPct / 100) : costoTotal
  const margenMonto = precioCliente - costoTotal
  return { ...item, costo_base_calculado: costoBase, costo_total: costoTotal, costo_unitario: costoUnitario, precio_cliente: precioCliente, margen_monto: margenMonto }
}

function newItem(cotizacionId: any, orden: number) {
  return calcItem({
    id: "new_" + Date.now(), cotizacion_id: cotizacionId, orden,
    descripcion: "", cantidad: 1, fechas: 1, margen_pct: 40, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
  })
}

export default function CotizacionEditorPage() {
  const rawParams = useParams()
  const id = rawParams?.id as string | undefined
  const cotId = rawParams?.cotId as string | undefined
  const router = useRouter()
  const supabase = createClient()

  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [feeActivo, setFeeActivo] = useState(true)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [biblioteca, setBiblioteca] = useState<any[]>([])
  const [busquedaBib, setBusquedaBib] = useState("")

  useEffect(() => {
    if (!cotId) return
    async function load() {
      const { data: cot } = await supabase
        .from("cotizaciones")
        .select("*, proyecto:proyectos(id,nombre,codigo,cliente:clientes(razon_social))")
        .eq("id", cotId).single()
      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      if (cot?.fee_activo === false) setFeeActivo(false)
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotId).order("orden")
      const parsed = (its || []).map((i: any) => {
        let ep: any[] = [], ea: any[] = []
        try { ep = JSON.parse(i.extras_produccion || "[]") } catch {}
        try { ea = JSON.parse(i.extras_alquiler || "[]") } catch {}
        return calcItem({ ...i, extras_produccion: ep, extras_alquiler: ea })
      })
      setItems(parsed)
      const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre")
      setProveedores(provs || [])
      setLoading(false)
    }
    load()
  }, [cotId])

  async function abrirBiblioteca() {
    if (biblioteca.length === 0) {
      const { data } = await supabase.from("items_biblioteca").select("*").eq("activo", true).order("descripcion")
      setBiblioteca(data || [])
    }
    setShowBiblioteca(true)
  }

  function cargarDesdeLibreria(item: any) {
    const nuevoItem = calcItem({
      id: "new_" + Date.now(), cotizacion_id: cotId, orden: items.length,
      descripcion: item.descripcion, cantidad: 1, fechas: 1,
      margen_pct: item.margen_pct || 40, costo_manual: null,
      costo_almacenaje: item.costo_almacenaje || 0, costo_impresion: item.costo_impresion || 0,
      costo_permisos: item.costo_permisos || 0, costo_instalacion: item.costo_instalacion || 0,
      costo_performer: item.costo_performer || 0, costo_alquiler: item.costo_alquiler || 0,
      costo_supervision: item.costo_supervision || 0, costo_movilidad: item.costo_movilidad || 0,
      costo_otros: 0, proveedor_id: item.proveedor_id || null,
      proveedor_nombre: item.proveedor_nombre || "", extras_produccion: [], extras_alquiler: [],
    })
    setItems(prev => [...prev, nuevoItem])
    setShowBiblioteca(false)
    setBusquedaBib("")
  }

  function toggleExpand(itemId: string) {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function updateItem(itemId: string, field: string, value: any) {
    setItems(prev => prev.map(item => item.id !== itemId ? item : calcItem({ ...item, [field]: value })))
  }

  function addExtra(itemId: string, grupo: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, [grupo]: [...(item[grupo] || []), { label: "", monto: 0 }] })
    }))
  }

  function updateExtra(itemId: string, grupo: string, idx: number, field: string, value: any) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const extras = [...(item[grupo] || [])]
      extras[idx] = { ...extras[idx], [field]: value }
      return calcItem({ ...item, [grupo]: extras })
    }))
  }

  function removeExtra(itemId: string, grupo: string, idx: number) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, [grupo]: (item[grupo] || []).filter((_: any, i: number) => i !== idx) })
    }))
  }

  function removeItem(itemId: string) {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const totalCosto = items.reduce((s, i) => s + (i.costo_total || 0), 0)
  const totalPrecioCliente = items.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feePct = feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0
  const igvPct = cotizacion?.igv_pct ?? 18
  const feeMonto = totalPrecioCliente * (feePct / 100)
  const subtotalConFee = totalPrecioCliente + feeMonto
  const igvMonto = subtotalConFee * (igvPct / 100)
  const totalFinal = subtotalConFee + igvMonto
  const margenGlobal = totalFinal > 0 ? ((totalFinal - totalCosto) / totalFinal) * 100 : 0

  async function generarRQs(cotizacionId: string, proyectoId: string) {
    const itemsConProveedor = items.filter(i => i.proveedor_id && i.costo_total > 0)
    if (itemsConProveedor.length === 0) return
    const { count } = await supabase.from("requerimientos_pago").select("*", { count: "exact", head: true }).eq("proyecto_id", proyectoId)
    let rqNum = (count || 0) + 1
    for (const item of itemsConProveedor) {
      const prov = proveedores.find((p: any) => p.id === item.proveedor_id)
      await enviarAlerta("cotizacion_aprobada", { nombre: proyecto?.nombre, version: cotizacion?.version, total: totalFinal, proyecto_id: id })
      await supabase.from("requerimientos_pago").insert({
        proyecto_id: proyectoId,
        cotizacion_item_id: String(item.id).startsWith("new_") ? null : item.id,
        numero_rq: "RQ-" + proyectoId.slice(0,6).toUpperCase() + "-" + String(rqNum).padStart(3, "0"),
        estado: "pendiente_aprobacion",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: prov?.nombre || item.proveedor_nombre || "",
        proveedor_banco: prov?.banco || "",
        proveedor_cuenta: prov?.numero_cuenta || "",
        proveedor_tipo_pago: prov?.tipo_pago || null,
        monto_solicitado: item.costo_total,
        descripcion: item.descripcion,
      })
      rqNum++
    }
  }

  async function guardar(nuevoEstado?: string) {
    if (nuevoEstado === "aprobada_cliente") {
      const sinProveedor = items.filter(i => !i.proveedor_id && i.costo_total > 0)
      if (sinProveedor.length > 0) {
        alert("Todos los items deben tener un proveedor asignado antes de enviar al cliente.")
        return
      }
    }
    if (!cotId || !id) return
    setSaving(true)
    for (const item of items) {
      const payload = {
        cotizacion_id: cotId, orden: item.orden, descripcion: item.descripcion,
        cantidad: Number(item.cantidad) || 1, fechas: Number(item.fechas) || 1,
        margen_pct: Number(item.margen_pct) || 0,
        costo_manual: item.costo_manual !== "" && item.costo_manual !== null ? Number(item.costo_manual) : null,
        costo_almacenaje: Number(item.costo_almacenaje) || 0, costo_impresion: Number(item.costo_impresion) || 0,
        costo_permisos: Number(item.costo_permisos) || 0, costo_instalacion: Number(item.costo_instalacion) || 0,
        costo_performer: Number(item.costo_performer) || 0, costo_alquiler: Number(item.costo_alquiler) || 0,
        costo_supervision: Number(item.costo_supervision) || 0, costo_movilidad: Number(item.costo_movilidad) || 0,
        costo_otros: Number(item.costo_otros) || 0, costo_unitario: item.costo_unitario || 0,
        costo_total: item.costo_total || 0, precio_cliente: item.precio_cliente || 0,
        margen_monto: item.margen_monto || 0, proveedor_id: item.proveedor_id || null,
        proveedor_nombre: item.proveedor_nombre || null,
        extras_produccion: JSON.stringify(item.extras_produccion || []),
        extras_alquiler: JSON.stringify(item.extras_alquiler || []),
      }
      if (String(item.id).startsWith("new_")) {
        await supabase.from("cotizacion_items").insert(payload)
      } else {
        await supabase.from("cotizacion_items").update(payload).eq("id", item.id)
      }
    }
    await supabase.from("cotizaciones").update({
      subtotal_costo: totalCosto, subtotal_precio_cliente: totalPrecioCliente,
      fee_agencia_monto: feeMonto, fee_agencia_pct: feePct, fee_activo: feeActivo,
      subtotal_con_fee: subtotalConFee, igv_monto: igvMonto, igv_pct: igvPct,
      total_cliente: totalFinal, margen_pct: margenGlobal,
      condicion_pago: cotizacion?.condicion_pago, validez_dias: cotizacion?.validez_dias,
      ...(nuevoEstado ? { estado: nuevoEstado } : {}),
    }).eq("id", cotId)
    setSaving(false)
    await registrarAccion({ accion: "enviar", modulo: "cotizaciones", entidad_id: cotId, entidad_tipo: "cotizacion", descripcion: "Cotizacion enviada al cliente y aprobada" })
    if (nuevoEstado === "aprobada_cliente") {
      const { data: cotData } = await supabase.from("cotizaciones").select("proyecto_id").eq("id", cotId).single()
      await generarRQs(cotId, cotData?.proyecto_id || id)
    }
    if (nuevoEstado) {
      router.push("/proyectos/" + id)
    } else {
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotId).order("orden")
      const parsed = (its || []).map((i: any) => {
        let ep: any[] = [], ea: any[] = []
        try { ep = JSON.parse(i.extras_produccion || "[]") } catch {}
        try { ea = JSON.parse(i.extras_alquiler || "[]") } catch {}
        return calcItem({ ...i, extras_produccion: ep, extras_alquiler: ea })
      })
      setItems(parsed)
      alert("Guardado correctamente")
      await registrarAccion({ accion: "editar", modulo: "cotizaciones", entidad_id: cotId, entidad_tipo: "cotizacion", descripcion: "Cotizacion guardada como borrador" })
    }
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", outline: "none" }

  if (!cotId) return <div style={{ color: "#dc2626", padding: 24 }}>Error: ID de cotización no encontrado.</div>
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>

      {/* Modal Biblioteca */}
      {showBiblioteca && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>Seleccionar desde biblioteca</h2>
              <button onClick={() => setShowBiblioteca(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <input style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 12 }}
              placeholder="Buscar item..." value={busquedaBib} onChange={e => setBusquedaBib(e.target.value)} autoFocus />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {biblioteca.filter(i => !busquedaBib || i.descripcion?.toLowerCase().includes(busquedaBib.toLowerCase())).map(item => (
                <div key={item.id} onClick={() => cargarDesdeLibreria(item)}
                  style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderRadius: 8, transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{item.descripcion}</div>
                      {item.categoria && <span style={{ fontSize: 11, color: "#6b7280" }}>{item.categoria}</span>}
                      {item.proveedor_nombre && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>· {item.proveedor_nombre}</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente || 0)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.margen_pct}% margen</div>
                    </div>
                  </div>
                </div>
              ))}
              {biblioteca.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>No hay items en la biblioteca</div>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <a href={"/proyectos/" + id} style={{ color: "#9ca3af", fontSize: 12 }}>{proyecto?.codigo}</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>Proforma V{cotizacion?.version}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {proyecto?.cliente?.razon_social} · V{cotizacion?.version} · <span style={{
              background: cotizacion?.estado === "aprobada_cliente" ? "#dcfce7" : "#fef9c3",
              color: cotizacion?.estado === "aprobada_cliente" ? "#15803d" : "#92400e",
              padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600
            }}>{cotizacion?.estado || "borrador"}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => router.push(`/proyectos/${id}/cotizaciones/${cotId}/preview`)}
            style={{ padding: "6px 14px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            👁 Preview
          </button>
          <button onClick={() => guardar()} disabled={saving} className="btn-secondary" style={{ fontSize: 12 }}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button onClick={() => guardar("aprobada_cliente")} disabled={saving} className="btn-primary" style={{ fontSize: 12 }}>
            Enviar al cliente
          </button>
        </div>
      </div>

      {/* Condiciones comerciales */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Condición de pago</label>
            <select style={{ ...inp, width: "100%" }} value={cotizacion?.condicion_pago || ""}
              onChange={e => setCotizacion({ ...cotizacion, condicion_pago: e.target.value })}>
              <option>50% adelanto / 50% contra entrega</option>
              <option>30% adelanto / 70% contra entrega</option>
              <option>100% adelanto</option>
              <option>Crédito 30 días</option>
              <option>Crédito 60 días</option>
              <option>Crédito 90 días</option>
              <option>A tratar</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Validez (días)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.validez_dias || 10}
              onChange={e => setCotizacion({ ...cotizacion, validez_dias: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>IGV (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.igv_pct ?? 18}
              onChange={e => setCotizacion({ ...cotizacion, igv_pct: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Margen objetivo (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.margen_objetivo || 40}
              onChange={e => setCotizacion({ ...cotizacion, margen_objetivo: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#374151" }}>Itemizado del presupuesto</h2>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>▶ Expande cada ítem para costos internos y proveedor</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#1D9E75" }}>
                <th style={{ width: 32, padding: "8px 4px" }}></th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Días</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>C. Unit.</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Total S/</th>
                <th style={{ textAlign: "center", width: 95, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Margen %</th>
                <th style={{ textAlign: "right", width: 130, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#d1fae5" }}>Precio cli.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <>
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: expandedItems[item.id] ? "none" : "1px solid #f3f4f6" }}>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => toggleExpand(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#1D9E75", fontSize: 13, padding: "2px 6px" }}>
                        {expandedItems[item.id] ? "▼" : "▶"}
                      </button>
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.cantidad}
                        onChange={e => updateItem(item.id, "cantidad", Number(e.target.value))} />
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.fechas}
                        onChange={e => updateItem(item.id, "fechas", Number(e.target.value))} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input type="number"
                        style={{ ...inp, width: "100%", textAlign: "right",
                          color: item.costo_manual !== null && item.costo_manual !== "" ? "#7c3aed" : "#6b7280",
                          borderColor: item.costo_manual !== null && item.costo_manual !== "" ? "#c4b5fd" : "#e5e7eb" }}
                        value={item.costo_manual !== null && item.costo_manual !== "" ? item.costo_manual : (item.costo_total > 0 ? item.costo_unitario.toFixed(2) : "")}
                        placeholder="Auto"
                        onChange={e => updateItem(item.id, "costo_manual", e.target.value === "" ? null : Number(e.target.value))} />
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 12px", fontSize: 12, fontWeight: 600, color: item.costo_total > 0 ? "#dc2626" : "#d1d5db" }}>
                      {item.costo_total > 0 ? fmt(item.costo_total) : "—"}
                      {item.costo_manual !== null && item.costo_manual !== "" && (
                        <span title="Costo manual" style={{ marginLeft: 4, fontSize: 10, color: "#7c3aed" }}>✎</span>
                      )}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}>
                        <input type="number" min={0} max={99}
                          style={{ ...inp, width: 52, textAlign: "center", fontWeight: 700,
                            color: item.margen_pct >= 35 ? "#0F6E56" : item.margen_pct >= 20 ? "#ca8a04" : "#dc2626",
                            borderColor: item.margen_pct >= 35 ? "#1D9E75" : item.margen_pct >= 20 ? "#ca8a04" : "#dc2626" }}
                          value={item.margen_pct}
                          onChange={e => updateItem(item.id, "margen_pct", Number(e.target.value))} />
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 12px", fontSize: 13, color: item.precio_cliente > 0 ? "#0F6E56" : "#d1d5db", fontWeight: 700 }}>
                      {item.precio_cliente > 0 ? fmt(item.precio_cliente) : "—"}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 16 }}>×</button>
                    </td>
                  </tr>

                  {expandedItems[item.id] && (
                    <tr key={item.id + "_exp"}>
                      <td colSpan={9} style={{ padding: 0, background: "#f8fffe", borderBottom: "2px solid #1D9E75" }}>
                        <div style={{ padding: "12px 16px 16px 48px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.06em" }}>Costos internos</span>
                              <span style={{ fontSize: 11, color: "#6b7280" }}>Calculado: <strong>{fmt(item.costo_base_calculado || 0)}</strong></span>
                              {item.costo_manual !== null && item.costo_manual !== "" && (
                                <span style={{ fontSize: 11, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: 99 }}>
                                  ✎ Manual: {fmt(Number(item.costo_manual))}
                                  <button onClick={() => updateItem(item.id, "costo_manual", null)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", marginLeft: 4 }}>× quitar</button>
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#6b7280" }}>Proveedor:</span>
                              <select style={{ ...inp, minWidth: 180 }} value={item.proveedor_id || ""}
                                onChange={e => {
                                  const prov = proveedores.find((p: any) => p.id === e.target.value)
                                  updateItem(item.id, "proveedor_id", e.target.value || null)
                                  updateItem(item.id, "proveedor_nombre", prov?.nombre || "")
                                }}>
                                <option value="">Sin proveedor</option>
                                {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                            {COSTOS_INTERNOS.map(cat => (
                              <div key={cat.key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{cat.label}</div>
                                <input type="number" style={{ ...inp, width: "100%", border: "none", padding: "2px 0", fontSize: 13, fontWeight: 600 }}
                                  value={item[cat.key] || ""} placeholder="0"
                                  onChange={e => updateItem(item.id, cat.key, Number(e.target.value))} />
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Extras producción</span>
                                <button onClick={() => addExtra(item.id, "extras_produccion")}
                                  style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                  + Agregar
                                </button>
                              </div>
                              {(item.extras_produccion || []).map((extra: any, i: number) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                                  <input style={{ ...inp, flex: 1 }} value={extra.label} placeholder="Concepto"
                                    onChange={e => updateExtra(item.id, "extras_produccion", i, "label", e.target.value)} />
                                  <input type="number" style={{ ...inp, width: 90, textAlign: "right" }} value={extra.monto || ""} placeholder="0"
                                    onChange={e => updateExtra(item.id, "extras_produccion", i, "monto", Number(e.target.value))} />
                                  <button onClick={() => removeExtra(item.id, "extras_produccion", i)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>×</button>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Extras alquiler / RRHH</span>
                                <button onClick={() => addExtra(item.id, "extras_alquiler")}
                                  style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                  + Agregar
                                </button>
                              </div>
                              {(item.extras_alquiler || []).map((extra: any, i: number) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                                  <input style={{ ...inp, flex: 1 }} value={extra.label} placeholder="Concepto"
                                    onChange={e => updateExtra(item.id, "extras_alquiler", i, "label", e.target.value)} />
                                  <input type="number" style={{ ...inp, width: 90, textAlign: "right" }} value={extra.monto || ""} placeholder="0"
                                    onChange={e => updateExtra(item.id, "extras_alquiler", i, "monto", Number(e.target.value))} />
                                  <button onClick={() => removeExtra(item.id, "extras_alquiler", i)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {/* Fila Fee */}
              <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <td></td>
                <td colSpan={5} style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={feeActivo} onChange={e => setFeeActivo(e.target.checked)} style={{ cursor: "pointer", width: 14, height: 14 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: feeActivo ? "#374151" : "#9ca3af" }}>Fee de agencia</span>
                    </label>
                    {feeActivo && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" min={0} max={100} style={{ ...inp, width: 60, textAlign: "center" }}
                          value={cotizacion?.fee_agencia_pct ?? 10}
                          onChange={e => setCotizacion({ ...cotizacion, fee_agencia_pct: Number(e.target.value) })} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>% sobre precio cliente</span>
                      </div>
                    )}
                    {!feeActivo && <span style={{ fontSize: 11, color: "#9ca3af" }}>No aplica para este presupuesto</span>}
                  </div>
                </td>
                <td></td>
                <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, fontWeight: 700, color: feeActivo ? "#374151" : "#d1d5db" }}>
                  {feeActivo ? fmt(feeMonto) : "—"}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button onClick={abrirBiblioteca}
            style={{ border: "1px dashed #1D9E75", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#0F6E56", cursor: "pointer" }}>
            📚 Desde biblioteca
          </button>
          <button onClick={() => setItems(prev => [...prev, newItem(cotId, prev.length)])}
            style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            + Agregar ítem
          </button>
        </div>
      </div>

      {/* Totales */}
      <div style={{ background: "#E1F5EE", border: "1px solid #1D9E75", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 0, flexWrap: "wrap", alignItems: "stretch", marginTop: 16 }}>
        {[
          { label: "Subtotal costo", value: fmt(totalCosto), color: "#dc2626", size: 18 },
          { label: "Precio cliente", value: fmt(totalPrecioCliente), color: "#374151", size: 18 },
          ...(feeActivo ? [{ label: `Fee agencia (${feePct}%)`, value: fmt(feeMonto), color: "#374151", size: 18 }] : []),
          { label: "Subtotal c/ fee", value: fmt(subtotalConFee), color: "#374151", size: 18 },
          { label: `IGV (${igvPct}%)`, value: fmt(igvMonto), color: "#374151", size: 18 },
          { label: "TOTAL CLIENTE", value: fmt(totalFinal), color: "#04342C", size: 24 },
          { label: "Margen global", value: margenGlobal.toFixed(1) + "%", color: margenGlobal >= 35 ? "#0F6E56" : margenGlobal >= 20 ? "#ca8a04" : "#dc2626", size: 22 },
        ].map((t, i, arr) => (
          <div key={t.label} style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 24, marginRight: 24, borderRight: i < arr.length - 1 ? "1px solid #a7f3d0" : "none" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#085041" }}>{t.label}</div>
            <div style={{ fontSize: t.size, fontWeight: 700, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

    </div>
  )
}