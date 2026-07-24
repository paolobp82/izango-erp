"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
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
    razon_social: "",
    ruc: "",
    direccion: "",
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
    activo: true,
  })

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data } = await supabase.from("clientes").select("*").eq("id", id).single()
      if (!data) {
        router.push("/clientes")
        return
      }
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

      setContactos(
        (contactosData || []).map((c: any) => ({
          id: c.id,
          nombre: c.nombre || "",
          cargo: c.cargo || "",
          email: c.email || "",
          telefono: c.telefono || "",
          activo: c.activo !== false,
          orden: c.orden || 0,
        }))
      )
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function agregarContacto() {
    setContactos((prev) => [
      ...prev,
      {
        nombre: "",
        cargo: "",
        email: "",
        telefono: "",
        activo: true,
        orden: prev.length,
        isNew: true,
      },
    ])
  }

  function updateContacto(idx: number, field: string, value: string) {
    setContactos((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
  }

  function removeContacto(idx: number) {
    setContactos((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c
        return { ...c, isDeleted: true }
      })
    )
  }

  async function guardar() {
    if (!form.razon_social) {
      alert("Razon social es obligatoria")
      return
    }
    setSaving(true)

    const { error } = await supabase.from("clientes").update({ ...form }).eq("id", id)
    if (error) {
      alert("Error: " + error.message)
      setSaving(false)
      return
    }

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
      accion: "editar",
      modulo: "clientes",
      entidad_id: id,
      entidad_tipo: "cliente",
      descripcion: "Cliente editado: " + form.razon_social,
    })
    setSaving(false)
    router.push("/clientes")
  }

  const contactosVisibles = contactos.filter((c) => !c.isDeleted)

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
        Cargando cliente...
      </div>
    )
  }

  return (
    <V2FullFormTemplate
        header={
          <V2PageHeader
            title={form.razon_social}
            eyebrow="Clientes / Editar cliente"
            actions={
              <div style={{ display: "flex", gap: "8px" }}>
                <V2Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => router.push(`/proyectos?cliente_id=${id}`)}
                >
                  Ver proyectos
                </V2Button>
                <V2Button
                  type="button"
                  size="compact"
                  onClick={() => router.push(`/proyectos/nuevo?cliente_id=${id}`)}
                >
                  Crear proyecto
                </V2Button>
              </div>
            }
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
              {saving ? "Guardando..." : "Guardar cambios"}
            </V2Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: "16px", maxWidth: "900px", margin: "0 auto" }}>
          {/* Seccion 1: Datos de la empresa */}
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

                <V2FormField label="RUC">
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
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>Cliente activo</span>
                </label>
              </div>
            </div>
          </V2SectionCard>

          {/* Seccion 2: Datos bancarios - Cuenta 1 */}
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

          {/* Seccion 3: Datos bancarios - Cuenta 2 (opcional) */}
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

          {/* Seccion 4: Detraccion y tipo de transferencia */}
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

          {/* Seccion 5: Contactos */}
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
            {contactosVisibles.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--v2-muted)", textAlign: "center", padding: "12px 0" }}>
                No hay contactos registrados
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {contactosVisibles.map((c, i) => {
                  const realIdx = contactos.indexOf(c)
                  return (
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
                          placeholder="Nombre completo"
                          onChange={(e) => updateContacto(realIdx, "nombre", e.target.value)}
                        />
                      </V2FormField>

                      <V2FormField label="Cargo">
                        <V2Input
                          value={c.cargo}
                          placeholder="Ej: Gerente de marketing"
                          onChange={(e) => updateContacto(realIdx, "cargo", e.target.value)}
                        />
                      </V2FormField>

                      <V2FormField label="Email">
                        <V2Input
                          value={c.email}
                          placeholder="correo@empresa.com"
                          onChange={(e) => updateContacto(realIdx, "email", e.target.value)}
                        />
                      </V2FormField>

                      <V2FormField label="Telefono">
                        <V2Input
                          value={c.telefono}
                          placeholder="9xxxxxxxx"
                          onChange={(e) => updateContacto(realIdx, "telefono", e.target.value)}
                        />
                      </V2FormField>

                      <button
                        type="button"
                        onClick={() => removeContacto(realIdx)}
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
                  )
                })}
              </div>
            )}
          </V2SectionCard>

        </div>
      </V2FullFormTemplate>
  )
}
