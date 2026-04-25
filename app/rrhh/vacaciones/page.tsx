"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function VacacionesPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", motivo: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: t } = await supabase.from("rrhh_trabajadores").select("*").eq("usuario_id", user.id).single()
      setTrabajadorPropio(t)
    }
    const [{ data: regs }, { data: trabs }] = await Promise.all([
      supabase.from("rrhh_vacaciones").select("*, trabajador:rrhh_trabajadores(nombre,apellido), aprobador:perfiles!aprobado_por(nombre,apellido)").order("created_at", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
    ])
    setRegistros(regs || [])
    setTrabajadores(trabs || [])
    setLoading(false)
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general" || perfil?.perfil === "administrador" || perfil?.perfil === "controller"

  async function guardar() {
    if (!form.fecha_inicio || !form.fecha_fin) { alert("Fechas son obligatorias"); return }
    if (form.fecha_fin < form.fecha_inicio) { alert("Fecha fin debe ser mayor a fecha inicio"); return }
    setSaving(true)
    const trabajadorId = trabajadorPropio?.id
    if (!trabajadorId && !esAdmin) { alert("No se encontró tu ficha de trabajador"); setSaving(false); return }
    await supabase.from("rrhh_vacaciones").insert({ ...form, trabajador_id: trabajadorId, estado: "pendiente" })
    setSaving(false)
    setShowForm(false)
    setForm({ fecha_inicio: "", fecha_fin: "", motivo: "" })
    load()
  }

  async function cambiarEstado(id: string, estado: string, notas: string = "") {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_vacaciones").update({ estado, aprobado_por: user?.id, notas_admin: notas }).eq("id", id)
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    if (!esAdmin) return r.trabajador_id === trabajadorPropio?.id
    const matchEstado = !filtroEstado || r.estado === filtroEstado
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    return matchEstado && matchTrab
  })

  const ESTADO_COLOR: any = {
    pendiente: { bg: "#fef3c7", color: "#92400e" },
    aprobada: { bg: "#d1fae5", color: "#065f46" },
    rechazada: { bg: "#fee2e2", color: "#dc2626" },
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Vacaciones</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{registrosFiltrados.length} solicitudes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Solicitar vacaciones</button>
      </div>

      {esAdmin && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <select style={{ ...inp, maxWidth: 200 }} value={filtroTrabajador} onChange={e => setFiltroTrabajador(e.target.value)}>
            <option value="">Todos los trabajadores</option>
            {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
          </select>
          <select style={{ ...inp, maxWidth: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {registrosFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay solicitudes de vacaciones.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {esAdmin && <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TRABAJADOR</th>}
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESDE</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HASTA</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DÍAS</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MOTIVO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                {esAdmin && <th style={{ padding: "10px 20px", width: 160 }}></th>}
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r, idx) => {
                const ec = ESTADO_COLOR[r.estado] || ESTADO_COLOR.pendiente
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    {esAdmin && <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>{r.trabajador?.apellido}, {r.trabajador?.nombre}</td>}
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{r.fecha_inicio}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{r.fecha_fin}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827" }}>{r.dias}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{r.motivo || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{r.estado}</span>
                    </td>
                    {esAdmin && (
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {r.estado === "pendiente" && (
                            <>
                              <button onClick={() => cambiarEstado(r.id, "aprobada")} style={{ fontSize: 12, padding: "3px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Aprobar</button>
                              <button onClick={() => cambiarEstado(r.id, "rechazada")} style={{ fontSize: 12, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>Rechazar</button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Solicitar vacaciones</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha inicio *</label><input style={inp} type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><label style={lbl}>Fecha fin *</label><input style={inp} type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Motivo</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={form.motivo} placeholder="Motivo de las vacaciones" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : "Solicitar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}