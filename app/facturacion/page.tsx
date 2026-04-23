"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { registrarAccion } from "@/lib/trazabilidad"
import { enviarAlerta } from "@/lib/alertas"

const ESTADOS: Record<string, any> = {
  pendiente:  { bg: "#fef9c3", color: "#92400e",  label: "Pendiente" },
  emitida:    { bg: "#dbeafe", color: "#1e40af",  label: "Emitida" },
  cobrada:    { bg: "#dcfce7", color: "#15803d",  label: "Cobrada" },
  anulada:    { bg: "#fee2e2", color: "#991b1b",  label: "Anulada" },
}

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha"]

export default function FacturacionPage() {
  const supabase = createClient()
  const [facturas, setFacturas] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    proyecto_id: "", numero_factura: "", estado: "pendiente",
    subtotal: "", igv: "18",
    detraccion_pct: "0", retencion_pct: "0",
    pronto_pago_entidad: "", pronto_pago_pct: "0",
    banco_receptor: "", fecha_emision: "", fecha_abono: "", link_reporte: "",
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: facts } = await supabase
      .from("facturas")
      .select("*, proyecto:proyectos(nombre, codigo, cliente:clientes(razon_social))")
      .order("created_at", { ascending: false })
    setFacturas(facts || [])
    const { data: provs } = await supabase.from("proyectos").select("id, nombre, codigo").order("created_at", { ascending: false })
    setProyectos(provs || [])
    setLoading(false)
  }

  function calcularMontos() {
    const subtotal = Number(form.subtotal) || 0
    const igvMonto = subtotal * (Number(form.igv) / 100)
    const total = subtotal + igvMonto
    const detraccionMonto = total * (Number(form.detraccion_pct) / 100)
    const retencionMonto = total * (Number(form.retencion_pct) / 100)
    const prontoPagoMonto = total * (Number(form.pronto_pago_pct) / 100)
    const montoFinal = total - detraccionMonto - retencionMonto - prontoPagoMonto
    return { subtotal, igvMonto, total, detraccionMonto, retencionMonto, prontoPagoMonto, montoFinal }
  }

  async function guardar() {
    if (!form.proyecto_id || !form.numero_factura || !form.subtotal) {
      alert("Proyecto, número de factura y subtotal son obligatorios")
      return
    }
    setSaving(true)
    const m = calcularMontos()
    await supabase.from("facturas").insert({
      proyecto_id: form.proyecto_id,
      numero_factura: form.numero_factura,
      estado: form.estado,
      subtotal: m.subtotal,
      igv: m.igvMonto,
      detraccion_pct: Number(form.detraccion_pct),
      detraccion_monto: m.detraccionMonto,
      retencion_pct: Number(form.retencion_pct),
      retencion_monto: m.retencionMonto,
      pronto_pago_entidad: form.pronto_pago_entidad || null,
      pronto_pago_pct: Number(form.pronto_pago_pct),
      pronto_pago_monto: m.prontoPagoMonto,
      monto_final_abonado: m.montoFinal,
      banco_receptor: form.banco_receptor || null,
      fecha_emision: form.fecha_emision || null,
      fecha_abono: form.fecha_abono || null,
        link_reporte: form.link_reporte || null,
    })
    await enviarAlerta("proyecto_facturacion", { nombre: proyectos.find((p:any) => p.id === form.proyecto_id)?.nombre || "—", codigo: proyectos.find((p:any) => p.id === form.proyecto_id)?.codigo || "—", cliente: "—" })
    await registrarAccion({ accion: "crear", modulo: "facturacion", entidad_tipo: "factura", descripcion: "Factura creada: " + form.numero_factura })
    setSaving(false)
    setShowForm(false)
    setForm({ proyecto_id: "", numero_factura: "", estado: "pendiente", subtotal: "", igv: "18", detraccion_pct: "0", retencion_pct: "0", pronto_pago_entidad: "", pronto_pago_pct: "0", banco_receptor: "", fecha_emision: "", fecha_abono: "", link_reporte: "" })
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("facturas").update({ estado }).eq("id", id)
    load()
    if (selected?.id === id) setSelected({ ...selected, estado })
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const m = calcularMontos()

  const totalEmitido = facturas.filter(f => f.estado !== "anulada").reduce((s, f) => s + (f.subtotal + f.igv || 0), 0)
  const totalCobrado = facturas.filter(f => f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalPendiente = facturas.filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Facturación</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{facturas.length} facturas registradas</p>
        </div>
        <ImportExport modulo="facturas" campos={[{key:"numero_factura",label:"N factura",requerido:true},{key:"subtotal",label:"Subtotal"},{key:"detraccion_pct",label:"Detraccion %"},{key:"retencion_pct",label:"Retencion %"},{key:"banco_receptor",label:"Banco"},{key:"fecha_emision",label:"Fecha emision"},{key:"fecha_abono",label:"Fecha abono"}]} datos={facturas} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const{error}=await supabase.from("facturas").insert({...r,estado:"pendiente",igv:(Number(r.subtotal)||0)*0.18,monto_final_abonado:Number(r.subtotal)||0}); if(error)errores.push(r.numero_factura+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva factura</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total emitido", value: fmt(totalEmitido), color: "#1e40af", bg: "#dbeafe" },
          { label: "Por cobrar", value: fmt(totalPendiente), color: "#92400e", bg: "#fef9c3" },
          { label: "Cobrado", value: fmt(totalCobrado), color: "#15803d", bg: "#dcfce7" },
        ].map(t => (
          <div key={t.label} className="card" style={{ background: t.bg, border: "none" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.color, textTransform: "uppercase", marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 600, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "#111827" }}>Nueva factura</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>PROYECTO *</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Seleccionar proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>N° FACTURA *</label>
                  <input style={inp} value={form.numero_factura} placeholder="F001-00001"
                    onChange={e => setForm({ ...form, numero_factura: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>SUBTOTAL S/ *</label>
                  <input type="number" style={inp} value={form.subtotal} placeholder="0.00"
                    onChange={e => setForm({ ...form, subtotal: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>IGV %</label>
                  <input type="number" style={inp} value={form.igv}
                    onChange={e => setForm({ ...form, igv: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ESTADO</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>DETRACCIÓN %</label>
                  <input type="number" style={inp} value={form.detraccion_pct}
                    onChange={e => setForm({ ...form, detraccion_pct: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>RETENCIÓN %</label>
                  <input type="number" style={inp} value={form.retencion_pct}
                    onChange={e => setForm({ ...form, retencion_pct: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>PRONTO PAGO %</label>
                  <input type="number" style={inp} value={form.pronto_pago_pct}
                    onChange={e => setForm({ ...form, pronto_pago_pct: e.target.value })} />
                </div>
              </div>
              {Number(form.pronto_pago_pct) > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ENTIDAD PRONTO PAGO</label>
                  <input style={inp} value={form.pronto_pago_entidad} placeholder="Nombre de la entidad"
                    onChange={e => setForm({ ...form, pronto_pago_entidad: e.target.value })} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>BANCO RECEPTOR</label>
                  <select style={inp} value={form.banco_receptor} onChange={e => setForm({ ...form, banco_receptor: e.target.value })}>
                    <option value="">Sin banco</option>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>FECHA EMISIÓN</label>
                  <input type="date" style={inp} value={form.fecha_emision}
                    onChange={e => setForm({ ...form, fecha_emision: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>FECHA ABONO</label>
                  <input type="date" style={inp} value={form.fecha_abono}
                    onChange={e => setForm({ ...form, fecha_abono: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>LINK REPORTE GOOGLE DRIVE</label>
                <input style={inp} value={form.link_reporte || ""} placeholder="https://drive.google.com/..."
                  onChange={e => setForm({ ...form, link_reporte: e.target.value })} />
              </div>
              {Number(form.subtotal) > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", marginBottom: 8 }}>Resumen</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {[
                      { label: "Subtotal", value: fmt(m.subtotal) },
                      { label: "IGV (" + form.igv + "%)", value: fmt(m.igvMonto) },
                      { label: "Total factura", value: fmt(m.total), bold: true },
                      ...(m.detraccionMonto > 0 ? [{ label: "Detracción (" + form.detraccion_pct + "%)", value: "- " + fmt(m.detraccionMonto) }] : []),
                      ...(m.retencionMonto > 0 ? [{ label: "Retención (" + form.retencion_pct + "%)", value: "- " + fmt(m.retencionMonto) }] : []),
                      ...(m.prontoPagoMonto > 0 ? [{ label: "Pronto pago (" + form.pronto_pago_pct + "%)", value: "- " + fmt(m.prontoPagoMonto) }] : []),
                      { label: "Monto a abonar", value: fmt(m.montoFinal), bold: true, color: "#0F6E56" },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: (r as any).bold ? 700 : 400, color: (r as any).color || "#374151" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : "Crear factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {facturas.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay facturas registradas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° FACTURA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>A ABONAR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EMISIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>REPORTE</th>
                <th style={{ padding: "10px 20px", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f, idx) => {
                const ec = ESTADOS[f.estado] || { bg: "#f3f4f6", color: "#6b7280", label: f.estado }
                const total = (f.subtotal || 0) + (f.igv || 0)
                return (
                  <tr key={f.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{f.numero_factura}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{f.proyecto?.codigo}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.proyecto?.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{f.proyecto?.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>{fmt(total)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(f.monto_final_abonado)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ec.label}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{f.fecha_emision || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      {f.link_reporte ? <a href={f.link_reporte} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>📁 Ver reporte</a> : <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <select style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}
                        value={f.estado} onChange={e => cambiarEstado(f.id, e.target.value)}>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
