"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

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

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data: liqs } = await supabase
      .from("liquidaciones")
      .select("*, proyecto:proyectos(nombre, codigo, cliente:clientes(razon_social))")
      .order("created_at", { ascending: false })
    setLiquidaciones(liqs || [])

    const { data: provs } = await supabase
      .from("proyectos")
      .select("id, nombre, codigo")
      .order("created_at", { ascending: false })
    setProyectos(provs || [])
    setLoading(false)
  }

  async function crearLiquidacion(proyectoId: string) {
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
    setSelected(liq)
    setLoadingItems(true)
    const { data } = await supabase.from("liquidacion_items").select("*").eq("liquidacion_id", liq.id)
    setItems(data || [])
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
      await supabase.from("liquidacion_items").update({
        costo_real: item.costo_real || 0,
        desvio: item.desvio || 0,
        desvio_pct: item.desvio_pct || 0,
      }).eq("id", item.id)
    }
    const costoReal = items.reduce((s, i) => s + (i.costo_real || 0), 0)
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
    if (!confirm("¿Cerrar esta liquidación? Ya no se podrá editar.")) return
    await supabase.from("liquidaciones").update({ cerrada: true, aprobada_por: perfil?.id, fecha_cierre: new Date().toISOString() }).eq("id", selected.id)
    setSelected({ ...selected, cerrada: true })
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtPct = (n: number) => Number(n || 0).toFixed(1) + "%"
  const inp: any = { padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

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
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Costo presupuestado", value: fmt(selected.costo_presupuestado), color: "#374151" },
                  { label: "Costo real", value: fmt(selected.costo_real), color: selected.costo_real > selected.costo_presupuestado ? "#dc2626" : "#15803d" },
                  { label: "Desvío costo", value: fmt(selected.desvio_costo), color: (selected.desvio_costo || 0) > 0 ? "#dc2626" : "#15803d" },
                  { label: "Margen presupuestado", value: fmtPct(selected.margen_presupuestado_pct), color: "#374151" },
                  { label: "Margen real", value: fmtPct(selected.margen_real_pct), color: selected.margen_real_pct >= selected.margen_presupuestado_pct ? "#15803d" : "#dc2626" },
                  { label: "Desvío margen", value: fmtPct(selected.desvio_margen_pp), color: (selected.desvio_margen_pp || 0) >= 0 ? "#15803d" : "#dc2626" },
                ].map(t => (
                  <div key={t.label} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>{t.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.color }}>{t.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Ítems</div>
              </div>
              {loadingItems ? (
                <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>Cargando ítems...</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRESUPUESTADO</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>REAL</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESVÍO</th>
                      <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESVÍO %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151" }}>{item.descripcion || "—"}</td>
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
                    {items.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay ítems</td></tr>
                    )}
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


