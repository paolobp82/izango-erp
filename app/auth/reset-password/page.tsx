"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const LOGO_URL = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [listo, setListo] = useState(false)

  async function handleReset() {
    if (!password || !confirmar) { setError("Completa ambos campos"); return }
    if (password !== confirmar) { setError("Las contraseñas no coinciden"); return }
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError("Error: " + error.message) }
    else {
      setMsg("Contraseña actualizada correctamente. Redirigiendo...")
      setListo(true)
      setTimeout(() => router.push("/dashboard"), 2500)
    }
    setLoading(false)
  }

  const inp: any = { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1D2040 0%, #0a0d1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", background: "#03E373", borderRadius: 20, padding: "16px 24px", marginBottom: 20 }}>
            <img src={LOGO_URL} alt="Izango" style={{ height: 60, objectFit: "contain", display: "block" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#fff" }}>Nueva contraseña</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Ingresa tu nueva contraseña</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          {!listo ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>Nueva contraseña</label>
                <input type="password" style={inp} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>Confirmar contraseña</label>
                <input type="password" style={inp} placeholder="Repite la contraseña" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
              </div>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button onClick={handleReset} disabled={loading}
                style={{ width: "100%", padding: "11px", background: loading ? "#94a3b8" : "#03E373", border: "none", borderRadius: 8, color: "#1D2040", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
                {loading ? "Actualizando..." : "Cambiar contraseña →"}
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Contraseña actualizada</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{msg}</div>
            </div>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 20 }}>© 2026 Izango 360 S.A.C.</p>
      </div>
    </div>
  )
}