import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function LiquidacionesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Liquidaciones</h1><p style={{color:"#6b7280",fontSize:13}}>Modulo en construccion — Sesion 5</p></div>
}