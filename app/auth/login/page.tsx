"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Email o contrasena incorrectos"); setLoading(false) }
    else { router.push("/dashboard"); router.refresh() }
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-izango-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-xl">iz</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Izango ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de gestion Izango 360</p>
        </div>
        <div className="card">
          <h2 className="text-base font-medium text-gray-900 mb-5">Iniciar sesion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="tu@izango.com.pe" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Contrasena</label>
              <input type="password" className="input" placeholder="........" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex disabled:opacity-60">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Izango 360 S.A.C. Sistema interno</p>
      </div>
    </div>
  )
}