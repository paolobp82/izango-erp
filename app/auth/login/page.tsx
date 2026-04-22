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
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email o contrasena incorrectos")
      setLoading(false)
    } else {
      window.location.href = "/dashboard"
    }
  }
  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:384}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:56,height:56,background:"#1D9E75",borderRadius:16,marginBottom:16}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:20}}>iz</span>
          </div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Izango ERP</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:4}}>Sistema de gestion Izango 360</p>
        </div>
        <div className="card">
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:20,marginTop:0}}>Iniciar sesion</h2>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:14}}>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="tu@izango.com.pe" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{marginBottom:14}}>
              <label className="label">Contrasena</label>
              <input type="password" className="input" placeholder="........" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{background:"#fef2f2",color:"#dc2626",fontSize:13,padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{width:"100%",opacity:loading?0.6:1}}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:"#9ca3af",marginTop:24}}>Izango 360 S.A.C. Sistema interno</p>
      </div>
    </div>
  )
}