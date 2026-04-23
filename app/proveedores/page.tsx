"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const CATEGORIAS = ["produccion", "almacenaje", "impresion", "permisos", "instalacion", "performer", "alquiler", "supervision", "movilidad", "otros"]
const TIPOS_PAGO = ["contado", "credito_30", "credito_60", "credito_90"]
const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Otro"]

export default function ProveedoresPage() {
  const supabase = createClient()
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: "", ruc: "", categoria: "Producción", banco: "", numero_cuenta: "", cuenta_interbancaria: "", tipo_pago: "contado" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("proveedores").select("*").order("nombre")
    setProveedores(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: "", ruc: "", categoria: "Producción", banco: "", numero_cuenta: "", cuenta_interbancaria: "", tipo_pago: "contado" })
    setShowForm(true)
  }

  function abrirEditar(prov: any) {
    setEditando(prov)
    setForm({ nombre: prov.nombre || "", ruc: prov.ruc || "", categoria: prov.categoria || "Producción", banco: prov.banco || "", numero_cuenta: prov.numero_cuenta || "", cuenta_interbancaria: prov.cuenta_interbancaria || "", tipo_pago: prov.tipo_pago || "contado" })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre) { alert("El nombre es obligatorio"); return }
    setSaving(true)
    if (editando) { await supabase.from("proveedores").update({ ...form, entidad: "peru" }).eq("id", editando.id) }
    else { await supabase.from("proveedores").insert({ ...form, entidad: "peru" }) }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("¿Eliminar proveedor " + nombre + "?")) return
    await supabase.from("proveedores").delete().eq("id", id)
    load()
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Proveedores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{proveedores.length} proveedores registrados</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo proveedor</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "#111827" }}>{editando ? "Editar proveedor" : "Nuevo proveedor"}</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>NOMBRE *</label>
                  <input style={inp} value={form.nombre} placeholder="Nombre del proveedor" onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>RUC</label>
                  <input style={inp} value={form.ruc} placeholder="20xxxxxxxxx" onChange={e => setForm({ ...form, ruc: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>CATEGORÍA</label>
                  <select style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>TIPO DE PAGO</label>
                  <select style={inp} value={form.tipo_pago} onChange={e => setForm({ ...form, tipo_pago: e.target.value })}>
                    {TIPOS_PAGO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>BANCO</label>
                <select style={inp} value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}>
                  <option value="">Sin banco</option>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>N° CUENTA</label>
                  <input style={inp} value={form.numero_cuenta} placeholder="Número de cuenta" onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>CCI</label>
                  <input style={inp} value={form.cuenta_interbancaria} placeholder="Cuenta interbancaria" onChange={e => setForm({ ...form, cuenta_interbancaria: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
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
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CATEGORÍA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>BANCO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO PAGO</th>
                <th style={{ padding: "10px 20px", width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px", fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.nombre}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#6b7280" }}>{p.ruc || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{p.categoria || "—"}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.banco || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{p.tipo_pago || "—"}</td>
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



