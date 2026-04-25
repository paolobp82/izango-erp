"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"

const LOGO_URL = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

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
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 20 }}>
          © 2026 Izango 360 S.A.C. · Uso interno exclusivo
        </p>
      </div>
    </div>
  )
}