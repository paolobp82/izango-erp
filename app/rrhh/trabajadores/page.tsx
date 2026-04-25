"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

const BANCOS = ["BCP","BBVA","Interbank","Scotiabank","BanBif","Pichincha","Banco de la Nacion","Otro"]
const TIPOS_CUENTA = ["Ahorros","Corriente"]
const PENSIONES = ["AFP_Integra","AFP_Prima","AFP_Habitat","AFP_Profuturo","ONP"]
const TIPOS = ["planilla","honorarios","proyecto"]
const AREAS = ["Produccion","Comercial","Administracion","Finanzas","Logistica","Gerencia"]

export default function TrabajadoresPage() {
  const supabase = createClient()
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [tab, setTab] = useState("info")
  const [contratos, setContratos] = useState<any[]>([])
  const [showContrato, setShowContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({ tipo_contrato: "", fecha_inicio: "", fecha_fin: "", link_google_drive: "", notas: "" })
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any>(null)
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", email: "", telefono: "",
    fecha_ingreso: "", cargo: "", area: "", tipo: "planilla",
    modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "",
    cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: ""
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", true).order("apellido")
    setTrabajadores(data || [])
    setLoading(false)
  }

  async function cargarContratos(trabajadorId: string) {
    const { data } = await supabase.from("rrhh_contratos").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false })
    setContratos(data || [])
  }

  function abrirNuevo() {
    setEditando(null)
    setTab("info")
    setForm({ nombre: "", apellido: "", dni: "", email: "", telefono: "", fecha_ingreso: "", cargo: "", area: "", tipo: "planilla", modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "", cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: "" })
    setShowForm(true)
  }

  function abrirEditar(t: any) {
    setEditando(t)
    setTab("info")
    setForm({
      nombre: t.nombre, apellido: t.apellido, dni: t.dni || "", email: t.email || "",
      telefono: t.telefono || "", fecha_ingreso: t.fecha_ingreso || "", cargo: t.cargo || "",
      area: t.area || "", tipo: t.tipo, modalidad_contrato: t.modalidad_contrato || "",
      banco: t.banco || "", tipo_cuenta: t.tipo_cuenta || "", numero_cuenta: t.numero_cuenta || "",
      cci: t.cci || "", sistema_pension: t.sistema_pension || "AFP_Integra",
      sueldo_base: t.sueldo_base || 0, foto_url: t.foto_url || ""
    })
    cargarContratos(t.id)
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre || !form.apellido) { alert("Nombre y apellido son obligatorios"); return }
    setSaving(true)
    const payload = { ...form, sueldo_base: parseFloat(form.sueldo_base.toString()) || 0, updated_at: new Date().toISOString() }
    if (editando) {
      await supabase.from("rrhh_trabajadores").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("rrhh_trabajadores").insert({ ...payload, activo: true, ficha_aprobada: false, ficha_bloqueada: false })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function aprobarFicha(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_trabajadores").update({ ficha_aprobada: true, ficha_bloqueada: true, aprobada_por: user?.id }).eq("id", id)
    load()
  }

  async function desbloquearFicha(id: string) {
    await supabase.from("rrhh_trabajadores").update({ ficha_bloqueada: false }).eq("id", id)
    load()
  }

  async function guardarContrato() {
    if (!trabajadorSeleccionado) return
    await supabase.from("rrhh_contratos").insert({ ...contratoForm, trabajador_id: trabajadorSeleccionado })
    setShowContrato(false)
    setContratoForm({ tipo_contrato: "", fecha_inicio: "", fecha_fin: "", link_google_drive: "", notas: "" })
    cargarContratos(trabajadorSeleccionado)
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este trabajador?")) return
    await supabase.from("rrhh_trabajadores").update({ activo: false }).eq("id", id)
    load()
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general" || perfil?.perfil === "administrador" || perfil?.perfil === "controller"

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }
  const tabStyle = (active: boolean) => ({ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: active ? "#1D2040" : "#f3f4f6", color: active ? "#fff" : "#6b7280" })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Trabajadores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{trabajadores.length} trabajadores activos</p>
        </div>
        {esAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <ImportExport modulo="rrhh_trabajadores"
              campos={[
                {key:"nombre",label:"Nombre",requerido:true},{key:"apellido",label:"Apellido",requerido:true},
                {key:"dni",label:"DNI"},{key:"email",label:"Email"},{key:"telefono",label:"Telefono"},
                {key:"fecha_ingreso",label:"Fecha ingreso"},{key:"cargo",label:"Cargo"},{key:"area",label:"Area"},
                {key:"tipo",label:"Tipo"},{key:"sueldo_base",label:"Sueldo base"},
                {key:"banco",label:"Banco"},{key:"numero_cuenta",label:"N cuenta"},{key:"cci",label:"CCI"},
                {key:"sistema_pension",label:"Sistema pension"},
              ]}
              datos={trabajadores}
              onImportar={async (registros) => {
                let exitosos=0; const errores: string[]=[]
                for(const r of registros){
                  const {error}=await supabase.from("rrhh_trabajadores").insert({...r,activo:true,ficha_aprobada:false,ficha_bloqueada:false})
                  if(error)errores.push(r.nombre+": "+error.message); else exitosos++
                }
                load(); return{exitosos,errores}
              }} />
            <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo trabajador</button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {trabajadores.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay trabajadores registrados.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TRABAJADOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CARGO / ÁREA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                {esAdmin && <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SUELDO BASE</th>}
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FICHA</th>
                <th style={{ padding: "10px 20px", width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t, idx) => (
                <tr key={t.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {t.foto_url ? (
                        <img src={t.foto_url} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#04342C" }}>
                          {t.nombre[0]}{t.apellido[0]}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{t.nombre} {t.apellido}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.email || t.dni}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>
                    <div>{t.cargo || "—"}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.area || ""}</div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: t.tipo === "planilla" ? "#dbeafe" : t.tipo === "honorarios" ? "#fef3c7" : "#f0fdf4", color: t.tipo === "planilla" ? "#1e40af" : t.tipo === "honorarios" ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{t.tipo}</span>
                  </td>
                  {esAdmin && <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#111827" }}>S/ {Number(t.sueldo_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {t.ficha_aprobada ? (
                      <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>✓ Aprobada</span>
                    ) : (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Pendiente</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {esAdmin && (
                        <>
                          <button onClick={() => abrirEditar(t)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                          {!t.ficha_aprobada && <button onClick={() => aprobarFicha(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Aprobar</button>}
                          {t.ficha_aprobada && t.ficha_bloqueada && <button onClick={() => desbloquearFicha(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", color: "#1e40af", cursor: "pointer" }}>Desbloquear</button>}
                          <button onClick={() => { setTrabajadorSeleccionado(t.id); cargarContratos(t.id); setShowContrato(true) }} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>Contratos</button>
                          <button onClick={() => eliminar(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal trabajador */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar trabajador" : "Nuevo trabajador"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["info","laboral","banco"].map(t => <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>{t === "info" ? "Información" : t === "laboral" ? "Datos laborales" : "Datos bancarios"}</button>)}
            </div>

            {tab === "info" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Nombre *</label><input style={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                  <div><label style={lbl}>Apellido *</label><input style={inp} value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>DNI</label><input style={inp} value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                </div>
                <div><label style={lbl}>URL Foto</label><input style={inp} value={form.foto_url} placeholder="https://..." onChange={e => setForm({ ...form, foto_url: e.target.value })} /></div>
              </div>
            )}

            {tab === "laboral" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
                  <div><label style={lbl}>Área</label><select style={inp} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option value="">Seleccionar</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Tipo</label><select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>Modalidad contrato</label><input style={inp} value={form.modalidad_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setForm({ ...form, modalidad_contrato: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Fecha ingreso</label><input style={inp} type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
                  <div><label style={lbl}>Sistema pensión</label><select style={inp} value={form.sistema_pension} onChange={e => setForm({ ...form, sistema_pension: e.target.value })}>{PENSIONES.map(p => <option key={p}>{p}</option>)}</select></div>
                </div>
                {esAdmin && <div><label style={lbl}>Sueldo base</label><input style={inp} type="number" value={form.sueldo_base} onChange={e => setForm({ ...form, sueldo_base: parseFloat(e.target.value) || 0 })} /></div>}
              </div>
            )}

            {tab === "banco" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Banco</label><select style={inp} value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}><option value="">Sin banco</option>{BANCOS.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div><label style={lbl}>Tipo cuenta</label><select style={inp} value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}><option value="">Seleccionar</option>{TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>N° cuenta</label><input style={inp} value={form.numero_cuenta} onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} /></div>
                  <div><label style={lbl}>CCI</label><input style={inp} value={form.cci} onChange={e => setForm({ ...form, cci: e.target.value })} /></div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal contratos */}
      {showContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Contratos</h2>
              <button onClick={() => setShowContrato(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Tipo contrato</label><input style={inp} value={contratoForm.tipo_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setContratoForm({ ...contratoForm, tipo_contrato: e.target.value })} /></div>
                <div><label style={lbl}>Fecha inicio</label><input style={inp} type="date" value={contratoForm.fecha_inicio} onChange={e => setContratoForm({ ...contratoForm, fecha_inicio: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha fin</label><input style={inp} type="date" value={contratoForm.fecha_fin} onChange={e => setContratoForm({ ...contratoForm, fecha_fin: e.target.value })} /></div>
                <div><label style={lbl}>Link Google Drive</label><input style={inp} value={contratoForm.link_google_drive} placeholder="https://drive.google.com/..." onChange={e => setContratoForm({ ...contratoForm, link_google_drive: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Notas</label><input style={inp} value={contratoForm.notas} onChange={e => setContratoForm({ ...contratoForm, notas: e.target.value })} /></div>
              <button onClick={guardarContrato} className="btn-primary" style={{ fontSize: 13 }}>Agregar contrato</button>
            </div>
            {contratos.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>CONTRATOS REGISTRADOS</div>
                {contratos.map(c => (
                  <div key={c.id} style={{ background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.tipo_contrato || "Sin tipo"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{c.fecha_inicio} → {c.fecha_fin || "Indefinido"}</div>
                    {c.link_google_drive && <a href={c.link_google_drive} target="_blank" style={{ fontSize: 12, color: "#1e40af" }}>Ver contrato →</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}