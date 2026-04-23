"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import { enviarAlerta } from "@/lib/alertas"

const ESTADOS: Record<string, any> = {
  pendiente:            { bg: "#fef9c3", color: "#92400e",  label: "pendiente_aprobacion" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412",  label: "Aprobado Producción" },
  aprobado:             { bg: "#dcfce7", color: "#15803d",  label: "Aprobado GG" },
  programado:           { bg: "#dbeafe", color: "#1e40af",  label: "Programado" },
  pagado:               { bg: "#f0fdf4", color: "#166534",  label: "Pagado" },
  rechazado:            { bg: "#fee2e2", color: "#991b1b",  label: "Rechazado" },
}

export default function RQPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("")
  const [proveedores, setProveedores] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [fechaPago, setFechaPago] = useState("")

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
    if (estado === "aprobado_produccion") updates.aprobado_por = perfil?.id
    if (estado === "aprobado") updates.aprobado_por = perfil?.id
    if (estado === "pagado") updates.fecha_pago = extra?.fecha_pago || new Date().toISOString().split("T")[0]
    await supabase.from("requerimientos_pago").update(updates).eq("id", id)
    load()
    if (selected?.id === id) setSelected({ ...selected, estado, ...updates })
  }

  function getSiguienteAccion(rq: any) {
    const rol = perfil?.perfil
    if (rq.estado === "pendiente_aprobacion" && (rol === "gerente_produccion" || rol === "gerente_general"))
      return { label: "Aprobar (Producción)", nextEstado: "aprobado_produccion", color: "#15803d" }
    if (rq.estado === "aprobado_produccion" && rol === "gerente_general")
      return { label: "Aprobar (GG)", nextEstado: "aprobado", color: "#1e40af" }
    if (rq.estado === "aprobado" && rol === "administrador")
      return { label: "Programar pago", nextEstado: "programado", color: "#7c3aed" }
    if (rq.estado === "programado" && rol === "administrador")
      return { label: "Confirmar pago", nextEstado: "pagado", color: "#0F6E56" }
    return null
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const filtrados = rqs.filter(r => {
    if (filtroEstado && r.estado !== filtroEstado) return false
    if (filtroProveedor && r.proveedor_id !== filtroProveedor) return false
    return true
  })

  const totalPendiente = rqs.filter(r => r.estado === "pendiente_aprobacion").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalAprobado = rqs.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalProgramado = rqs.filter(r => r.estado === "programado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalPagado = rqs.filter(r => r.estado === "pagado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Requerimientos de pago</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{rqs.length} RQs · {perfil ? perfil.nombre + " " + perfil.apellido + " (" + perfil.perfil + ")" : ""}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pendientes", value: fmt(totalPendiente), color: "#92400e", bg: "#fef9c3", count: rqs.filter(r => r.estado === "pendiente_aprobacion").length },
          { label: "En aprobación", value: fmt(totalAprobado), color: "#9a3412", bg: "#fed7aa", count: rqs.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).length },
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

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° RQ</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
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
                  <tr key={rq.id} style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === rq.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                    onClick={() => setSelected(selected?.id === rq.id ? null : rq)}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{rq.numero_rq}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{rq.proyecto?.codigo}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{rq.proyecto?.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{rq.proveedor_nombre || rq.proveedor?.nombre || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{rq.proyecto?.productor ? rq.proyecto.productor.nombre + " " + rq.proyecto.productor.apellido : "—"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rq.descripcion || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(rq.monto_solicitado)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {ec.label}
                      </span>
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
                <tr><td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay requerimientos de pago</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{selected.numero_rq}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Proyecto</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selected.proyecto?.codigo} — {selected.proyecto?.nombre}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Proveedor</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.proveedor_nombre || selected.proveedor?.nombre}</div>
                {selected.proveedor_banco && <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.proveedor_banco} · {selected.proveedor_cuenta}</div>}
                {selected.proveedor_tipo_pago && <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>{selected.proveedor_tipo_pago}</div>}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Descripción</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Monto solicitado</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{fmt(selected.monto_solicitado)}</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>Flujo de aprobación</div>
                {[
                  { estado: "pendiente_aprobacion", label: "Creado", rol: "" },
                  { estado: "aprobado_produccion", label: "Aprobado Producción", rol: "gerente_produccion" },
                  { estado: "aprobado", label: "Aprobado GG", rol: "gerente_general" },
                  { estado: "programado", label: "Programado pago", rol: "administrador" },
                  { estado: "pagado", label: "Pagado", rol: "administrador" },
                ].map((paso, i) => {
                  const estados = ["pendiente_aprobacion","aprobado_produccion","aprobado","programado","pagado"]
                  const idx = estados.indexOf(selected.estado)
                  const pasoIdx = estados.indexOf(paso.estado)
                  const completado = pasoIdx <= idx
                  const actual = pasoIdx === idx
                  return (
                    <div key={paso.estado} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: completado ? "#0F6E56" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      </div>
                      <span style={{ fontSize: 12, color: actual ? "#0F6E56" : completado ? "#374151" : "#9ca3af", fontWeight: actual ? 700 : 400 }}>{paso.label}</span>
                    </div>
                  )
                })}
              </div>
              {selected.estado === "programado" && perfil?.perfil === "administrador" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Fecha de pago</div>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, width: "100%", fontFamily: "inherit" }} />
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
              {(perfil?.perfil === "gerente_produccion" || perfil?.perfil === "gerente_general") && selected.estado !== "rechazado" && selected.estado !== "pagado" && (
                <button onClick={() => cambiarEstado(selected.id, "rechazado")}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  Rechazar RQ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}






