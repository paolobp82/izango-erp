"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  V2Button,
  V2FormField,
  V2Input,
  V2PageHeader,
  V2Skeleton,
  V2StatusBadge,
  V2Tabs,
} from "@/components/v2/system"
import { V2SettingsPageTemplate } from "@/components/v2/templates"

type PerfilUsuario = {
  id: string
  nombre?: string | null
  apellido?: string | null
  cargo?: string | null
  perfil?: string | null
  email?: string | null
}

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), [])
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [cargo, setCargo] = useState("")
  const [email, setEmail] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [passConfirmar, setPassConfirmar] = useState("")
  const [savingPass, setSavingPass] = useState(false)
  const [msgPass, setMsgPass] = useState("")
  const [errorPass, setErrorPass] = useState("")

  const [activeTab, setActiveTab] = useState("general")

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
        setPerfil({ ...p, email: user.email })
        setNombre(p?.nombre || "")
        setApellido(p?.apellido || "")
        setCargo(p?.cargo || "")
        setEmail(user.email || "")
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function guardarPerfil() {
    if (!perfil) return
    setSaving(true)
    setMsg("")
    setError("")
    const { error } = await supabase.from("perfiles").update({ nombre, apellido, cargo }).eq("id", perfil.id)
    if (error) {
      setError("Error al guardar: " + error.message)
    } else {
      setMsg("Perfil actualizado correctamente")
    }
    setSaving(false)
  }

  async function cambiarPassword() {
    setSavingPass(true)
    setMsgPass("")
    setErrorPass("")
    if (passNueva !== passConfirmar) {
      setErrorPass("Las contraseñas no coinciden")
      setSavingPass(false)
      return
    }
    if (passNueva.length < 6) {
      setErrorPass("Mínimo 6 caracteres")
      setSavingPass(false)
      return
    }
    const res = await fetch("/api/perfil/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passNueva }),
    })
    const data = await res.json()
    if (data.error) {
      setErrorPass(data.error)
    } else {
      setMsgPass("Contraseña actualizada correctamente")
      setPassNueva("")
      setPassConfirmar("")
    }
    setSavingPass(false)
  }

  const PERFIL_LABEL: Record<string, string> = {
    superadmin: "Super Administrador",
    gerente_general: "Gerente General",
    administrador: "Administrador",
    controller: "Controller",
    productor: "Productor",
    logistica: "Logística",
    practicante: "Practicante",
    comercial: "Comercial",
    gerente_produccion: "Gerente de Producción",
    gerente_finanzas: "Gerente de Finanzas",
  }

  const badgeTone = (perfilKey: string): "success" | "warning" | "danger" | "info" | "neutral" | "outlined" => {
    if (perfilKey === "superadmin" || perfilKey === "gerente_general") return "success"
    if (perfilKey === "productor" || perfilKey === "gerente_produccion") return "success"
    if (perfilKey === "logistica") return "warning"
    if (perfilKey === "comercial") return "danger"
    if (perfilKey === "controller" || perfilKey === "administrador" || perfilKey === "gerente_finanzas") return "info"
    return "neutral"
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <V2Skeleton height={40} width="60%" />
          <V2Skeleton height={20} width="40%" />
          <V2Skeleton height={120} />
          <V2Skeleton height={200} />
        </div>
      </div>
    )
  }

  const perfilKey = perfil?.perfil || ""

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <V2SettingsPageTemplate
          header={
            <V2PageHeader
              eyebrow="Configuración de Usuario"
              title="Mi perfil"
              subtitle="Gestiona tu información personal y configuración de seguridad."
            />
          }
          tabs={
            <V2Tabs
              activeId={activeTab}
              items={[
                { id: "general", label: "Datos personales" },
                { id: "security", label: "Seguridad" },
              ]}
              onChange={setActiveTab}
            />
          }
        >
          {activeTab === "general" ? (
            <div style={{ display: "grid", gap: 20 }}>
              {/* Avatar y rol info */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--v2-border-soft)", paddingBottom: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--v2-brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "var(--v2-surface-sidebar)", flexShrink: 0 }}>
                  {nombre?.[0]}
                  {apellido?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--v2-text)" }}>
                    {nombre} {apellido}
                  </div>
                  {cargo && <div style={{ fontSize: 13, color: "var(--v2-muted)", marginTop: 2 }}>{cargo}</div>}
                  <div style={{ fontSize: 12, color: "var(--v2-muted)" }}>{email}</div>
                  <div style={{ marginTop: 6 }}>
                    <V2StatusBadge tone={badgeTone(perfilKey)}>
                      {PERFIL_LABEL[perfilKey] || perfilKey}
                    </V2StatusBadge>
                  </div>
                </div>
              </div>

              {/* Formulario de datos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <V2FormField label="Nombre">
                  <V2Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </V2FormField>
                <V2FormField label="Apellido">
                  <V2Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </V2FormField>
              </div>

              <V2FormField label="Cargo / Puesto">
                <V2Input
                  value={cargo}
                  placeholder="Ej: Director Comercial, Productor Senior..."
                  onChange={(e) => setCargo(e.target.value)}
                />
              </V2FormField>

              <V2FormField label="Email">
                <V2Input value={email} disabled />
              </V2FormField>

              {msg && (
                <div style={{ background: "rgba(3, 227, 115, 0.1)", color: "var(--v2-brand-primary)", padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(3, 227, 115, 0.2)" }}>
                  {msg}
                </div>
              )}
              {error && (
                <div style={{ background: "rgba(224, 86, 86, 0.1)", color: "var(--v2-danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(224, 86, 86, 0.2)" }}>
                  {error}
                </div>
              )}

              <div>
                <V2Button onClick={guardarPerfil} loading={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </V2Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              <V2FormField label="Nueva contraseña" required>
                <V2Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={passNueva}
                  onChange={(e) => setPassNueva(e.target.value)}
                />
              </V2FormField>

              <V2FormField label="Confirmar nueva contraseña" required>
                <V2Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  value={passConfirmar}
                  onChange={(e) => setPassConfirmar(e.target.value)}
                />
              </V2FormField>

              {msgPass && (
                <div style={{ background: "rgba(3, 227, 115, 0.1)", color: "var(--v2-brand-primary)", padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(3, 227, 115, 0.2)" }}>
                  {msgPass}
                </div>
              )}
              {errorPass && (
                <div style={{ background: "rgba(224, 86, 86, 0.1)", color: "var(--v2-danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(224, 86, 86, 0.2)" }}>
                  {errorPass}
                </div>
              )}

              <div>
                <V2Button onClick={cambiarPassword} loading={savingPass}>
                  {savingPass ? "Actualizando..." : "Cambiar contraseña"}
                </V2Button>
              </div>
            </div>
          )}
        </V2SettingsPageTemplate>
      </div>
  )
}
