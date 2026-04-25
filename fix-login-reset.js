const fs = require("fs");
let c = fs.readFileSync("app/auth/login/page.tsx", "utf8");

const oldImports = `"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"`;

const newImports = `"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"`;

const oldButton = `            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "11px", background: loading ? "#94a3b8" : "#03E373", border: "none", borderRadius: 8, color: "#1D2040", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "background 0.2s" }}>
              {loading ? "Ingresando..." : "Ingresar →"}
            </button>
          </form>`;

const newButton = `            <button type="submit" disabled={loading}
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
          )}`;

const oldStates = `  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()`;

const newStates = `  const [loading, setLoading] = useState(false)
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
  }`;

if (c.includes(oldStates) && c.includes(oldButton)) {
  c = c.replace(oldStates, newStates);
  c = c.replace(oldButton, newButton);
  fs.writeFileSync("app/auth/login/page.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO - states:", c.includes(oldStates), "button:", c.includes(oldButton));
}