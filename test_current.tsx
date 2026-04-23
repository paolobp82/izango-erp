"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

const GRUPO_PRODUCCION = [
  { key: "costo_almacenaje", label: "Almacenaje" },
  { key: "costo_impresion", label: "Impresión" },
  { key: "costo_permisos", label: "Permisos" },
  { key: "costo_instalacion", label: "Instalación" },
]
const GRUPO_ALQUILER = [
  { key: "costo_performer", label: "Performers" },
  { key: "costo_alquiler", label: "Alquiler" },
  { key: "costo_supervision", label: "Supervisión" },
  { key: "costo_movilidad", label: "Movilidad" },
]

function calcItem(item: any) {
  const costoProduccion = GRUPO_PRODUCCION.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_produccion || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const costoAlquiler = GRUPO_ALQUILER.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_alquiler || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const costoTotal = costoProduccion + costoAlquiler
  const cantidad = Number(item.cantidad) || 1
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0
  const margenPct = Number(item.margen_pct) || 0
  const precioCliente = margenPct < 100 ? costoTotal / (1 - margenPct / 100) : costoTotal
  const margenMonto = precioCliente - costoTotal
  return {
    ...item,
    costo_produccion_total: costoProduccion,
    costo_alquiler_total: costoAlquiler,
    costo_total: costoTotal,
    costo_unitario: costoUnitario,
    precio_cliente: precioCliente,
    margen_monto: margenMonto,
  }
}

function newItem(cotizacionId: any, orden: number) {
  return calcItem({
    id: "new_" + Date.now(),
    cotizacion_id: cotizacionId,
    orden,
    descripcion: "",
    cantidad: 1,
    fechas: 1,
    margen_pct: 40,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    extras_produccion: [],
    extras_alquiler: [],
  })
}

export default function CotizacionEditorV3() {
  const rawParams = useParams()
  const id = rawParams?.id as string | undefined
  const cotId = rawParams?.cotId as string | undefined
  const router = useRouter()
  const supabase = createClient()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [feeActivo, setFeeActivo] = useState(true)

  useEffect(() => {
    if (!cotId) return
    async function load() {
      const { data: cot } = await supabase
        .from("cotizaciones")
        .select("*, proyecto:proyectos(id,nombre,codigo,cliente:clientes(razon_social))")
        .eq("id", cotId)
        .single()
      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      if (cot?.fee_agencia_pct === 0) setFeeActivo(false)
      const { data: its } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", cotId)
        .order("orden")
      const parsed = (its || []).map((i: any) => {
        let ep: any[] = [], ea: any[] = []
        try { ep = JSON.parse(i.extras_produccion || "[]") } catch {}
        try { ea = JSON.parse(i.extras_alquiler || "[]") } catch {}
        return calcItem({ ...i, extras_produccion: ep, extras_alquiler: ea })
      })
      setItems(parsed)
      setLoading(false)
    }
    load()
  }, [cotId])

  function toggleExpand(itemId: string) {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function updateItem(itemId: string, field: string, value: any) {
    setItems(prev => prev.map(item => item.id !== itemId ? item : calcItem({ ...item, [field]: value })))
  }

  function addExtraProduccion(itemId: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, extras_produccion: [...(item.extras_produccion || []), { label: "", monto: 0 }] })
    }))
  }

  function addExtraAlquiler(itemId: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, extras_alquiler: [...(item.extras_alquiler || []), { label: "", monto: 0 }] })
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
  const totalCliente = items.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feePct = feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0
  const igvPct = cotizacion?.igv_pct ?? 18
  const feeMonto = totalCliente * (feePct / 100)
  const subtotalConFee = totalCliente + feeMonto
  const igvMonto = subtotalConFee * (igvPct / 100)
  const totalFinal = subtotalConFee + igvMonto
  const margenGlobal = totalFinal > 0 ? ((totalFinal - totalCosto) / totalFinal) * 100 : 0

  async function guardar(nuevoEstado?: string) {
    if (!cotId || !id) return
    setSaving(true)
    for (const item of items) {
      const payload = {
        cotizacion_id: cotId,
        orden: item.orden,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad) || 1,
        fechas: Number(item.fechas) || 1,
        margen_pct: Number(item.margen_pct) || 0,
        costo_almacenaje: Number(item.costo_almacenaje) || 0,
        costo_impresion: Number(item.costo_impresion) || 0,
        costo_permisos: Number(item.costo_permisos) || 0,
        costo_instalacion: Number(item.costo_instalacion) || 0,
        costo_performer: Number(item.costo_performer) || 0,
        costo_alquiler: Number(item.costo_alquiler) || 0,
        costo_supervision: Number(item.costo_supervision) || 0,
        costo_movilidad: Number(item.costo_movilidad) || 0,
        costo_unitario: item.costo_unitario || 0,
        costo_total: item.costo_total || 0,
        precio_cliente: item.precio_cliente || 0,
        margen_monto: item.margen_monto || 0,
        extras_produccion: JSON.stringify(item.extras_produccion || []),
        extras_alquiler: JSON.stringify(item.extras_alquiler || []),
      }
      if (String(item.id).startsWith("new_")) {
        await supabase.from("cotizacion_items").insert(payload)
      } else {
        await supabase.from("cotizacion_items").update(payload).eq("id", item.id)
      }
    }
    const updates: any = {
      subtotal_costo: totalCosto,
      subtotal_precio_cliente: totalCliente,
      fee_agencia_monto: feeMonto,
      subtotal_con_fee: subtotalConFee,
      igv_monto: igvMonto,
      total_cliente: totalFinal,
      margen_pct: margenGlobal,
      condicion_pago: cotizacion?.condicion_pago,
      validez_dias: cotizacion?.validez_dias,
      fee_agencia_pct: feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0,
      igv_pct: cotizacion?.igv_pct,
    }
    if (nuevoEstado) updates.estado = nuevoEstado
    await supabase.from("cotizaciones").update(updates).eq("id", cotId)
    setSaving(false)
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
    }
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff" }
  const subInp: any = { ...inp, width: "100%" }

  if (!cotId) return <div style={{ color: "#dc2626", padding: 24, fontSize: 13 }}>Error: ID de cotización no encontrado.</div>
  if (loading) return <div style={{ color: "#6b7280", fontSize: 13, padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <a href={"/proyectos/" + id} style={{ color: "#9ca3af", fontSize: 12 }}>{proyecto?.codigo}</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>Proforma V{cotizacion?.version}</span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {proyecto?.cliente?.razon_social} · V{cotizacion?.version} · {cotizacion?.estado}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Margen obj.</span>
            <input type="number" style={{ ...inp, width: 55, textAlign: "center" }}
              value={cotizacion?.margen_objetivo || 40}
              onChange={e => setCotizacion({ ...cotizacion, margen_objetivo: Number(e.target.value) })} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>%</span>
          </div>
          <button onClick={() => guardar()} disabled={saving} className="btn-secondary" style={{ fontSize: 12 }}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button onClick={() => guardar("aprobada_cliente")} disabled={saving} className="btn-primary" style={{ fontSize: 12 }}>
            Enviar al cliente
          </button>
        </div>
      </div>

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
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Fee agencia (%)</span>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={feeActivo} onChange={e => setFeeActivo(e.target.checked)} />
                  <span style={{ fontSize: 10, color: feeActivo ? "#0F6E56" : "#9ca3af" }}>
                    {feeActivo ? "Activo" : "No aplica"}
                  </span>
                </label>
              </span>
            </label>
            <input type="number" style={{ ...inp, width: "100%", opacity: feeActivo ? 1 : 0.4 }}
              disabled={!feeActivo}
              value={cotizacion?.fee_agencia_pct ?? 10}
              onChange={e => setCotizacion({ ...cotizacion, fee_agencia_pct: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>IGV (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.igv_pct ?? 18}
              onChange={e => setCotizacion({ ...cotizacion, igv_pct: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#374151" }}>Itemizado</h2>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>▶ Expande cada ítem para ingresar costos internos</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1D9E75" }}>
              <th style={{ width: 32, padding: "8px 4px" }}></th>
              <th style={{ textAlign: "left", padding: "8px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
              <th style={{ textAlign: "center", width: 70, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>
              <th style={{ textAlign: "center", width: 70, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Días</th>
              <th style={{ textAlign: "right", width: 110, padding: "8px", fontSize: 11, fontWeight: 600, color: "#fff" }}>C.Unit.</th>
              <th style={{ textAlign: "right", width: 110, padding: "8px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Total S/</th>
              <th style={{ textAlign: "center", width: 100, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Margen %</th>
              <th style={{ textAlign: "right", width: 120, padding: "8px", fontSize: 11, fontWeight: 600, color: "#d1fae5" }}>Precio cli.</th>
              <th style={{ width: 30, padding: "8px 4px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <>
                <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ textAlign: "center", padding: "6px 4px" }}>
                    <button onClick={() => toggleExpand(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1D9E75", fontSize: 14, lineHeight: 1, padding: "2px 6px" }}>
                      {expandedItems[item.id] ? "▼" : "▶"}
                    </button>
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input style={{ ...inp, width: "100%", minWidth: 180 }} value={item.descripcion}
                      placeholder="Descripción del ítem"
                      onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.cantidad}
                      onChange={e => updateItem(item.id, "cantidad", Number(e.target.value))} />
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.fechas}
                      onChange={e => updateItem(item.id, "fechas", Number(e.target.value))} />
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                    {item.costo_total > 0 ? fmt(item.costo_unitario) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 12, fontWeight: 600, color: item.costo_total > 0 ? "#dc2626" : "#d1d5db" }}>
                    {item.costo_total > 0 ? fmt(item.costo_total) : "—"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                      <input type="number" min={0} max={99}
                        style={{ ...inp, width: 58, textAlign: "center", fontWeight: 600,
                          color: item.margen_pct >= 35 ? "#0F6E56" : item.margen_pct >= 20 ? "#ca8a04" : "#dc2626",
                          borderColor: item.margen_pct >= 35 ? "#1D9E75" : item.margen_pct >= 20 ? "#ca8a04" : "#dc2626" }}
                        value={item.margen_pct}
                        onChange={e => updateItem(item.id, "margen_pct", Number(e.target.value))} />
                      <span style={{ fontSize: 11, color: "#6b7280" }}>%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 13, color: item.precio_cliente > 0 ? "#0F6E56" : "#d1d5db", fontWeight: 700 }}>
                    {item.precio_cliente > 0 ? fmt(item.precio_cliente) : "—"}
                  </td>
                  <td style={{ textAlign: "center", padding: "6px 4px" }}>
                    <button onClick={() => removeItem(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
                  </td>
                </tr>
                {expandedItems[item.id] && (
                  <tr key={item.id + "_detail"}>
                    <td colSpan={9} style={{ padding: 0, background: "#f0fdf8" }}>
                      <div style={{ padding: "14px 16px 14px 52px", borderTop: "2px solid #1D9E75", borderBottom: "1px solid #d1fae5" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase" }}>
                                Producción — <span style={{ color: "#374151" }}>{fmt(item.costo_produccion_total || 0)}</span>
                              </div>
                              <button onClick={() => addExtraProduccion(item.id)}
                                style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                + Agregar celda
                              </button>
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {GRUPO_PRODUCCION.map(cat => (
                                <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 12, color: "#6b7280", width: 110, flexShrink: 0 }}>{cat.label}</span>
                                  <input type="number" style={{ ...subInp, width: 130 }} value={item[cat.key] || ""}
                                    placeholder="0" onChange={e => updateItem(item.id, cat.key, Number(e.target.value))} />
                                </div>
                              ))}
                              {(item.extras_produccion || []).map((extra: any, i: number) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <input style={{ ...subInp, width: 110 }} value={extra.label} placeholder="Nombre celda"
                                    onChange={e => updateExtra(item.id, "extras_produccion", i, "label", e.target.value)} />
                                  <input type="number" style={{ ...subInp, width: 130 }} value={extra.monto || ""}
                                    placeholder="0" onChange={e => updateExtra(item.id, "extras_produccion", i, "monto", Number(e.target.value))} />
                                  <button onClick={() => removeExtra(item.id, "extras_produccion", i)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase" }}>
                                Alquiler / RRHH — <span style={{ color: "#374151" }}>{fmt(item.costo_alquiler_total || 0)}</span>
                              </div>
                              <button onClick={() => addExtraAlquiler(item.id)}
                                style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                + Agregar celda
                              </button>
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {GRUPO_ALQUILER.map(cat => (
                                <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 12, color: "#6b7280", width: 110, flexShrink: 0 }}>{cat.label}</span>
                                  <input type="number" style={{ ...subInp, width: 130 }} value={item[cat.key] || ""}
                                    placeholder="0" onChange={e => updateItem(item.id, cat.key, Number(e.target.value))} />
                                </div>
                              ))}
                              {(item.extras_alquiler || []).map((extra: any, i: number) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <input style={{ ...subInp, width: 110 }} value={extra.label} placeholder="Nombre celda"
                                    onChange={e => updateExtra(item.id, "extras_alquiler", i, "label", e.target.value)} />
                                  <input type="number" style={{ ...subInp, width: 130 }} value={extra.monto || ""}
                                    placeholder="0" onChange={e => updateExtra(item.id, "extras_alquiler", i, "monto", Number(e.target.value))} />
                                  <button onClick={() => removeExtra(item.id, "extras_alquiler", i)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 16px" }}>
          <button onClick={() => setItems(prev => [...prev, newItem(cotId, prev.length)])}
            style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            + Agregar ítem
          </button>
        </div>
      </div>

      <div style={{ background: "#E1F5EE", border: "1px solid #1D9E75", borderRadius: 12, padding: "16px 24px", display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>Subtotal costo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>{fmt(totalCosto)}</div>
        </div>
        {feeActivo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>Fee agencia ({feePct}%)</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>{fmt(feeMonto)}</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>Subtotal cliente</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>{fmt(subtotalConFee)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>IGV ({igvPct}%)</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>{fmt(igvMonto)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>Total cliente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#04342C" }}>{fmt(totalFinal)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#085041" }}>Margen neto</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: margenGlobal >= 35 ? "#0F6E56" : margenGlobal >= 20 ? "#ca8a04" : "#dc2626" }}>
            {margenGlobal.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}

