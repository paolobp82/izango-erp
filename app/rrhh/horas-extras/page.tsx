"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

export default function HorasExtrasPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [batchItems, setBatchItems] = useState<any[]>([{ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "" }])
  const [form, setForm] = useState({ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: t } = await supabase.from("rrhh_trabajadores").select("*").eq("usuario_id", user.id).single()
      setTrabajadorPropio(t)
    }
    const [{ data: regs }, { data: trabs }, { data: pros }] = await Promise.all([
      supabase.from("rrhh_horas_extras").select("*, trabajador:rrhh_trabajadores(nombre,apellido,sueldo_base), proyecto:proyectos(nombre,codigo)").order("fecha", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
      supabase.from("proyectos").select("id,nombre,codigo").order("nombre"),
    ])
    setRegistros(regs || [])
    setTrabajadores(trabs || [])
    setProyectos(pros || [])
    setLoading(false)
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general" || perfil?.perfil === "administrador" || perfil?.perfil === "controller"

  async function guardar() {
    if (!form.fecha || !form.horas) { alert("Fecha y horas son obligatorios"); return }
    setSaving(true)
    const trabajadorId = esAdmin ? form.trabajador_id : trabajadorPropio?.id
    if (!trabajadorId) { alert("No se encontró el trabajador"); setSaving(false); return }
    await supabase.from("rrhh_horas_extras").insert({ ...form, trabajador_id: trabajadorId, horas: parseFloat(form.horas.toString()), proyecto_id: form.proyecto_id || null })
    setSaving(false)
    setShowForm(false)
    setForm({ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "" })
    load()
  }

  async function guardarBatch() {
    setSaving(true)
    const validos = batchItems.filter(b => b.trabajador_id && b.fecha && b.horas)
    for (const b of validos) {
      await supabase.from("rrhh_horas_extras").insert({ ...b, horas: parseFloat(b.horas), proyecto_id: b.proyecto_id || null })
    }
    setSaving(false)
    setShowBatch(false)
    setBatchItems([{ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "" }])
    load()
  }

  async function aprobar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_horas_extras").update({ aprobado: true, aprobado_por: user?.id }).eq("id", id)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    await supabase.from("rrhh_horas_extras").delete().eq("id", id)
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    const matchMes = !filtroMes || r.fecha?.startsWith(filtroMes)
    if (!esAdmin) return r.trabajador_id === trabajadorPropio?.id
    return matchTrab && matchMes
  })

  const totalMonto = registrosFiltrados.filter(r => r.aprobado).reduce((s, r) => s + (r.monto_calculado || 0), 0)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Horas Extras</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{registrosFiltrados.length} registros</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ImportExport modulo="rrhh_horas_extras"
            campos={[
              {key:"fecha",label:"Fecha",requerido:true},{key:"horas",label:"Horas",requerido:true},
              {key:"motivo",label:"Motivo"},{key:"monto_calculado",label:"Monto calculado"},
              {key:"aprobado",label:"Aprobado"},
            ]}
            datos={registrosFiltrados}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[]
              for(const r of registros){
                const trabajadorId = esAdmin ? r.trabajador_id : trabajadorPropio?.id
                const {error}=await supabase.from("rrhh_horas_extras").insert({...r,trabajador_id:trabajadorId})
                if(error)errores.push(r.fecha+": "+error.message); else exitosos++
              }
              load(); return{exitosos,errores}
            }} />
          {esAdmin && <button onClick={() => setShowBatch(true)} className="btn-secondary" style={{ fontSize: 13 }}>+ Carga masiva</button>}
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Registrar HH.EE</button>
        </div>
      </div>

      {esAdmin && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select style={{ ...inp, maxWidth: 200 }} value={filtroTrabajador} onChange={e => setFiltroTrabajador(e.target.value)}>
            <option value="">Todos los trabajadores</option>
            {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
          </select>
          <input style={{ ...inp, maxWidth: 160 }} type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} />
          {totalMonto > 0 && <div style={{ background: "#d1fae5", color: "#065f46", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Total aprobado: S/ {totalMonto.toFixed(2)}</div>}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {registrosFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay registros de horas extras.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {esAdmin && <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TRABAJADOR</th>}
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HORAS</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MOTIVO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                {esAdmin && <th style={{ padding: "10px 20px", width: 120 }}></th>}
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((r, idx) => (
                <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {esAdmin && <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>{r.trabajador?.apellido}, {r.trabajador?.nombre}</td>}
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{r.fecha}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827" }}>{r.horas}h</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{r.motivo || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{r.proyecto ? `${r.proyecto.codigo}` : "—"}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#065f46" }}>S/ {Number(r.monto_calculado || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {r.aprobado ? (
                      <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>✓ Aprobado</span>
                    ) : (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Pendiente</span>
                    )}
                  </td>
                  {esAdmin && (
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {!r.aprobado && <button onClick={() => aprobar(r.id)} style={{ fontSize: 12, padding: "3px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Aprobar</button>}
                        <button onClick={() => eliminar(r.id)} style={{ fontSize: 12, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal registro individual */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Registrar horas extras</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {esAdmin && (
                <div>
                  <label style={lbl}>Trabajador *</label>
                  <select style={inp} value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha *</label><input style={inp} type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
                <div><label style={lbl}>Horas *</label><input style={inp} type="number" min="0.5" step="0.5" value={form.horas} onChange={e => setForm({ ...form, horas: parseFloat(e.target.value) })} /></div>
              </div>
              <div><label style={lbl}>Motivo</label><input style={inp} value={form.motivo} placeholder="Descripción del trabajo" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
              <div>
                <label style={lbl}>Proyecto</label>
                <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal batch */}
      {showBatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 780, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Carga masiva — Horas extras</h2>
              <button onClick={() => setShowBatch(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              {batchItems.map((b, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                  <div>
                    {i === 0 && <label style={lbl}>Trabajador</label>}
                    <select style={inp} value={b.trabajador_id} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, trabajador_id: e.target.value } : x))}>
                      <option value="">Seleccionar</option>
                      {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Fecha</label>}
                    <input style={inp} type="date" value={b.fecha} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Horas</label>}
                    <input style={inp} type="number" min="0.5" step="0.5" value={b.horas} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, horas: parseFloat(e.target.value) } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Motivo</label>}
                    <input style={inp} value={b.motivo} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Proyecto</label>}
                    <select style={inp} value={b.proyecto_id} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, proyecto_id: e.target.value } : x))}>
                      <option value="">Sin proyecto</option>
                      {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setBatchItems(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 4 }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => setBatchItems(prev => [...prev, { trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "" }])} style={{ fontSize: 12, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "4px 12px", cursor: "pointer", marginBottom: 16 }}>+ Agregar fila</button>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowBatch(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarBatch} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : "Guardar todo"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}