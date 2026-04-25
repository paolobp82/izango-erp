"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

export default function UbicacionesPage() {
  const supabase = createClient()
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: "", tipo: "almacen", direccion: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("inventario_ubicaciones").select("*").order("nombre")
    setUbicaciones(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: "", tipo: "almacen", direccion: "" })
    setShowForm(true)
  }

  function abrirEditar(ub: any) {
    setEditando(ub)
    setForm({ nombre: ub.nombre, tipo: ub.tipo, direccion: ub.direccion || "" })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre) { alert("Nombre es obligatorio"); return }
    setSaving(true)
    if (editando) {
      await supabase.from("inventario_ubicaciones").update(form).eq("id", editando.id)
    } else {
      await supabase.from("inventario_ubicaciones").insert({ ...form, activo: true })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from("inventario_ubicaciones").update({ activo: !activo }).eq("id", id)
    load()
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Ubicaciones</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Almacenes y puntos logísticos</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/inventario" className="btn-secondary" style={{ fontSize: 13, textDecoration: "none", padding: "7px 14px", borderRadius: 7 }}>← Inventario</a>
          <ImportExport
            modulo="inventario_ubicaciones"
            campos={[
              {key:"nombre",label:"Nombre",requerido:true},
              {key:"tipo",label:"Tipo"},
              {key:"direccion",label:"Direccion"},
            ]}
            datos={ubicaciones}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[];
              for(const r of registros){
                const {error}=await supabase.from("inventario_ubicaciones").insert({...r,activo:true});
                if(error)errores.push(r.nombre+": "+error.message); else exitosos++;
              }
              load(); return{exitosos,errores};
            }}
          />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva ubicación</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {ubicaciones.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay ubicaciones.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>NOMBRE</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DIRECCIÓN</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {ubicaciones.map((ub, idx) => (
                <tr key={ub.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px", fontWeight: 600, fontSize: 14, color: "#111827" }}>{ub.nombre}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: ub.tipo === "almacen" ? "#dbeafe" : "#fef3c7", color: ub.tipo === "almacen" ? "#1e40af" : "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {ub.tipo === "almacen" ? "🏭 Almacén" : "📍 Punto logístico"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{ub.direccion || "—"}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span style={{ background: ub.activo ? "#d1fae5" : "#fee2e2", color: ub.activo ? "#065f46" : "#dc2626", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {ub.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => abrirEditar(ub)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                      <button onClick={() => toggleActivo(ub.id, ub.activo)} style={{ fontSize: 12, padding: "4px 10px", border: `1px solid ${ub.activo ? "#fee2e2" : "#d1fae5"}`, borderRadius: 6, background: "#fff", color: ub.activo ? "#dc2626" : "#065f46", cursor: "pointer" }}>
                        {ub.activo ? "Desactivar" : "Activar"}
                      </button>
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
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar ubicación" : "Nueva ubicación"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={form.nombre} placeholder="Ej: Chorrillos, Oficina, Lima Norte" onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Tipo</label>
                <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="almacen">Almacén</option>
                  <option value="punto_logistico">Punto logístico</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Dirección</label>
                <input style={inp} value={form.direccion} placeholder="Dirección física" onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
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