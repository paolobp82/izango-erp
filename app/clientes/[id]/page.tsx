"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const TIPOS_CUENTA = ["Ahorros", "Corriente"]
const TIPOS_TRANSFERENCIA = ["Transferencia bancaria", "Yape", "Plin", "Efectivo", "Cheque"]

async function consultarRUC(ruc: string) {
  try {
    const res = await fetch(`/api/ruc?numero=${ruc}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.error) return null
    return { razonSocial: data.nombre, direccion: data.direccion }
  } catch { return null }
}

type Contacto = {
  id?: string
  nombre: string
  cargo: string
  email: string
  telefono: string
  activo: boolean
  orden: number
  isNew?: boolean
  isDeleted?: boolean
}

export default function EditarClientePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [buscandoRUC, setBuscandoRUC] = useState(false)
  const [rucEstado, setRucEstado] = useState<"ok" | "error" | null>(null)
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [form, setForm] = useState({
    razon_social: "", ruc: "", direccion: "",
    banco_1: "", tipo_cuenta_1: "", numero_cuenta_1: "", cci_1: "",
    banco_2: "", tipo_cuenta_2: "", numero_cuenta_2: "", cci_2: "",
    cuenta_detraccion: "", tipo_pago_transferencia: "Transferencia bancaria",
    activo: true,
  })

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data } = await supabase.from("clientes").select("*").eq("id", id).single()
      if (!data) { router.push("/clientes"); return }
      setForm({
        razon_social: data.razon_social || "",
        ruc: data.ruc || "",
        direccion: data.direccion || "",
        banco_1: data.banco_1 || "",
        tipo_cuenta_1: data.tipo_cuenta_1 || "",
        numero_cuenta_1: data.numero_cuenta_1 || "",
        cci_1: data.cci_1 || "",
        banco_2: data.banco_2 || "",
        tipo_cuenta_2: data.tipo_cuenta_2 || "",
        numero_cuenta_2: data.numero_cuenta_2 || "",
        cci_2: data.cci_2 || "",
        cuenta_detraccion: data.cuenta_detraccion || "",
        tipo_pago_transferencia: data.tipo_pago_transferencia || "Transferencia bancaria",
        activo: data.activo !== false,
      })

      const { data: contactosData } = await supabase
        .from("cliente_contactos")
        .select("*")
        .eq("cliente_id", id)
        .eq("activo", true)
        .order("orden", { ascending: true })

      setContactos((contactosData || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre || "",
        cargo: c.cargo || "",
        email: c.email || "",
        telefono: c.telefono || "",
        activo: c.activo !== false,
        orden: c.orden || 0,
      })))
      setLoading(false)
    }
    load()
  }, [id])

  function agregarContacto() {
    setContactos(prev => [...prev, {
      nombre: "", cargo: "", email: "", telefono: "",
      activo: true, orden: prev.length, isNew: true
    }])
  }

  function updateContacto(idx: number, field: string, value: string) {
    setContactos(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function removeContacto(idx: number) {
    setContactos(prev => prev.map((c, i) => {
      if (i !== idx) return c
      return { ...c, isDeleted: true }
    }))
  }

  async function guardar() {
    if (!form.razon_social) { alert("Razon social es obligatoria"); return }
    setSaving(true)

    const { error } = await supabase.from("clientes").update({ ...form }).eq("id", id)
    if (error) { alert("Error: " + error.message); setSaving(false); return }

    for (const c of contactos) {
      if (c.isDeleted && c.id) {
        await supabase.from("cliente_contactos").update({ activo: false }).eq("id", c.id)
      } else if (c.isDeleted && c.isNew) {
        continue
      } else if (c.isNew) {
        await supabase.from("cliente_contactos").insert({
          cliente_id: id,
          nombre: c.nombre,
          cargo: c.cargo || null,
          email: c.email || null,
          telefono: c.telefono || null,
          activo: true,
          orden: c.orden,
        })
      } else if (c.id) {
        await supabase.from("cliente_contactos").update({
          nombre: c.nombre,
          cargo: c.cargo || null,
          email: c.email || null,
          telefono: c.telefono || null,
          orden: c.orden,
        }).eq("id", c.id)
      }
    }

    await registrarAccion({
      accion: "editar", modulo: "clientes", entidad_id: id,
      entidad_tipo: "cliente", descripcion: "Cliente editado: " + form.razon_social
    })
    setSaving(false)
    router.push("/clientes")
  }

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }
  const section: any = { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }

  const contactosVisibles = contactos.filter(c => !c.isDeleted)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <a href="/clientes" style={{ color: "#9ca3af", fontSize: 12 }}>Clientes</a>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Editar cliente</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>{form.razon_social}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => router.push(`/proyectos?cliente_id=${id}`)} className="btn-secondary" style={{ fontSize: 13 }}>
              Ver proyectos del cliente
            </button>
            <button onClick={() => router.push(`/proyectos/nuevo?cliente_id=${id}`)} className="btn-primary" style={{ fontSize: 13 }}>
              Crear nuevo proyecto
            </button>
          </div>
        </div>
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
              <div style={{ position: "relative" }}>
                <input style={{ ...inp, paddingRight: 36 }} value={form.ruc} placeholder="20xxxxxxxxx"
                  onChange={async e => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11)
                    setForm(prev => ({ ...prev, ruc: val }))
                    setRucEstado(null)
                    if (val.length === 11) {
                      setBuscandoRUC(true)
                      const data = await consultarRUC(val)
                      setBuscandoRUC(false)
                      if (data && data.razonSocial) {
                        setForm(prev => ({ ...prev, ruc: val, razon_social: data.razonSocial, direccion: data.direccion || prev.direccion }))
                        setRucEstado("ok")
                      } else { setRucEstado("error") }
                    }
                  }} />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                  {buscandoRUC ? "⏳" : rucEstado === "ok" ? "✅" : rucEstado === "error" ? "❌" : ""}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label style={lbl}>Direccion</label>
            <input style={inp} value={form.direccion} placeholder="Direccion de la empresa"
              onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Cliente activo</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...section, marginBottom: 0 }}>Contactos</h2>
          <button onClick={agregarContacto}
            style={{ fontSize: 12, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
            + Agregar contacto
          </button>
        </div>
        {contactosVisibles.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
            No hay contactos registrados
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {contactosVisibles.map((c, i) => {
              const realIdx = contactos.indexOf(c)
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end", padding: "12px", background: "#f9fafb", borderRadius: 8 }}>
                  <div>
                    <label style={lbl}>Nombre</label>
                    <input style={inp} value={c.nombre} placeholder="Nombre completo"
                      onChange={e => updateContacto(realIdx, "nombre", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Cargo</label>
                    <input style={inp} value={c.cargo} placeholder="Ej: Gerente de marketing"
                      onChange={e => updateContacto(realIdx, "cargo", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <input style={inp} value={c.email} placeholder="correo@empresa.com"
                      onChange={e => updateContacto(realIdx, "email", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Telefono</label>
                    <input style={inp} value={c.telefono} placeholder="9xxxxxxxx"
                      onChange={e => updateContacto(realIdx, "telefono", e.target.value)} />
                  </div>
                  <button onClick={() => removeContacto(realIdx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 6 }}>
                    ×
                  </button>
                </div>
              )
            })}
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
        <button onClick={() => router.push("/clientes")} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}
