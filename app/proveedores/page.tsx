"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { registrarAccion } from "@/lib/trazabilidad"

const CATEGORIAS = ["produccion", "almacenaje", "impresion", "permisos", "instalacion", "performer", "alquiler", "supervision", "movilidad", "otros"]
const TIPOS_PAGO = ["contado", "credito_30", "credito_60", "credito_90"]
const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const TIPOS_CUENTA = ["Ahorros", "Corriente"]
const TIPOS_TRANSFERENCIA = ["Transferencia bancaria", "Yape", "Plin", "Efectivo", "Cheque"]

async function consultarRUC(ruc) {
  try {
    const res = await fetch(`/api/ruc?numero=${ruc}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    return { razonSocial: data.nombre, direccion: data.direccion };
  } catch { return null; }
}

export default function ProveedoresPage() {
  const supabase = createClient()
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [esCliente, setEsCliente] = useState(false)
  const [buscandoRUC, setBuscandoRUC] = useState(false)
  const [rucEstado, setRucEstado] = useState(null)
  const [contactosAdicionales, setContactosAdicionales] = useState<any[]>([])
  const [form, setForm] = useState({
    nombre: "", ruc: "", categoria: "produccion", tipo_pago: "contado",
    nombre_contacto: "", email_contacto: "", telefono_contacto: "",
    nombre_contacto_admin: "", email_contacto_admin: "", telefono_contacto_admin: "",
    banco: "", tipo_cuenta: "", numero_cuenta: "", cuenta_interbancaria: "",
    banco_2: "", tipo_cuenta_2: "", numero_cuenta_2: "", cci_2: "",
    cuenta_detraccion: "", tipo_pago_transferencia: "Transferencia bancaria",
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("proveedores").select("*").order("nombre")
    setProveedores(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setEsCliente(false)
    setContactosAdicionales([])
    setForm({ nombre: "", ruc: "", categoria: "produccion", tipo_pago: "contado", nombre_contacto: "", email_contacto: "", telefono_contacto: "", nombre_contacto_admin: "", email_contacto_admin: "", telefono_contacto_admin: "", banco: "", tipo_cuenta: "", numero_cuenta: "", cuenta_interbancaria: "", banco_2: "", tipo_cuenta_2: "", numero_cuenta_2: "", cci_2: "", cuenta_detraccion: "", tipo_pago_transferencia: "Transferencia bancaria" })
    setShowForm(true)
  }

  function abrirEditar(prov: any) {
    setEditando(prov)
    setEsCliente(prov.es_cliente || false)
    setContactosAdicionales(prov.contactos_adicionales ? JSON.parse(prov.contactos_adicionales) : [])
    setForm({
      nombre: prov.nombre || "", ruc: prov.ruc || "", categoria: prov.categoria || "produccion",
      tipo_pago: prov.tipo_pago || "contado",
      nombre_contacto: prov.nombre_contacto || "", email_contacto: prov.email_contacto || "",
      telefono_contacto: prov.telefono_contacto || "", nombre_contacto_admin: prov.nombre_contacto_admin || "",
      email_contacto_admin: prov.email_contacto_admin || "", telefono_contacto_admin: prov.telefono_contacto_admin || "",
      banco: prov.banco || "", tipo_cuenta: prov.tipo_cuenta || "",
      numero_cuenta: prov.numero_cuenta || "", cuenta_interbancaria: prov.cuenta_interbancaria || "",
      banco_2: prov.banco_2 || "", tipo_cuenta_2: prov.tipo_cuenta_2 || "",
      numero_cuenta_2: prov.numero_cuenta_2 || "", cci_2: prov.cci_2 || "",
      cuenta_detraccion: prov.cuenta_detraccion || "",
      tipo_pago_transferencia: prov.tipo_pago_transferencia || "Transferencia bancaria",
    })
    setShowForm(true)
  }

  function agregarContacto() {
    setContactosAdicionales(prev => [...prev, { nombre: "", email: "", telefono: "", cargo: "" }])
  }

  function updateContacto(idx: number, field: string, value: string) {
    setContactosAdicionales(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function removeContacto(idx: number) {
    setContactosAdicionales(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!form.nombre) { alert("El nombre es obligatorio"); return }
    setSaving(true)
    const payload = { ...form, entidad: "peru", es_cliente: esCliente, contactos_adicionales: JSON.stringify(contactosAdicionales) }
    if (editando) {
      await supabase.from("proveedores").update(payload).eq("id", editando.id)
    } else {
      const { data: prov } = await supabase.from("proveedores").insert(payload).select().single()
      if (esCliente && prov) {
        await supabase.from("clientes").insert({
          razon_social: form.nombre, ruc: form.ruc || null, entidad: "peru",
          nombre_contacto: form.nombre_contacto || null, email_contacto: form.email_contacto || null,
          telefono_contacto: form.telefono_contacto || null,
          nombre_contacto_admin: form.nombre_contacto_admin || null,
          email_contacto_admin: form.email_contacto_admin || null,
          telefono_contacto_admin: form.telefono_contacto_admin || null,
          banco_1: form.banco || null, tipo_cuenta_1: form.tipo_cuenta || null,
          numero_cuenta_1: form.numero_cuenta || null, cci_1: form.cuenta_interbancaria || null,
          banco_2: form.banco_2 || null, tipo_cuenta_2: form.tipo_cuenta_2 || null,
          numero_cuenta_2: form.numero_cuenta_2 || null, cci_2: form.cci_2 || null,
          cuenta_detraccion: form.cuenta_detraccion || null,
          tipo_pago_transferencia: form.tipo_pago_transferencia || null,
          es_proveedor: true, contactos_adicionales: JSON.stringify(contactosAdicionales),
        })
      }
    }
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "proveedores", entidad_tipo: "proveedor", descripcion: (editando ? "Proveedor editado: " : "Proveedor creado: ") + form.nombre })
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("Eliminar proveedor " + nombre + "?")) return
    await supabase.from("proveedores").delete().eq("id", id)
    load()
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }
  const section: any = { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 14, marginTop: 0, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Proveedores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{proveedores.length} proveedores registrados</p>
        </div>
        <ImportExport modulo="proveedores" campos={[{key:"nombre",label:"Nombre",requerido:true},{key:"ruc",label:"RUC"},{key:"categoria",label:"Categoria"},{key:"banco",label:"Banco"},{key:"numero_cuenta",label:"N cuenta"},{key:"cuenta_interbancaria",label:"CCI"},{key:"tipo_pago",label:"Tipo pago"},{key:"nombre_contacto",label:"Nombre contacto"},{key:"email_contacto",label:"Email contacto"},{key:"telefono_contacto",label:"Telefono"}]} datos={proveedores} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const{error}=await supabase.from("proveedores").insert({...r,entidad:"peru",tipo_pago:r.tipo_pago||"contado",categoria:r.categoria||"otros"}); if(error)errores.push(r.nombre+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo proveedor</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <h3 style={section}>Datos generales</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>NOMBRE *</label>
                    <input style={inp} value={form.nombre} placeholder="Nombre del proveedor" onChange={e => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>RUC</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...inp, paddingRight: 36 }} value={form.ruc} placeholder="20xxxxxxxxx"
                        onChange={async e => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                          setForm(prev => ({ ...prev, ruc: val }));
                          setRucEstado(null);
                          if (val.length === 11) {
                            setBuscandoRUC(true);
                            const data = await consultarRUC(val);
                            setBuscandoRUC(false);
                            if (data && data.razonSocial) {
                              setForm(prev => ({ ...prev, ruc: val, nombre: data.razonSocial }));
                              setRucEstado("ok");
                            } else { setRucEstado("error"); }
                          }
                        }} />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                        {buscandoRUC ? "⏳" : rucEstado === "ok" ? "✅" : rucEstado === "error" ? "❌" : ""}
                      </span>
                    </div>
                    {rucEstado === "ok" && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>RUC valido - nombre autocompleto</div>}
                    {rucEstado === "error" && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>RUC no encontrado</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>CATEGORIA</label>
                    <select style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>TIPO DE PAGO</label>
                    <select style={inp} value={form.tipo_pago} onChange={e => setForm({ ...form, tipo_pago: e.target.value })}>
                      {TIPOS_PAGO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={esCliente} onChange={e => setEsCliente(e.target.checked)} style={{ width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tambien es cliente</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>(se copiara a la base de clientes)</span>
                </label>
              </div>

              <div>
                <h3 style={section}>Contacto comercial</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>NOMBRE</label><input style={inp} value={form.nombre_contacto} placeholder="Nombre completo" onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} /></div>
                  <div><label style={lbl}>EMAIL</label><input style={inp} value={form.email_contacto} placeholder="correo@empresa.com" onChange={e => setForm({ ...form, email_contacto: e.target.value })} /></div>
                  <div><label style={lbl}>TELEFONO</label><input style={inp} value={form.telefono_contacto} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} /></div>
                </div>
              </div>

              <div>
                <h3 style={section}>Contacto administracion / pagos</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>NOMBRE</label><input style={inp} value={form.nombre_contacto_admin} placeholder="Nombre completo" onChange={e => setForm({ ...form, nombre_contacto_admin: e.target.value })} /></div>
                  <div><label style={lbl}>EMAIL</label><input style={inp} value={form.email_contacto_admin} placeholder="admin@empresa.com" onChange={e => setForm({ ...form, email_contacto_admin: e.target.value })} /></div>
                  <div><label style={lbl}>TELEFONO</label><input style={inp} value={form.telefono_contacto_admin} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, telefono_contacto_admin: e.target.value })} /></div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Contactos adicionales</h3>
                  <button onClick={agregarContacto} style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>+ Agregar</button>
                </div>
                {contactosAdicionales.map((c, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div><label style={lbl}>NOMBRE</label><input style={inp} value={c.nombre} placeholder="Nombre" onChange={e => updateContacto(i, "nombre", e.target.value)} /></div>
                    <div><label style={lbl}>CARGO</label><input style={inp} value={c.cargo} placeholder="Cargo" onChange={e => updateContacto(i, "cargo", e.target.value)} /></div>
                    <div><label style={lbl}>EMAIL</label><input style={inp} value={c.email} placeholder="Email" onChange={e => updateContacto(i, "email", e.target.value)} /></div>
                    <div><label style={lbl}>TELEFONO</label><input style={inp} value={c.telefono} placeholder="Telefono" onChange={e => updateContacto(i, "telefono", e.target.value)} /></div>
                    <button onClick={() => removeContacto(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 4 }}>×</button>
                  </div>
                ))}
              </div>

              <div>
                <h3 style={section}>Cuenta bancaria 1</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>BANCO</label><select style={inp} value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}><option value="">Sin banco</option>{BANCOS.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div><label style={lbl}>TIPO CUENTA</label><select style={inp} value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}><option value="">Seleccionar</option>{TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>N CUENTA</label><input style={inp} value={form.numero_cuenta} placeholder="Numero" onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} /></div>
                  <div><label style={lbl}>CCI</label><input style={inp} value={form.cuenta_interbancaria} placeholder="CCI" onChange={e => setForm({ ...form, cuenta_interbancaria: e.target.value })} /></div>
                </div>
              </div>

              <div>
                <h3 style={section}>Cuenta bancaria 2 (opcional)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>BANCO</label><select style={inp} value={form.banco_2} onChange={e => setForm({ ...form, banco_2: e.target.value })}><option value="">Sin banco</option>{BANCOS.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div><label style={lbl}>TIPO CUENTA</label><select style={inp} value={form.tipo_cuenta_2} onChange={e => setForm({ ...form, tipo_cuenta_2: e.target.value })}><option value="">Seleccionar</option>{TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>N CUENTA</label><input style={inp} value={form.numero_cuenta_2} placeholder="Numero" onChange={e => setForm({ ...form, numero_cuenta_2: e.target.value })} /></div>
                  <div><label style={lbl}>CCI</label><input style={inp} value={form.cci_2} placeholder="CCI" onChange={e => setForm({ ...form, cci_2: e.target.value })} /></div>
                </div>
              </div>

              <div>
                <h3 style={section}>Detraccion y tipo transferencia</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>CUENTA DETRACCION (Banco de la Nacion)</label><input style={inp} value={form.cuenta_detraccion} placeholder="N cuenta detraccion" onChange={e => setForm({ ...form, cuenta_detraccion: e.target.value })} /></div>
                  <div><label style={lbl}>TIPO TRANSFERENCIA</label><select style={inp} value={form.tipo_pago_transferencia} onChange={e => setForm({ ...form, tipo_pago_transferencia: e.target.value })}>{TIPOS_TRANSFERENCIA.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear proveedor"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {proveedores.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay proveedores. Crea el primero.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RUC</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CATEGORIA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>BANCO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONTACTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO PAGO</th>
                <th style={{ padding: "10px 20px", width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.nombre}</div>
                    {p.es_cliente && <span style={{ fontSize: 10, color: "#1e40af", background: "#dbeafe", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>Tb. cliente</span>}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#6b7280" }}>{p.ruc || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{p.categoria || "—"}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.banco || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{p.nombre_contacto || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{p.tipo_pago || "—"}</td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => abrirEditar(p)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                      <button onClick={() => eliminar(p.id, p.nombre)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )

}