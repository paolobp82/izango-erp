"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

const BANCOS = ["BCP","BBVA","Interbank","Scotiabank","BanBif","Pichincha","Banco de la Nacion","Otro"]
const TIPOS_CUENTA = ["Ahorros","Corriente"]
const PENSIONES = ["AFP_Integra","AFP_Prima","AFP_Habitat","AFP_Profuturo","ONP"]
const TIPOS = ["planilla","honorarios","proyecto"]
const AREAS = ["Produccion","Comercial","Administracion","Finanzas","Logistica","Gerencia","Growth"]

export default function TrabajadoresPage() {
  const supabase = createClient()
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [userId, setUserId] = useState<string>("")
  const [tab, setTab] = useState("info")
  const [contratos, setContratos] = useState<any[]>([])
  const [showContrato, setShowContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({ tipo_contrato: "", fecha_inicio: "", fecha_fin: "", link_google_drive: "", notas: "" })
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any>(null)
  const [historial, setHistorial] = useState<any>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", email: "", telefono: "",
    fecha_ingreso: "", cargo: "", area: "", tipo: "planilla",
    modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "",
    cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: "",
    direccion: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "",
    contacto_emergencia_relacion: "", cv_url: ""
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const esAdminTotal = ["superadmin","gerente_general","controller","administrador"].includes(p?.perfil)

    if (esAdminTotal) {
      // Admins ven todos
      const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", true).order("apellido")
      setTrabajadores(data || [])
    } else {
      // El resto solo ve su propia ficha
      const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", true).eq("user_id", user.id)
      setTrabajadores(data || [])
    }
    setLoading(false)
  }

  async function cargarContratos(trabajadorId: string) {
    const { data } = await supabase.from("rrhh_contratos").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false })
    setContratos(data || [])
  }

  async function cargarHistorial(trabajadorId: string) {
    setLoadingHistorial(true)
    const [vacaciones, horas, permisos, faltas] = await Promise.all([
      supabase.from("rrhh_vacaciones").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_horas_extras").select("*").eq("trabajador_id", trabajadorId).order("fecha", { ascending: false }),
      supabase.from("rrhh_permisos").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_faltas_medicas").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }),
    ])
    setHistorial({
      vacaciones: vacaciones.data || [],
      horas_extras: horas.data || [],
      permisos: permisos.data || [],
      faltas_medicas: faltas.data || [],
    })
    setLoadingHistorial(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setTab("info")
    setHistorial(null)
    setForm({ nombre: "", apellido: "", dni: "", email: "", telefono: "", fecha_ingreso: "", cargo: "", area: "", tipo: "planilla", modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "", cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: "", direccion: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "", contacto_emergencia_relacion: "", cv_url: "" })
    setShowForm(true)
  }

  function abrirEditar(t: any) {
    setEditando(t)
    setTab("info")
    setHistorial(null)
    setForm({
      nombre: t.nombre, apellido: t.apellido, dni: t.dni || "", email: t.email || "",
      telefono: t.telefono || "", fecha_ingreso: t.fecha_ingreso || "", cargo: t.cargo || "",
      area: t.area || "", tipo: t.tipo || "planilla", modalidad_contrato: t.modalidad_contrato || "",
      banco: t.banco || "", tipo_cuenta: t.tipo_cuenta || "", numero_cuenta: t.numero_cuenta || "",
      cci: t.cci || "", sistema_pension: t.sistema_pension || "AFP_Integra",
      sueldo_base: t.sueldo_base || 0, foto_url: t.foto_url || "",
      direccion: t.direccion || "", contacto_emergencia_nombre: t.contacto_emergencia_nombre || "",
      contacto_emergencia_telefono: t.contacto_emergencia_telefono || "",
      contacto_emergencia_relacion: t.contacto_emergencia_relacion || "",
      cv_url: t.cv_url || ""
    })
    cargarContratos(t.id)
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre || !form.apellido) { alert("Nombre y apellido son obligatorios"); return }
    setSaving(true)
    const payload = {
      ...form,
      tipo: form.tipo || "planilla",
      sueldo_base: parseFloat(form.sueldo_base.toString()) || 0,
      updated_at: new Date().toISOString()
    }
    if (editando) {
      await supabase.from("rrhh_trabajadores").update(payload).eq("id", editando.id)
    } else {
      const { error: insertError } = await supabase.from("rrhh_trabajadores").insert({
  ...payload,
  activo: true,
  ficha_aprobada: false,
  ficha_bloqueada: false,
  user_id: userId
})
if (insertError) { alert("Error al guardar: " + insertError.message); setSaving(false); return }
})
if (insertError) { alert("Error: " + insertError.message); setSaving(false); return }
        ...payload,
        activo: true,
        ficha_aprobada: false,
        ficha_bloqueada: false,
        user_id: userId
      })
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
    if (!confirm("Desactivar este trabajador?")) return
    await supabase.from("rrhh_trabajadores").update({ activo: false }).eq("id", id)
    load()
  }

  const esAdminTotal = ["superadmin","gerente_general","controller","administrador"].includes(perfil?.perfil)
  const esAdminRRHH = ["superadmin","gerente_general","administrador","controller"].includes(perfil?.perfil)
  const puedeVerSueldo = ["superadmin","gerente_general","administrador","controller"].includes(perfil?.perfil)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }
  const tabStyle = (active: boolean) => ({ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: active ? "#1D2040" : "#f3f4f6", color: active ? "#fff" : "#6b7280" })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Trabajadores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {esAdminTotal ? `${trabajadores.length} trabajadores activos` : "Mi ficha de trabajador"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {esAdminTotal && (
            <ImportExport modulo="rrhh_trabajadores"
              campos={[{key:"nombre",label:"Nombre",requerido:true},{key:"apellido",label:"Apellido",requerido:true},{key:"dni",label:"DNI"},{key:"email",label:"Email"},{key:"telefono",label:"Telefono"},{key:"fecha_ingreso",label:"Fecha ingreso"},{key:"cargo",label:"Cargo"},{key:"area",label:"Area"},{key:"tipo",label:"Tipo"},{key:"sueldo_base",label:"Sueldo base"},{key:"banco",label:"Banco"},{key:"numero_cuenta",label:"N cuenta"},{key:"cci",label:"CCI"},{key:"sistema_pension",label:"Sistema pension"}]}
              datos={trabajadores}
              onImportar={async (registros) => {
                let exitosos=0; const errores: string[]=[]
                for(const r of registros){
                  const {error}=await supabase.from("rrhh_trabajadores").insert({...r,activo:true,tipo:r.tipo||"planilla",ficha_aprobada:false,ficha_bloqueada:false})
                  if(error)errores.push(r.nombre+": "+error.message); else exitosos++
                }
                load(); return{exitosos,errores}
              }} />
          )}
          {/* Solo puede crear si no tiene ficha propia */}
          {!esAdminTotal && trabajadores.length === 0 && (
            <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Crear mi ficha</button>
          )}
          {esAdminTotal && (
            <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo trabajador</button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {trabajadores.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              {esAdminTotal ? "No hay trabajadores registrados." : "Aun no tienes una ficha de trabajador."}
            </div>
            {!esAdminTotal && (
              <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Crear mi ficha</button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TRABAJADOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CARGO / AREA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                {puedeVerSueldo && <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SUELDO BASE</th>}
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FICHA</th>
                <th style={{ padding: "10px 20px", width: 200 }}></th>
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
                    <span style={{ background: t.tipo === "planilla" ? "#dbeafe" : t.tipo === "honorarios" ? "#fef3c7" : "#f0fdf4", color: t.tipo === "planilla" ? "#1e40af" : t.tipo === "honorarios" ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{t.tipo || "planilla"}</span>
                  </td>
                  {puedeVerSueldo && <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#111827" }}>S/ {Number(t.sueldo_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {t.ficha_aprobada ? (
                      <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Aprobada</span>
                    ) : (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Pendiente</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button onClick={() => abrirEditar(t)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                      <button onClick={() => { setTrabajadorSeleccionado(t.id); cargarHistorial(t.id); setShowContrato(true); cargarContratos(t.id) }} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>Historial</button>
                      {esAdminRRHH && (
                        <>
                          {!t.ficha_aprobada && <button onClick={() => aprobarFicha(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Aprobar</button>}
                          {t.ficha_aprobada && t.ficha_bloqueada && <button onClick={() => desbloquearFicha(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", color: "#1e40af", cursor: "pointer" }}>Desbloquear</button>}
                          <button onClick={() => eliminar(t.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>x</button>
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

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar ficha" : "Nueva ficha de trabajador"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["info","contacto","laboral","banco","docs"].map(t => (
                <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                  {t === "info" ? "Informacion" : t === "contacto" ? "Contacto" : t === "laboral" ? "Laboral" : t === "banco" ? "Banco" : "Docs"}
                </button>
              ))}
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
                  <div><label style={lbl}>Telefono</label><input style={inp} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                </div>
                <div><label style={lbl}>Direccion actual</label><input style={inp} value={form.direccion} placeholder="Av. / Calle, distrito, ciudad" onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                <div><label style={lbl}>URL Foto</label><input style={inp} value={form.foto_url} placeholder="https://..." onChange={e => setForm({ ...form, foto_url: e.target.value })} /></div>
              </div>
            )}

            {tab === "contacto" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>Contacto de emergencia</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Nombre</label><input style={inp} value={form.contacto_emergencia_nombre} placeholder="Nombre completo" onChange={e => setForm({ ...form, contacto_emergencia_nombre: e.target.value })} /></div>
                  <div><label style={lbl}>Telefono</label><input style={inp} value={form.contacto_emergencia_telefono} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, contacto_emergencia_telefono: e.target.value })} /></div>
                  <div><label style={lbl}>Relacion</label><input style={inp} value={form.contacto_emergencia_relacion} placeholder="Padre, madre, esposo/a..." onChange={e => setForm({ ...form, contacto_emergencia_relacion: e.target.value })} /></div>
                </div>
              </div>
            )}

            {tab === "laboral" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
                  <div><label style={lbl}>Area</label><select style={inp} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option value="">Seleccionar</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Tipo</label><select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>Modalidad contrato</label><input style={inp} value={form.modalidad_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setForm({ ...form, modalidad_contrato: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Fecha ingreso</label><input style={inp} type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
                  <div><label style={lbl}>Sistema pension</label><select style={inp} value={form.sistema_pension} onChange={e => setForm({ ...form, sistema_pension: e.target.value })}>{PENSIONES.map(p => <option key={p}>{p}</option>)}</select></div>
                </div>
                {puedeVerSueldo && <div><label style={lbl}>Sueldo base</label><input style={inp} type="number" value={form.sueldo_base} onChange={e => setForm({ ...form, sueldo_base: parseFloat(e.target.value) || 0 })} /></div>}
              </div>
            )}

            {tab === "banco" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Banco</label><select style={inp} value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}><option value="">Sin banco</option>{BANCOS.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div><label style={lbl}>Tipo cuenta</label><select style={inp} value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}><option value="">Seleccionar</option>{TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>N cuenta</label><input style={inp} value={form.numero_cuenta} onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} /></div>
                  <div><label style={lbl}>CCI</label><input style={inp} value={form.cci} onChange={e => setForm({ ...form, cci: e.target.value })} /></div>
                </div>
              </div>
            )}

            {tab === "docs" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>Documentos</div>
                <div>
                  <label style={lbl}>Link CV (Google Drive)</label>
                  <input style={inp} value={form.cv_url} placeholder="https://drive.google.com/..." onChange={e => setForm({ ...form, cv_url: e.target.value })} />
                  {form.cv_url && <a href={form.cv_url} target="_blank" style={{ fontSize: 12, color: "#1e40af", display: "inline-block", marginTop: 4 }}>Ver CV →</a>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", paddingBottom: 8, borderBottom: "1px solid #f3f4f6", marginTop: 8 }}>Contratos</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={lbl}>Tipo contrato</label><input style={inp} value={contratoForm.tipo_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setContratoForm({ ...contratoForm, tipo_contrato: e.target.value })} /></div>
                    <div><label style={lbl}>Fecha inicio</label><input style={inp} type="date" value={contratoForm.fecha_inicio} onChange={e => setContratoForm({ ...contratoForm, fecha_inicio: e.target.value })} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={lbl}>Fecha fin</label><input style={inp} type="date" value={contratoForm.fecha_fin} onChange={e => setContratoForm({ ...contratoForm, fecha_fin: e.target.value })} /></div>
                    <div><label style={lbl}>Link Google Drive</label><input style={inp} value={contratoForm.link_google_drive} placeholder="https://drive.google.com/..." onChange={e => setContratoForm({ ...contratoForm, link_google_drive: e.target.value })} /></div>
                  </div>
                  <div><label style={lbl}>Notas</label><input style={inp} value={contratoForm.notas} onChange={e => setContratoForm({ ...contratoForm, notas: e.target.value })} /></div>
                  {editando && <button onClick={() => { setTrabajadorSeleccionado(editando.id); guardarContrato() }} style={{ fontSize: 12, padding: "6px 14px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, alignSelf: "start" }}>Agregar contrato</button>}
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
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {showContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Historial del trabajador</h2>
              <button onClick={() => setShowContrato(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            {loadingHistorial ? (
              <div style={{ color: "#6b7280", padding: 20 }}>Cargando historial...</div>
            ) : historial && (
              <div style={{ display: "grid", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Vacaciones</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total dias: {historial.vacaciones.reduce((s: number, v: any) => s + (v.dias || 0), 0)}</span>
                  </div>
                  {historial.vacaciones.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "#f9fafb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Inicio</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Fin</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", color: "#6b7280" }}>Dias</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.vacaciones.map((v: any) => (
                        <tr key={v.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px" }}>{v.fecha_inicio}</td>
                          <td style={{ padding: "6px 8px" }}>{v.fecha_fin}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{v.dias}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: v.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: v.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{v.estado}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Horas extras</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total: {historial.horas_extras.reduce((s: number, h: any) => s + (h.horas || 0), 0)}h</span>
                  </div>
                  {historial.horas_extras.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "#f9fafb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Fecha</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", color: "#6b7280" }}>Horas</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280" }}>Monto</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.horas_extras.map((h: any) => (
                        <tr key={h.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px" }}>{h.fecha}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{h.horas}h</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>S/ {Number(h.monto_calculado || 0).toFixed(2)}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: h.aprobado ? "#dcfce7" : "#fef9c3", color: h.aprobado ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{h.aprobado ? "aprobado" : "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Permisos</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total: {historial.permisos.length}</span>
                  </div>
                  {historial.permisos.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "#f9fafb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Fecha</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Tipo</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Motivo</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.permisos.map((p: any) => (
                        <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px" }}>{p.fecha_inicio || p.fecha}</td>
                          <td style={{ padding: "6px 8px" }}>{p.tipo_permiso || p.tipo || "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#6b7280" }}>{p.motivo || "—"}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: p.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: p.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{p.estado || "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Faltas medicas</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total: {historial.faltas_medicas.length}</span>
                  </div>
                  {historial.faltas_medicas.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "#f9fafb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Inicio</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Fin</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Diagnostico</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.faltas_medicas.map((f: any) => (
                        <tr key={f.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px" }}>{f.fecha_inicio}</td>
                          <td style={{ padding: "6px 8px" }}>{f.fecha_fin || "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#6b7280" }}>{f.diagnostico || f.motivo || "—"}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: f.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: f.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{f.estado || "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}