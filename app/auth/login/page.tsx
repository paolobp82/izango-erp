"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"

const LOGO_URL = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [loadingReset, setLoadingReset] = useState(false)
  const [resetMsg, setResetMsg] = useState("")
  const [resetError, setResetError] = useState("")
  const supabase = createClient()

  async function handleReset() {
    if (!resetEmail) { setResetError("Ingresa tu email"); return }
    setLoadingReset(true)
    setResetMsg("")
    setResetError("")
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + "/perfil"
    })
    if (error) { setResetError("Error: " + error.message) }
    else { setResetMsg("Te enviamos un link de recuperación a " + resetEmail) }
    setLoadingReset(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
    } else {
      window.location.href = "/dashboard"
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1D2040 0%, #0a0d1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo y bienvenida */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", background: "#03E373", borderRadius: 20, padding: "16px 24px", marginBottom: 20 }}>
            <img src={LOGO_URL} alt="Izango" style={{ height: 60, objectFit: "contain", display: "block" }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>Bienvenido a Izango ERP</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Sistema de gestión interno · Izango 360 S.A.C.</p>
        </div>

        {/* Card login */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, marginTop: 0, color: "#111827" }}>Iniciar sesión</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>Email</label>
              <input type="email" placeholder="tu@izango.com.pe" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#03E373"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>Contraseña</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#03E373"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
            </div>
            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 16, border: "1px solid #fecaca" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "11px", background: loading ? "#94a3b8" : "#03E373", border: "none", borderRadius: 8, color: "#1D2040", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "background 0.2s" }}>
              {loading ? "Ingresando..." : "Ingresar →"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => setShowReset(!showReset)}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          {showReset && (
            <div style={{ marginTop: 16, padding: "16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Recuperar contraseña</div>
              <input type="email" placeholder="tu@izango.com.pe" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
              {resetMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "8px 10px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{resetMsg}</div>}
              {resetError && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 10px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{resetError}</div>}
              <button onClick={handleReset} disabled={loadingReset}
                style={{ width: "100%", padding: "8px", background: "#1D2040", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {loadingReset ? "Enviando..." : "Enviar link de recuperación"}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 20 }}>
          © 2026 Izango 360 S.A.C. · Uso interno exclusivo
        </p>
      </div>
    </div>
  )
}