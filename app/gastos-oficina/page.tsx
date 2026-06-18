"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import KpiCard from "@/components/ui/KpiCard"
import StatusBadge from "@/components/ui/StatusBadge"
import { puedeAccederRuta } from "@/lib/permissions"

const TIPOS: Record<string, string> = {
  alquiler: "Alquiler",
  servicios: "Servicios",
  material_administrativo: "Material administrativo",
  limpieza: "Limpieza",
  seguridad: "Seguridad",
  tecnologia: "Tecnología",
  comunicaciones: "Comunicaciones",
  otros: "Otros",
}

const ESTADOS_PAGO: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  pagado:    { label: "Pagado",    bg: "#dcfce7", color: "#15803d" },
  vencido:   { label: "Vencido",   bg: "#fee2e2", color: "#991b1b" },
}

const FRECUENCIAS: Record<string, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual"
}

const TIPOS_COMPROBANTE = ["factura", "boleta", "recibo", "deposito", "otro"]
const ROLES_REGISTRO = ["controller", "administrador", "gerente_general", "superadmin"]

const formVacio = {
  descripcion: "", tipo: "alquiler", monto: "", fecha: "", estado_pago: "pendiente",
  recurrente: false, frecuencia: "mensual", fecha_vencimiento: "",
  proveedor_id: "", proveedor_nombre: "", tipo_comprobante: "factura",
  numero_comprobante: "", categoria_costo: "", observaciones: "", numero_operacion: "", banco_origen: "", tipo_transferencia: "transferencia_bancaria", voucher_url: "", nota_pago: "",
}

export default function GastosOficinaPage() {
  const supabase = createClient()
  const [gastos, setGastos] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [form, setForm] = useState<any>({ ...formVacio })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeAccederRuta(p?.perfil, "/gastos-oficina")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const { data: g } = await supabase
      .from("gastos_oficina")
      .select("*, proveedor:proveedores(nombre), registrador:perfiles!registrado_por(nombre, apellido)")
      .order("fecha", { ascending: false })
    setGastos(g || [])

    const { data: pr } = await supabase.from("proveedores").select("id, nombre").order("nombre")
    setProveedores(pr || [])

    setLoading(false)
  }
  function abrirNuevo() {
    if (!autorizado) return
    setEditando(null)
    setForm({ ...formVacio })
    setShowForm(true)
  }

  function abrirEditar(g: any) {
    if (!autorizado) return
    setEditando(g)
    setForm({
      descripcion: g.descripcion || "",
      tipo: g.tipo || "alquiler",
      monto: g.monto || "",
      fecha: g.fecha || "",
      estado_pago: g.estado_pago || "pendiente",
      recurrente: g.recurrente || false,
      frecuencia: g.frecuencia || "mensual",
      fecha_vencimiento: g.fecha_vencimiento || "",
      proveedor_id: g.proveedor_id || "",
      proveedor_nombre: g.proveedor_nombre || "",
      tipo_comprobante: g.tipo_comprobante || "factura",
      numero_comprobante: g.numero_comprobante || "",
      categoria_costo: g.categoria_costo || "",
      observaciones: g.observaciones || "",
      numero_operacion: g.numero_operacion || "",
      banco_origen: g.banco_origen || "",
      tipo_transferencia: g.tipo_transferencia || "transferencia_bancaria",
      voucher_url: g.voucher_url || "",
      nota_pago: g.nota_pago || "",
    })
    setShowForm(true)
  }

  async function guardar() {
    if (!autorizado || !puedeRegistrar) return
    if (!form.descripcion || !form.monto || !form.fecha) {
      alert("Descripción, monto y fecha son obligatorios"); return
    }
    setSaving(true)
    const payload = {
      descripcion: form.descripcion,
      tipo: form.tipo,
      monto: Number(form.monto),
      fecha: form.fecha,
      estado_pago: form.estado_pago,
      recurrente: form.recurrente,
      frecuencia: form.recurrente ? form.frecuencia : null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: form.proveedor_nombre || null,
      tipo_comprobante: form.tipo_comprobante || null,
      numero_comprobante: form.numero_comprobante || null,
      categoria_costo: form.categoria_costo || null,
      observaciones: form.observaciones || null,
      numero_operacion: form.numero_operacion || null,
      banco_origen: form.banco_origen || null,
      tipo_transferencia: form.tipo_transferencia || null,
      voucher_url: form.voucher_url || null,
      nota_pago: form.nota_pago || null,
      registrado_por: perfil?.id || null,
      entidad: "peru",
    }
    if (editando) {
      await supabase.from("gastos_oficina").update(payload).eq("id", editando.id)
      await registrarAccion({ accion: "editar", modulo: "gastos_oficina", entidad_tipo: "gasto_oficina", descripcion: "Gasto editado: " + form.descripcion })
    } else {
      await supabase.from("gastos_oficina").insert(payload)
      await registrarAccion({ accion: "crear", modulo: "gastos_oficina", entidad_tipo: "gasto_oficina", descripcion: "Gasto creado: " + form.descripcion })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function guardarDatosOperacionGasto(registro: any) {
    if (!autorizado || !puedeEditarPagoGasto) return
    const payload = {
      numero_operacion: (document.getElementById("go-numop-" + registro.id) as HTMLInputElement)?.value || null,
      banco_origen: (document.getElementById("go-banco-" + registro.id) as HTMLInputElement)?.value || null,
      tipo_transferencia: (document.getElementById("go-tipo-" + registro.id) as HTMLSelectElement)?.value || null,
      voucher_url: (document.getElementById("go-voucher-" + registro.id) as HTMLInputElement)?.value || null,
      nota_pago: (document.getElementById("go-nota-" + registro.id) as HTMLInputElement)?.value || null,
    }

    const { error } = await supabase.from("gastos_oficina").update(payload).eq("id", registro.id)
    if (error) { alert("Error guardando datos de operación: " + error.message); return }

    setSelected((prev: any) => ({ ...prev, ...payload }))
    setGastos(prev => prev.map(g => g.id === registro.id ? { ...g, ...payload } : g))
    await registrarAccion({ accion: "editar", modulo: "gastos_oficina", entidad_id: registro.id, entidad_tipo: "gasto_oficina", descripcion: "Datos de operación actualizados: " + registro.descripcion })
    alert("Datos de operación guardados")
  }
  async function cambiarEstado(id: string, estado_pago: string) {
    if (!autorizado || !puedeRegistrar) return
    await supabase.from("gastos_oficina").update({ estado_pago }).eq("id", id)
    setGastos(prev => prev.map(g => g.id === id ? { ...g, estado_pago } : g))
  }

  async function eliminar(id: string) {
    if (!autorizado || !puedeRegistrar) return
    if (!confirm("¿Eliminar este gasto?")) return
    await supabase.from("gastos_oficina").delete().eq("id", id)
    load()
  }

  const puedeRegistrar = perfil && ROLES_REGISTRO.includes(perfil.perfil)
  const puedeEditarPagoGasto = perfil && ["controller", "superadmin"].includes(perfil.perfil)
  const puedeEditarPago = perfil && ["controller", "superadmin"].includes(perfil.perfil)

  const gastosFiltrados = gastos.filter(g => {
    if (filtroEstado !== "todos" && g.estado_pago !== filtroEstado) return false
    if (filtroTipo !== "todos" && g.tipo !== filtroTipo) return false
    return true
  })

  const totalPagado = gastos.filter(g => g.estado_pago === "pagado").reduce((s, g) => s + (g.monto || 0), 0)
  const totalPendiente = gastos.filter(g => g.estado_pago === "pendiente").reduce((s, g) => s + (g.monto || 0), 0)
  const totalVencido = gastos.filter(g => g.estado_pago === "vencido").reduce((s, g) => s + (g.monto || 0), 0)

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Gastos de Oficina</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{gastos.length} registros</p>
        </div>
        {puedeRegistrar && (
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo gasto</button>
        )}
      </div>

      {/* Resumen */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>

  <KpiCard
    label="PAGADO"
    value={fmt(totalPagado)}
    icon="money"
    borderColor="#16A34A"
    valueColor="#15803D"
  />

  <KpiCard
    label="PENDIENTE"
    value={fmt(totalPendiente)}
    icon="wallet"
    borderColor="#F59E0B"
    valueColor="#D97706"
  />

  <KpiCard
    label="VENCIDO"
    value={fmt(totalVencido)}
    icon="chart"
    borderColor="#DC2626"
    valueColor="#DC2626"
  />

</div>

{/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={{ ...inp, width: "auto" }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
        {gastosFiltrados.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay gastos registrados</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RECURRENTE</th>
                <th style={{ padding: "10px 16px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((g, idx) => {
                const ep = ESTADOS_PAGO[g.estado_pago] || ESTADOS_PAGO.pendiente
                return (
                  <tr key={g.id} onClick={() => setSelected(g)} style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === g.id ? "#ecfdf5" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>{g.fecha}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{g.descripcion}</div>
                      {g.numero_comprobante && <div style={{ fontSize: 11, color: "#9ca3af" }}>{g.tipo_comprobante} {g.numero_comprobante}</div>}
                      {g.categoria_costo && <div style={{ fontSize: 11, color: "#9ca3af" }}>{g.categoria_costo}</div>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                        {TIPOS[g.tipo] || g.tipo}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>
                      {g.proveedor?.nombre || g.proveedor_nombre || "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#111827" }}>
                      {fmt(g.monto)}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {puedeRegistrar ? (
                        <select
                          style={{ padding: "3px 8px", border: `1px solid ${ep.color}44`, borderRadius: 6, fontSize: 11, fontFamily: "inherit", background: ep.bg, color: ep.color, cursor: "pointer", fontWeight: 600 }}
                          value={g.estado_pago}
                          onClick={e => e.stopPropagation()} onChange={e => cambiarEstado(g.id, e.target.value)}>
                          {Object.entries(ESTADOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      ) : (
                        <StatusBadge label={ep.label} type={g.estado_pago} />
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {g.recurrente ? (
                        <span style={{ fontSize: 11, color: "#1e40af", background: "#dbeafe", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                          🔄 {FRECUENCIAS[g.frecuencia] || g.frecuencia}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>Puntual</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {puedeRegistrar && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={e => { e.stopPropagation(); setSelected(g) }} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>Ver detalle</button>
                      <button onClick={e => { e.stopPropagation(); abrirEditar(g) }} className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>Editar</button>
                      <button onClick={e => { e.stopPropagation(); eliminar(g.id) }}
                            style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                <td colSpan={4} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#374151" }}>TOTAL</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  {fmt(gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* OFFICE_EXPENSE_PAYMENT_DRAWER_START */}
      {selected && (
        <aside style={{ position: "fixed", right: 0, top: 70, bottom: 0, width: 390, background: "#fff", borderLeft: "1px solid #e5e7eb", boxShadow: "-12px 0 30px rgba(15,23,42,.10)", zIndex: 900, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#111827" }}>Detalle del gasto</h2>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{selected.descripcion}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 22 }}>×</button>
          </div>

          <div style={{ display: "grid", gap: 9, marginBottom: 16 }}>
            <div><b>Proveedor:</b> {selected.proveedor?.nombre || selected.proveedor_nombre || "—"}</div>
            <div><b>Fecha:</b> {selected.fecha || "—"}</div>
            <div><b>Monto:</b> {fmt(selected.monto)}</div>
            <div><b>Estado:</b> {ESTADOS_PAGO[selected.estado_pago]?.label || selected.estado_pago}</div>
            <div><b>Comprobante:</b> {selected.tipo_comprobante || "—"} {selected.numero_comprobante || ""}</div>
            <div><b>Categoría:</b> {selected.categoria_costo || "—"}</div>
          </div>

          <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0F6E56", marginBottom: 12 }}>DATOS DE OPERACIÓN</div>

            <label style={lbl}>N° OPERACIÓN / REFERENCIA</label>
            <input id={"go-numop-" + selected.id} disabled={!puedeEditarPagoGasto} style={{ ...inp, marginBottom: 10 }} defaultValue={selected.numero_operacion || ""} placeholder="Ej: 123456789" />

            <label style={lbl}>BANCO ORIGEN</label>
            <input id={"go-banco-" + selected.id} disabled={!puedeEditarPagoGasto} style={{ ...inp, marginBottom: 10 }} defaultValue={selected.banco_origen || ""} placeholder="Seleccionar" />

            <label style={lbl}>TIPO TRANSFERENCIA</label>
            <select id={"go-tipo-" + selected.id} disabled={!puedeEditarPagoGasto} style={{ ...inp, marginBottom: 10 }} defaultValue={selected.tipo_transferencia || "transferencia_bancaria"}>
              <option value="transferencia_bancaria">Transferencia bancaria</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </select>

            <label style={lbl}>LINK VOUCHER (GOOGLE DRIVE)</label>
            <input id={"go-voucher-" + selected.id} disabled={!puedeEditarPagoGasto} style={{ ...inp, marginBottom: 10 }} defaultValue={selected.voucher_url || ""} placeholder="https://drive.google.com/..." />

            <label style={lbl}>NOTA DE PAGO</label>
            <input id={"go-nota-" + selected.id} disabled={!puedeEditarPagoGasto} style={{ ...inp, marginBottom: 12 }} defaultValue={selected.nota_pago || ""} placeholder="Observaciones opcionales..." />

            {selected.voucher_url && (
              <a href={selected.voucher_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: 12, marginRight: 8 }}>📎 Ver voucher</a>
            )}

            {puedeEditarPagoGasto && (
              <button onClick={() => guardarDatosOperacionGasto(selected)} className="btn-primary" style={{ width: "100%", fontSize: 12 }}>Guardar datos operación</button>
            )}
          </div>

          {selected.observaciones && (
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 4 }}>OBSERVACIONES</div>
              <div style={{ fontSize: 13, color: "#334155" }}>{selected.observaciones}</div>
            </div>
          )}
        </aside>
      )}
      {/* OFFICE_EXPENSE_PAYMENT_DRAWER_END */}
      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar gasto" : "Nuevo gasto de oficina"}</h2>
                      <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>DESCRIPCIÓN *</label>
                <input style={inp} value={form.descripcion} placeholder="Ej: Alquiler oficina San Isidro" onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>TIPO *</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>MONTO S/ *</label>
                  <input type="number" style={inp} value={form.monto} placeholder="0.00" onChange={e => setForm({ ...form, monto: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA *</label>
                  <input type="date" style={inp} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>ESTADO PAGO</label>
                  <select style={inp} value={form.estado_pago} onChange={e => setForm({ ...form, estado_pago: e.target.value })}>
                    {Object.entries(ESTADOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>TIPO COMPROBANTE</label>
                  <select style={inp} value={form.tipo_comprobante} onChange={e => setForm({ ...form, tipo_comprobante: e.target.value })}>
                    {TIPOS_COMPROBANTE.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>N° COMPROBANTE</label>
                  <input style={inp} value={form.numero_comprobante} placeholder="F001-00123" onChange={e => setForm({ ...form, numero_comprobante: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>PROVEEDOR</label>
                <select style={inp} value={form.proveedor_id} onChange={e => {
                  const prov = proveedores.find(p => p.id === e.target.value)
                  setForm({ ...form, proveedor_id: e.target.value, proveedor_nombre: prov?.nombre || "" })
                }}>
                  <option value="">Sin proveedor registrado</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {!form.proveedor_id && (
                  <input style={{ ...inp, marginTop: 6 }} value={form.proveedor_nombre} placeholder="O escribe el nombre del proveedor..." onChange={e => setForm({ ...form, proveedor_nombre: e.target.value })} />
                )}
              </div>
              <div>
                <label style={lbl}>CENTRO DE COSTOS / CATEGORÍA</label>
                <input style={inp} value={form.categoria_costo} placeholder="Ej: Administración general" onChange={e => setForm({ ...form, categoria_costo: e.target.value })} />
              </div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: form.recurrente ? 12 : 0 }}>
                  <input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} style={{ width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Gasto recurrente</span>
                </label>
                {form.recurrente && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lbl}>FRECUENCIA</label>
                      <select style={inp} value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}>
                        {Object.entries(FRECUENCIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>PRÓXIMO VENCIMIENTO</label>
                      <input type="date" style={inp} value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>OBSERVACIONES</label>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.observaciones} placeholder="Notas adicionales..." onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                      <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
                      <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : editando ? "Actualizar" : "Registrar gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}













