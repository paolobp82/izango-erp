"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const TIPOS_CUENTA = ["Ahorros", "Corriente"]
const TIPOS_TRANSFERENCIA = ["Transferencia bancaria", "Yape", "Plin", "Efectivo", "Cheque"]

export default function NuevoClientePage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [esProveedor, setEsProveedor] = useState(false)
  const [contactosAdicionales, setContactosAdicionales] = useState<any[]>([])
  const [form, setForm] = useState({
    razon_social: "", ruc: "", direccion: "",
    nombre_contacto: "", email_contacto: "", telefono_contacto: "",
    nombre_contacto_admin: "", email_contacto_admin: "", telefono_contacto_admin: "",
    banco_1: "", tipo_cuenta_1: "", numero_cuenta_1: "", cci_1: "",
    banco_2: "", tipo_cuenta_2: "", numero_cuenta_2: "", cci_2: "",
    cuenta_detraccion: "", tipo_pago_transferencia: "Transferencia bancaria",
  })

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
    if (!form.razon_social) { alert("Razon social es obligatoria"); return }
    setSaving(true)

    const payload: any = {
      ...form,
      entidad: "peru",
      es_proveedor: esProveedor,
      contactos_adicionales: JSON.stringify(contactosAdicionales),
    }

    const { data: cliente, error } = await supabase.from("clientes").insert(payload).select().single()
    if (error) { alert("Error: " + error.message); setSaving(false); return }

    if (esProveedor && cliente) {
      await supabase.from("proveedores").insert({
        nombre: form.razon_social,
        ruc: form.ruc || null,
        entidad: "peru",
        banco: form.banco_1 || null,
        tipo_cuenta: form.tipo_cuenta_1 || null,
        numero_cuenta: form.numero_cuenta_1 || null,
        cuenta_interbancaria: form.cci_1 || null,
        banco_2: form.banco_2 || null,
        tipo_cuenta_2: form.tipo_cuenta_2 || null,
        numero_cuenta_2: form.numero_cuenta_2 || null,
        cci_2: form.cci_2 || null,
        cuenta_detraccion: form.cuenta_detraccion || null,
        tipo_pago_transferencia: form.tipo_pago_transferencia || null,
        nombre_contacto: form.nombre_contacto || null,
        email_contacto: form.email_contacto || null,
        telefono_contacto: form.telefono_contacto || null,
        nombre_contacto_admin: form.nombre_contacto_admin || null,
        email_contacto_admin: form.email_contacto_admin || null,
        telefono_contacto_admin: form.telefono_contacto_admin || null,
        es_cliente: true,
        tipo_pago: "contado",
        categoria: "otros",
        contactos_adicionales: JSON.stringify(contactosAdicionales),
      })
    }

    setSaving(false)
    await registrarAccion({ accion: "crear", modulo: "clientes", entidad_id: cliente?.id, entidad_tipo: "cliente", descripcion: "Cliente creado: " + form.razon_social })
    router.push("/clientes")
  }

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }
  const section: any = { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <a href="/clientes" style={{ color: "#9ca3af", fontSize: 12 }}>Clientes</a>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Nuevo cliente</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Nuevo cliente</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={section}>Datos de la empresa</h2>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Razon social *</label>
              <input style={inp} value={form.razon_social} placeholder="Razon social"
                onChange={e => setForm({ ...form, razon_social: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>RUC</label>
              <input style={inp} value={form.ruc} placeholder="20xxxxxxxxx"
                onChange={e => setForm({ ...form, ruc: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={lbl}>Direccion</label>
            <input style={inp} value={form.direccion} placeholder="Direccion de la empresa"
              onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={esProveedor} onChange={e => setEsProveedor(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tambien es proveedor</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>(se copiara automaticamente a la base de proveedores)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={section}>Contacto comercial</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Nombre</label>
            <input style={inp} value={form.nombre_contacto} placeholder="Nombre completo"
              onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" value={form.email_contacto} placeholder="correo@empresa.com"
              onChange={e => setForm({ ...form, email_contacto: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Telefono</label>
            <input style={inp} value={form.telefono_contacto} placeholder="9xxxxxxxx"
              onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={section}>Contacto administracion / pagos</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Nombre</label>
            <input style={inp} value={form.nombre_contacto_admin} placeholder="Nombre completo"
              onChange={e => setForm({ ...form, nombre_contacto_admin: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" value={form.email_contacto_admin} placeholder="admin@empresa.com"
              onChange={e => setForm({ ...form, email_contacto_admin: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Telefono</label>
            <input style={inp} value={form.telefono_contacto_admin} placeholder="9xxxxxxxx"
              onChange={e => setForm({ ...form, telefono_contacto_admin: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...section, marginBottom: 0 }}>Contactos adicionales</h2>
          <button onClick={agregarContacto}
            style={{ fontSize: 12, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
            + Agregar contacto
          </button>
        </div>
        {contactosAdicionales.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>No hay contactos adicionales</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {contactosAdicionales.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <label style={lbl}>Nombre</label>
                  <input style={inp} value={c.nombre} placeholder="Nombre" onChange={e => updateContacto(i, "nombre", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Cargo</label>
                  <input style={inp} value={c.cargo} placeholder="Cargo" onChange={e => updateContacto(i, "cargo", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} value={c.email} placeholder="Email" onChange={e => updateContacto(i, "email", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Telefono</label>
                  <input style={inp} value={c.telefono} placeholder="Telefono" onChange={e => updateContacto(i, "telefono", e.target.value)} />
                </div>
                <button onClick={() => removeContacto(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 6 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={section}>Datos bancarios — Cuenta 1</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Banco</label>
            <select style={inp} value={form.banco_1} onChange={e => setForm({ ...form, banco_1: e.target.value })}>
              <option value="">Sin banco</option>
              {BANCOS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Tipo cuenta</label>
            <select style={inp} value={form.tipo_cuenta_1} onChange={e => setForm({ ...form, tipo_cuenta_1: e.target.value })}>
              <option value="">Seleccionar</option>
              {TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>N cuenta</label>
            <input style={inp} value={form.numero_cuenta_1} placeholder="Numero de cuenta"
              onChange={e => setForm({ ...form, numero_cuenta_1: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>CCI</label>
            <input style={inp} value={form.cci_1} placeholder="Cuenta interbancaria"
              onChange={e => setForm({ ...form, cci_1: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={section}>Datos bancarios — Cuenta 2 (opcional)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Banco</label>
            <select style={inp} value={form.banco_2} onChange={e => setForm({ ...form, banco_2: e.target.value })}>
              <option value="">Sin banco</option>
              {BANCOS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Tipo cuenta</label>
            <select style={inp} value={form.tipo_cuenta_2} onChange={e => setForm({ ...form, tipo_cuenta_2: e.target.value })}>
              <option value="">Seleccionar</option>
              {TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>N cuenta</label>
            <input style={inp} value={form.numero_cuenta_2} placeholder="Numero de cuenta"
              onChange={e => setForm({ ...form, numero_cuenta_2: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>CCI</label>
            <input style={inp} value={form.cci_2} placeholder="Cuenta interbancaria"
              onChange={e => setForm({ ...form, cci_2: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={section}>Detraccion y tipo de transferencia</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Cuenta detraccion (Banco de la Nacion)</label>
            <input style={inp} value={form.cuenta_detraccion} placeholder="N cuenta detraccion"
              onChange={e => setForm({ ...form, cuenta_detraccion: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Tipo transferencia preferido</label>
            <select style={inp} value={form.tipo_pago_transferencia} onChange={e => setForm({ ...form, tipo_pago_transferencia: e.target.value })}>
              {TIPOS_TRANSFERENCIA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={async () => await registrarAccion({ accion: "crear", modulo: "clientes", entidad_id: cliente?.id, entidad_tipo: "cliente", descripcion: "Cliente creado: " + form.razon_social })
    router.push("/clientes")} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Crear cliente"}
        </button>
      </div>
    </div>
  )

}