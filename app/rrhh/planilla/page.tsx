"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

export default function PlanillaPage() {
  const supabase = createClient()
  const [planillas, setPlanillas] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroPeriodo, setFiltroPeriodo] = useState("")
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [form, setForm] = useState({
    trabajador_id: "", periodo: "", sueldo_base: 0, bonificaciones: 0,
    gratificacion: 0, cts: 0, comision_proyectos: 0, comision_ventas: 0,
    horas_extras_monto: 0, descuentos: 0, aporte_pension: 0, notas: ""
  })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: plans }, { data: trabs }] = await Promise.all([
      supabase.from("rrhh_planilla").select("*, trabajador:rrhh_trabajadores(nombre,apellido,tipo,banco,numero_cuenta,cci)").order("periodo", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido,sueldo_base,tipo").eq("activo", true).order("apellido"),
    ])
    setPlanillas(plans || [])
    setTrabajadores(trabs || [])
    setLoading(false)
  }

  async function generarPlanillaMes(periodo: string) {
    if (!periodo) { alert("Selecciona un periodo"); return }
    setSaving(true)
    for (const t of trabajadores) {
      const existe = planillas.find(p => p.trabajador_id === t.id && p.periodo === periodo)
      if (!existe) {
        const { data: horas } = await supabase.from("rrhh_horas_extras")
          .select("monto_calculado").eq("trabajador_id", t.id).eq("aprobado", true)
          .gte("fecha", periodo + "-01").lte("fecha", periodo + "-31")
        const totalHoras = (horas || []).reduce((s: number, h: any) => s + (h.monto_calculado || 0), 0)
        const esJulio = periodo.endsWith("-07")
        const esDiciembre = periodo.endsWith("-12")
        const gratificacion = (esJulio || esDiciembre) ? t.sueldo_base : 0
        const cts = t.tipo === "planilla" ? t.sueldo_base / 12 : 0
        const aportePension = t.sueldo_base * 0.13
        await supabase.from("rrhh_planilla").insert({
          trabajador_id: t.id, periodo,
          sueldo_base: t.sueldo_base || 0,
          bonificaciones: 0, gratificacion, cts,
          comision_proyectos: 0, comision_ventas: 0,
          horas_extras_monto: totalHoras,
          descuentos: 0, aporte_pension: aportePension,
          estado: "borrador"
        })
      }
    }
    setSaving(false)
    setFiltroPeriodo(periodo)
    load()
  }

  function abrirEditar(p: any) {
    setEditando(p)
    setForm({
      trabajador_id: p.trabajador_id, periodo: p.periodo,
      sueldo_base: p.sueldo_base, bonificaciones: p.bonificaciones,
      gratificacion: p.gratificacion, cts: p.cts,
      comision_proyectos: p.comision_proyectos, comision_ventas: p.comision_ventas,
      horas_extras_monto: p.horas_extras_monto, descuentos: p.descuentos,
      aporte_pension: p.aporte_pension, notas: p.notas || ""
    })
    setShowForm(true)
  }

  async function guardar() {
    setSaving(true)
    const payload = {
      sueldo_base: parseFloat(form.sueldo_base.toString()) || 0,
      bonificaciones: parseFloat(form.bonificaciones.toString()) || 0,
      gratificacion: parseFloat(form.gratificacion.toString()) || 0,
      cts: parseFloat(form.cts.toString()) || 0,
      comision_proyectos: parseFloat(form.comision_proyectos.toString()) || 0,
      comision_ventas: parseFloat(form.comision_ventas.toString()) || 0,
      horas_extras_monto: parseFloat(form.horas_extras_monto.toString()) || 0,
      descuentos: parseFloat(form.descuentos.toString()) || 0,
      aporte_pension: parseFloat(form.aporte_pension.toString()) || 0,
      notas: form.notas,
      updated_at: new Date().toISOString()
    }
    if (editando) {
      await supabase.from("rrhh_planilla").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("rrhh_planilla").insert({ ...form, ...payload, estado: "borrador" })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("rrhh_planilla").update({ estado, updated_at: new Date().toISOString() }).eq("id", id)
    load()
  }

  const planillasFiltradas = planillas.filter(p => {
    const matchPeriodo = !filtroPeriodo || p.periodo === filtroPeriodo
    const matchTrab = !filtroTrabajador || p.trabajador_id === filtroTrabajador
    const matchEstado = !filtroEstado || p.estado === filtroEstado
    return matchPeriodo && matchTrab && matchEstado
  })

  const totalBruto = planillasFiltradas.reduce((s, p) => s + (p.total_bruto || 0), 0)
  const totalNeto = planillasFiltradas.reduce((s, p) => s + (p.total_neto || 0), 0)

  const ESTADO_COLOR: any = {
    borrador: { bg: "#f3f4f6", color: "#6b7280" },
    aprobada: { bg: "#dbeafe", color: "#1e40af" },
    pagada: { bg: "#d1fae5", color: "#065f46" },
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  const periodos = [...new Set(planillas.map(p => p.periodo))].sort().reverse()

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Planilla</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{planillasFiltradas.length} registros</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ImportExport modulo="rrhh_planilla"
            campos={[
              {key:"periodo",label:"Periodo"},{key:"sueldo_base",label:"Sueldo base"},
              {key:"bonificaciones",label:"Bonificaciones"},{key:"gratificacion",label:"Gratificacion"},
              {key:"cts",label:"CTS"},{key:"comision_proyectos",label:"Comision proyectos"},
              {key:"comision_ventas",label:"Comision ventas"},{key:"horas_extras_monto",label:"HH.EE monto"},
              {key:"descuentos",label:"Descuentos"},{key:"aporte_pension",label:"Aporte pension"},
              {key:"total_bruto",label:"Total bruto"},{key:"total_neto",label:"Total neto"},
              {key:"estado",label:"Estado"},
            ]}
            datos={planillasFiltradas}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[]
              for(const r of registros){
                const {error}=await supabase.from("rrhh_planilla").insert({...r,estado:r.estado||"borrador"})
                if(error)errores.push(r.periodo+": "+error.message); else exitosos++
              }
              load(); return{exitosos,errores}
            }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...inp, maxWidth: 140 }} type="month" placeholder="Periodo" onChange={e => setFiltroPeriodo(e.target.value)} />
            <button onClick={() => generarPlanillaMes(filtroPeriodo)} disabled={saving} className="btn-secondary" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              {saving ? "Generando..." : "⚡ Generar planilla"}
            </button>
          </div>
          <button onClick={() => { setEditando(null); setForm({ trabajador_id: "", periodo: "", sueldo_base: 0, bonificaciones: 0, gratificacion: 0, cts: 0, comision_proyectos: 0, comision_ventas: 0, horas_extras_monto: 0, descuentos: 0, aporte_pension: 0, notas: "" }); setShowForm(true) }} className="btn-primary" style={{ fontSize: 13 }}>+ Manual</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select style={{ ...inp, maxWidth: 160 }} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
          <option value="">Todos los periodos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select style={{ ...inp, maxWidth: 220 }} value={filtroTrabajador} onChange={e => setFiltroTrabajador(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
        </select>
        <select style={{ ...inp, maxWidth: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="aprobada">Aprobada</option>
          <option value="pagada">Pagada</option>
        </select>
        {planillasFiltradas.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <div style={{ background: "#f0fdf4", color: "#15803d", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Bruto: {fmt(totalBruto)}</div>
            <div style={{ background: "#1D2040", color: "#03E373", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Neto: {fmt(totalNeto)}</div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {planillasFiltradas.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay registros. Genera la planilla del mes seleccionando un periodo.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TRABAJADOR</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PERIODO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SUELDO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>BONIF.</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>GRAT.</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>HH.EE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCTOS.</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PENSIÓN</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>BRUTO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>NETO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {planillasFiltradas.map((p, idx) => {
                const ec = ESTADO_COLOR[p.estado] || ESTADO_COLOR.borrador
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.trabajador?.apellido}, {p.trabajador?.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.trabajador?.banco} {p.trabajador?.numero_cuenta}</div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{p.periodo}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#374151" }}>{fmt(p.sueldo_base)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#374151" }}>{fmt(p.bonificaciones)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#374151" }}>{fmt(p.gratificacion)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#374151" }}>{fmt(p.horas_extras_monto)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#dc2626" }}>{fmt(p.descuentos)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 12, color: "#dc2626" }}>{fmt(p.aporte_pension)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fmt(p.total_bruto)}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#03E373" }}>{fmt(p.total_neto)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{p.estado}</span>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button onClick={() => abrirEditar(p)} className="btn-secondary" style={{ fontSize: 11 }}>Editar</button>
                        {p.estado === "borrador" && <button onClick={() => cambiarEstado(p.id, "aprobada")} style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", color: "#1e40af", cursor: "pointer" }}>Aprobar</button>}
                        {p.estado === "aprobada" && <button onClick={() => cambiarEstado(p.id, "pagada")} style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Pagar</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar planilla" : "Nueva entrada planilla"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {!editando && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Trabajador *</label>
                    <select style={inp} value={form.trabajador_id} onChange={e => { const t = trabajadores.find(x => x.id === e.target.value); setForm({ ...form, trabajador_id: e.target.value, sueldo_base: t?.sueldo_base || 0 }) }}>
                      <option value="">Seleccionar</option>
                      {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Periodo *</label><input style={inp} type="month" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} /></div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Sueldo base</label><input style={inp} type="number" value={form.sueldo_base} onChange={e => setForm({ ...form, sueldo_base: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Bonificaciones</label><input style={inp} type="number" value={form.bonificaciones} onChange={e => setForm({ ...form, bonificaciones: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Gratificación</label><input style={inp} type="number" value={form.gratificacion} onChange={e => setForm({ ...form, gratificacion: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>CTS</label><input style={inp} type="number" value={form.cts} onChange={e => setForm({ ...form, cts: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Comisión proyectos</label><input style={inp} type="number" value={form.comision_proyectos} onChange={e => setForm({ ...form, comision_proyectos: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Comisión ventas</label><input style={inp} type="number" value={form.comision_ventas} onChange={e => setForm({ ...form, comision_ventas: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>HH.EE monto</label><input style={inp} type="number" value={form.horas_extras_monto} onChange={e => setForm({ ...form, horas_extras_monto: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Descuentos</label><input style={inp} type="number" value={form.descuentos} onChange={e => setForm({ ...form, descuentos: parseFloat(e.target.value) || 0 })} /></div>
                <div><label style={lbl}>Aporte pensión</label><input style={inp} type="number" value={form.aporte_pension} onChange={e => setForm({ ...form, aporte_pension: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div><label style={lbl}>Notas</label><input style={inp} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}