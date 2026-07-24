"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import { V2FullFormTemplate } from "@/components/v2/templates"
import {
  V2PageHeader,
  V2SectionCard,
  V2FormField,
  V2Input,
  V2Select,
  V2Button,
} from "@/components/v2/system"

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
  } catch {
    return null
  }
}

export default function NuevoClientePage() {
  const supabase = createClient()
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [buscandoRUC, setBuscandoRUC] = useState(false)
  const [rucEstado, setRucEstado] = useState<"ok" | "error" | null>(null)
  const [esProveedor, setEsProveedor] = useState(false)
  const [contactosAdicionales, setContactosAdicionales] = useState<any[]>([])

  const [form, setForm] = useState({
    razon_social: "",
    ruc: "",
    direccion: "",
    nombre_contacto: "",
    email_contacto: "",
    telefono_contacto: "",
    nombre_contacto_admin: "",
    email_contacto_admin: "",
    telefono_contacto_admin: "",
    banco_1: "",
    tipo_cuenta_1: "",
    numero_cuenta_1: "",
    cci_1: "",
    banco_2: "",
    tipo_cuenta_2: "",
    numero_cuenta_2: "",
    cci_2: "",
    cuenta_detraccion: "",
    tipo_pago_transferencia: "Transferencia bancaria",
  })

  function agregarContacto() {
    setContactosAdicionales((prev) => [...prev, { nombre: "", email: "", telefono: "", cargo: "" }])
  }

  function updateContacto(idx: number, field: string, value: string) {
    setContactosAdicionales((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
  }

  function removeContacto(idx: number) {
    setContactosAdicionales((prev) => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!form.razon_social) {
      alert("Razon social es obligatoria")
      return
    }
    setSaving(true)

    const payload: any = {
      ...form,
      entidad: "peru",
      es_proveedor: esProveedor,
      contactos_adicionales: JSON.stringify(contactosAdicionales),
    }

    const { data: cliente, error } = await supabase.from("clientes").insert(payload).select().single()
    if (error) {
      alert("Error: " + error.message)
      setSaving(false)
      return
    }

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
    await registrarAccion({
      accion: "crear",
      modulo: "clientes",
      entidad_id: cliente?.id,
      entidad_tipo: "cliente",
      descripcion: "Cliente creado: " + form.razon_social,
    })
    router.push("/clientes")
  }

  return (
    <V2FullFormTemplate
        header={
          <V2PageHeader
            title="Nuevo cliente"
            eyebrow="Clientes / Nuevo cliente"
          />
        }
        actions={
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <V2Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/clientes")}
            >
              Cancelar
            </V2Button>
            <V2Button type="button" onClick={guardar} disabled={saving}>
              {saving ? "Guardando..." : "Crear cliente"}
            </V2Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: "16px", maxWidth: "900px", margin: "0 auto" }}>
          {/* Seccion 1: Datos generales (Datos de la empresa) */}
          <V2SectionCard title="Datos de la empresa">
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <V2FormField label="Razon social" required>
                  <V2Input
                    value={form.razon_social}
                    placeholder="Razon social"
                    onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  />
                </V2FormField>

                <V2FormField label="RUC" error={rucEstado === "error" ? "RUC no encontrado" : undefined}>
                  <div style={{ position: "relative", width: "100%" }}>
                    <V2Input
                      value={form.ruc}
                      placeholder="20xxxxxxxxx"
                      style={{ paddingRight: "36px" }}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11)
                        setForm((prev) => ({ ...prev, ruc: val }))
                        setRucEstado(null)
                        if (val.length === 11) {
                          setBuscandoRUC(true)
                          const data = await consultarRUC(val)
                          setBuscandoRUC(false)
                          if (data && data.razonSocial) {
                            setForm((prev) => ({
                              ...prev,
                              ruc: val,
                              razon_social: data.razonSocial,
                              direccion: data.direccion || prev.direccion,
                            }))
                            setRucEstado("ok")
                          } else {
                            setRucEstado("error")
                          }
                        }
                      }}
                    />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                      {buscandoRUC ? "⏳" : rucEstado === "ok" ? "✅" : rucEstado === "error" ? "❌" : ""}
                    </span>
                  </div>
                </V2FormField>
              </div>

              <V2FormField label="Direccion">
                <V2Input
                  value={form.direccion}
                  placeholder="Direccion de la empresa"
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </V2FormField>

              <div style={{ padding: "4px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={esProveedor}
                    onChange={(e) => setEsProveedor(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>También es proveedor</span>
                  <span style={{ fontSize: 11, color: "var(--v2-muted)" }}>
                    (se copiará automáticamente a la base de proveedores)
                  </span>
                </label>
              </div>
            </div>
          </V2SectionCard>

          {/* Seccion 2: Contacto comercial */}
          <V2SectionCard title="Contacto comercial">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <V2FormField label="Nombre">
                <V2Input
                  value={form.nombre_contacto}
                  placeholder="Nombre completo"
                  onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Email">
                <V2Input
                  type="email"
                  value={form.email_contacto}
                  placeholder="correo@empresa.com"
                  onChange={(e) => setForm({ ...form, email_contacto: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Telefono">
                <V2Input
                  value={form.telefono_contacto}
                  placeholder="9xxxxxxxx"
                  onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2SectionCard>

          {/* Seccion 3: Contacto administrativo */}
          <V2SectionCard title="Contacto administracion / pagos">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <V2FormField label="Nombre">
                <V2Input
                  value={form.nombre_contacto_admin}
                  placeholder="Nombre completo"
                  onChange={(e) => setForm({ ...form, nombre_contacto_admin: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Email">
                <V2Input
                  type="email"
                  value={form.email_contacto_admin}
                  placeholder="admin@empresa.com"
                  onChange={(e) => setForm({ ...form, email_contacto_admin: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Telefono">
                <V2Input
                  value={form.telefono_contacto_admin}
                  placeholder="9xxxxxxxx"
                  onChange={(e) => setForm({ ...form, telefono_contacto_admin: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2SectionCard>

          {/* Seccion 4: Datos bancarios - Cuenta 1 */}
          <V2SectionCard title="Datos bancarios — Cuenta 1">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <V2FormField label="Banco">
                <V2Select
                  options={[
                    { label: "Sin banco", value: "" },
                    ...BANCOS.map((b) => ({ label: b, value: b })),
                  ]}
                  value={form.banco_1}
                  onChange={(e) => setForm({ ...form, banco_1: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Tipo cuenta">
                <V2Select
                  options={[
                    { label: "Seleccionar", value: "" },
                    ...TIPOS_CUENTA.map((t) => ({ label: t, value: t })),
                  ]}
                  value={form.tipo_cuenta_1}
                  onChange={(e) => setForm({ ...form, tipo_cuenta_1: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="N cuenta">
                <V2Input
                  value={form.numero_cuenta_1}
                  placeholder="Numero de cuenta"
                  onChange={(e) => setForm({ ...form, numero_cuenta_1: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="CCI">
                <V2Input
                  value={form.cci_1}
                  placeholder="Cuenta interbancaria"
                  onChange={(e) => setForm({ ...form, cci_1: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2SectionCard>

          {/* Seccion 5: Datos bancarios - Cuenta 2 (opcional) */}
          <V2SectionCard title="Datos bancarios — Cuenta 2 (opcional)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <V2FormField label="Banco">
                <V2Select
                  options={[
                    { label: "Sin banco", value: "" },
                    ...BANCOS.map((b) => ({ label: b, value: b })),
                  ]}
                  value={form.banco_2}
                  onChange={(e) => setForm({ ...form, banco_2: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Tipo cuenta">
                <V2Select
                  options={[
                    { label: "Seleccionar", value: "" },
                    ...TIPOS_CUENTA.map((t) => ({ label: t, value: t })),
                  ]}
                  value={form.tipo_cuenta_2}
                  onChange={(e) => setForm({ ...form, tipo_cuenta_2: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="N cuenta">
                <V2Input
                  value={form.numero_cuenta_2}
                  placeholder="Numero de cuenta"
                  onChange={(e) => setForm({ ...form, numero_cuenta_2: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="CCI">
                <V2Input
                  value={form.cci_2}
                  placeholder="Cuenta interbancaria"
                  onChange={(e) => setForm({ ...form, cci_2: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2SectionCard>

          {/* Seccion 6: Detraccion y tipo de transferencia */}
          <V2SectionCard title="Detraccion y tipo de transferencia">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <V2FormField label="Cuenta detraccion (Banco de la Nacion)">
                <V2Input
                  value={form.cuenta_detraccion}
                  placeholder="N cuenta detraccion"
                  onChange={(e) => setForm({ ...form, cuenta_detraccion: e.target.value })}
                />
              </V2FormField>

              <V2FormField label="Tipo transferencia preferido">
                <V2Select
                  options={TIPOS_TRANSFERENCIA.map((t) => ({ label: t, value: t }))}
                  value={form.tipo_pago_transferencia}
                  onChange={(e) => setForm({ ...form, tipo_pago_transferencia: e.target.value })}
                />
              </V2FormField>
            </div>
          </V2SectionCard>

          {/* Seccion 7: Contactos adicionales */}
          <V2SectionCard
            title="Contactos adicionales"
            action={
              <V2Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={agregarContacto}
                style={{ borderStyle: "dashed" }}
              >
                + Agregar contacto
              </V2Button>
            }
          >
            {contactosAdicionales.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--v2-muted)", textAlign: "center", padding: "12px 0" }}>
                No hay contactos adicionales
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {contactosAdicionales.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr)) auto",
                      gap: 12,
                      alignItems: "end",
                      padding: "12px",
                      background: "var(--v2-surface-soft)",
                      border: "1px solid var(--v2-border-soft)",
                      borderRadius: "var(--v2-radius)",
                    }}
                  >
                    <V2FormField label="Nombre">
                      <V2Input
                        value={c.nombre}
                        placeholder="Nombre"
                        onChange={(e) => updateContacto(i, "nombre", e.target.value)}
                      />
                    </V2FormField>

                    <V2FormField label="Cargo">
                      <V2Input
                        value={c.cargo}
                        placeholder="Cargo"
                        onChange={(e) => updateContacto(i, "cargo", e.target.value)}
                      />
                    </V2FormField>

                    <V2FormField label="Email">
                      <V2Input
                        value={c.email}
                        placeholder="Email"
                        onChange={(e) => updateContacto(i, "email", e.target.value)}
                      />
                    </V2FormField>

                    <V2FormField label="Telefono">
                      <V2Input
                        value={c.telefono}
                        placeholder="Telefono"
                        onChange={(e) => updateContacto(i, "telefono", e.target.value)}
                      />
                    </V2FormField>

                    <button
                      type="button"
                      onClick={() => removeContacto(i)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--v2-danger)",
                        fontSize: 20,
                        paddingBottom: 6,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </V2SectionCard>

        </div>
      </V2FullFormTemplate>
  )
}