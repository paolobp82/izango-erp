"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { enviarAlerta } from "@/lib/alertas"

const ESTADOS: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e",  label: "Pendiente aprobacion" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412",  label: "Aprobado Produccion" },
  aprobado:             { bg: "#dcfce7", color: "#15803d",  label: "Aprobado GG" },
  programado:           { bg: "#dbeafe", color: "#1e40af",  label: "Programado pago" },
  pagado:               { bg: "#f0fdf4", color: "#166534",  label: "Pagado" },
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

export default function RQPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("")
  const [proveedores, setProveedores] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [showNuevoRQ, setShowNuevoRQ] = useState(false)
const [proyectos, setProyectos] = useState<any[]>([])
const [formRQ, setFormRQ] = useState({ descripcion: "", proveedor_id: "", monto_solicitado: "", proyecto_id: "", tipo_pago: "contado", dias_credito: "" })
const [proveedoresTodos, setProveedoresTodos] = useState<any[]>([])
  const [fechaPago, setFechaPago] = useState("")
  const [datosPago, setDatosPago] = useState({
    voucher_url: "", numero_operacion: "", banco_pago: "", tipo_transferencia: "Transferencia bancaria", nota_pago: ""
  })
  const [guardandoPago, setGuardandoPago] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase
      .from("requerimientos_pago")
      .select("*, proyecto:proyectos(nombre, codigo, productor:perfiles!productor_id(nombre, apellido)), proveedor:proveedores(nombre, banco, numero_cuenta, tipo_pago)")
      .order("created_at", { ascending: false })
    setRqs(data || [])
    const provIds = [...new Set((data || []).map((r: any) => r.proveedor_id).filter(Boolean))]
    if (provIds.length > 0) {
      const { data: provs } = await supabase.from("proveedores").select("id, nombre").in("id", provIds)
      setProveedores(provs || [])
    }
    setLoading(false)
  }

  async function cambiarEstado(id: string, estado: string, extra?: any) {
    if (estado === "pagado") {
      const rq = rqs.find(r => r.id === id)
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
    await supabase.from("requerimientos_pago").update(updates).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "rq", entidad_id: id, entidad_tipo: "rq", descripcion: "RQ cambiado a: " + estado })
    load()
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, estado, ...updates }))
  }

  async function guardarDatosPago() {
    if (!selected) return
    setGuardandoPago(true)
    await supabase.from("requerimientos_pago").update({
      voucher_url: datosPago.voucher_url || null,
      numero_operacion: datosPago.numero_operacion || null,
      banco_pago: datosPago.banco_pago || null,
      tipo_transferencia: datosPago.tipo_transferencia || null,
      nota_pago: datosPago.nota_pago || null,
    }).eq("id", selected.id)
    setGuardandoPago(false)
    load()
  }

  function getSiguienteAccion(rq: any) {
    const rol = perfil?.perfil
    const paso = FLUJO.find(f => f.estado === rq.estado)
    if (!paso || !paso.siguiente) return null
    if (paso.roles.includes(rol)) return { label: paso.accion, nextEstado: paso.siguiente, color: "#0F6E56" }
    return null
  }

  function puedeRechazar(rq: any) {
    const rol = perfil?.perfil
    if (rq.estado === "pagado" || rq.estado === "rechazado") return false
    return ["gerente_produccion", "gerente_general", "controller", "superadmin"].includes(rol)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const filtrados = rqs.filter(r => {
    if (filtroEstado && r.estado !== filtroEstado) return false
    if (filtroProveedor && r.proveedor_id !== filtroProveedor) return false
    return true
  })

  const totalPendiente = rqs.filter(r => r.estado === "pendiente_aprobacion").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalAprobado = rqs.filter(r => ["aprobado_produccion", "aprobado"].includes(r.estado)).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalProgramado = rqs.filter(r => r.estado === "programado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalPagado = rqs.filter(r => r.estado === "pagado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3, display: "block" }

  const puedeEditarPago = ["controller", "superadmin"].includes(perfil?.perfil)
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Requerimientos de pago</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {rqs.length} RQs · {perfil ? perfil.nombre + " " + perfil.apellido + " (" + perfil.perfil + ")" : ""}
          </p>
        </div>
        {["superadmin","gerente_general","gerente_produccion","controller"].includes(perfil?.perfil) && (<button onClick={async () => { const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre"); setProveedores(provs || []); setProveedoresTodos(provs || []); const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre").is("deleted_at", null).in("estado", ["en_curso"]).order("codigo"); setProyectos(projs || []); setShowNuevoRQ(true) }} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo RQ</button>)}
        <ImportExport modulo="requerimientos" campos={[{key:"numero_rq",label:"N RQ"},{key:"descripcion",label:"Descripcion"},{key:"proveedor_nombre",label:"Proveedor"},{key:"monto_solicitado",label:"Monto"},{key:"estado",label:"Estado"}]} datos={rqs} onImportar={async () => ({ exitosos: 0, errores: ["RQs se generan automaticamente"] })} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pendientes", value: fmt(totalPendiente), color: "#92400e", bg: "#fef9c3", count: rqs.filter(r => r.estado === "pendiente_aprobacion").length },
          { label: "En aprobacion", value: fmt(totalAprobado), color: "#9a3412", bg: "#fed7aa", count: rqs.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).length },
          { label: "Programados", value: fmt(totalProgramado), color: "#1e40af", bg: "#dbeafe", count: rqs.filter(r => r.estado === "programado").length },
          { label: "Pagados", value: fmt(totalPagado), color: "#166534", bg: "#f0fdf4", count: rqs.filter(r => r.estado === "pagado").length },
        ].map(t => (
          <div key={t.label} className="card" style={{ background: t.bg, border: "none" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.color, textTransform: "uppercase", marginBottom: 4 }}>{t.label} ({t.count})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {(filtroEstado || filtroProveedor) && (
            <button onClick={() => { setFiltroEstado(""); setFiltroProveedor("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} resultados</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N RQ</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((rq, idx) => {
                const ec = ESTADOS[rq.estado] || { bg: "#f3f4f6", color: "#6b7280", label: rq.estado }
                const accion = getSiguienteAccion(rq)
                return (
                  <tr key={rq.id}
                    style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === rq.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
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
                    }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{rq.numero_rq}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{rq.proyecto?.codigo}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{rq.proyecto?.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{rq.proveedor_nombre || rq.proveedor?.nombre || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>
                      {rq.proyecto?.productor ? rq.proyecto.productor.nombre + " " + rq.proyecto.productor.apellido : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rq.descripcion || "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(rq.monto_solicitado)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {ec.label}
                      </span>
                      {rq.estado === "pagado" && rq.numero_operacion && (
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Op: {rq.numero_operacion}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {accion && (
                        <button onClick={() => cambiarEstado(rq.id, accion.nextEstado)}
                          style={{ fontSize: 11, padding: "4px 10px", border: "none", borderRadius: 6, background: accion.color, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                          {accion.label}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay requerimientos de pago</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{selected.numero_rq}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>x</button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={lbl}>Proyecto</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selected.proyecto?.codigo} — {selected.proyecto?.nombre}</div>
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
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{fmt(selected.monto_solicitado)}</div>
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
                      <input style={inp} value={datosPago.numero_operacion} placeholder="Ej: 123456789" onChange={e => setDatosPago({ ...datosPago, numero_operacion: e.target.value })} readOnly={!puedeEditarPago} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={lbl}>Banco origen</label>
                        <select style={inp} value={datosPago.banco_pago} onChange={e => setDatosPago({ ...datosPago, banco_pago: e.target.value })} disabled={false}>
                          <option value="">Seleccionar</option>
                          {BANCOS_PAGO.map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Tipo transferencia</label>
                        <select style={inp} value={datosPago.tipo_transferencia} onChange={e => setDatosPago({ ...datosPago, tipo_transferencia: e.target.value })} disabled={false}>
                          {TIPOS_TRANSFERENCIA.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Link voucher (Google Drive)</label>
                      <input style={inp} value={datosPago.voucher_url} placeholder="https://drive.google.com/..." onChange={e => setDatosPago({ ...datosPago, voucher_url: e.target.value })} readOnly={!puedeEditarPago} />
                      {datosPago.voucher_url && (
                        <a href={datosPago.voucher_url} target="_blank" style={{ fontSize: 11, color: "#1e40af", display: "inline-block", marginTop: 3 }}>Ver voucher →</a>
                      )}
                    </div>
                    <div>
                      <label style={lbl}>Nota de pago</label>
                      <input style={inp} value={datosPago.nota_pago} placeholder="Observaciones opcionales..." onChange={e => setDatosPago({ ...datosPago, nota_pago: e.target.value })} readOnly={!puedeEditarPago} />
                    </div>
                    {puedeEditarPago && (
                      <button onClick={guardarDatosPago} disabled={guardandoPago}
                        style={{ fontSize: 12, padding: "6px", border: "none", borderRadius: 6, background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        {guardandoPago ? "Guardando..." : "Guardar datos operacion"}
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

              {["superadmin","gerente_general","controller"].includes(perfil?.perfil) && (
                <button onClick={async () => {
                  if (!confirm("¿Eliminar este RQ permanentemente?")) return
                  await supabase.from("requerimientos_pago").delete().eq("id", selected.id)
                  setSelected(null)
                  load()
                }}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  🗑 Eliminar RQ
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
      {showNuevoRQ && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nuevo Requerimiento de Pago</h2>
              <button onClick={() => setShowNuevoRQ(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={lbl}>PROYECTO</label><select style={inp} value={formRQ.proyecto_id} onChange={e => setFormRQ({ ...formRQ, proyecto_id: e.target.value })}><option value="">Sin proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}</select></div>
              <div><label style={lbl}>DESCRIPCION</label><input style={inp} value={formRQ.descripcion} placeholder="Concepto del RQ..." onChange={e => setFormRQ({ ...formRQ, descripcion: e.target.value })} /></div>
              <div><label style={lbl}>PROVEEDOR</label><select style={inp} value={formRQ.proveedor_id} onChange={e => setFormRQ({ ...formRQ, proveedor_id: e.target.value })}><option value="">Seleccionar proveedor</option>{proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div><label style={lbl}>MONTO (S/)</label><input type="number" style={inp} value={formRQ.monto_solicitado} placeholder="0.00" onChange={e => setFormRQ({ ...formRQ, monto_solicitado: e.target.value })} /></div>
              <div><label style={lbl}>TIPO DE PAGO</label><select style={inp} value={formRQ.tipo_pago} onChange={e => setFormRQ({ ...formRQ, tipo_pago: e.target.value })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
              <div><label style={lbl}>DIAS DE PAGO (opcional)</label><input type="number" style={inp} value={formRQ.dias_credito} placeholder="Ej: 30, 45, 60..." onChange={e => setFormRQ({ ...formRQ, dias_credito: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowNuevoRQ(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={async () => {
                if (!formRQ.descripcion || !formRQ.monto_solicitado) { alert("Descripcion y monto son obligatorios"); return }
                const prov = proveedores.find((p: any) => p.id === formRQ.proveedor_id)
                const proyId = formRQ.proyecto_id || "MANUAL"
                const { count } = await supabase.from("requerimientos_pago").select("*", { count: "exact", head: true }).eq("proyecto_id", proyId)
                const rqNum = (count || 0) + 1
                await supabase.from("requerimientos_pago").insert({ proyecto_id: formRQ.proyecto_id || null, numero_rq: "RQ-" + proyId.slice(0,6).toUpperCase() + "-" + String(rqNum).padStart(3,"0"), estado: "pendiente_aprobacion", proveedor_id: formRQ.proveedor_id || null, proveedor_nombre: prov?.nombre || "", monto_solicitado: Number(formRQ.monto_solicitado), descripcion: formRQ.descripcion, tipo_pago: formRQ.tipo_pago, dias_credito: formRQ.dias_credito ? Number(formRQ.dias_credito) : null, es_adicional: true })
                setShowNuevoRQ(false)
                setFormRQ({ descripcion: "", proveedor_id: "", monto_solicitado: "", proyecto_id: "", tipo_pago: "contado", dias_credito: "" })
                load()
              }} className="btn-primary" style={{ fontSize: 13 }}>Crear RQ</button>
            </div>
          </div>
        </div>
)}
    </div>
    </div>
  )
}