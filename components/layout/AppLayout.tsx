import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import Sidebar from "./Sidebar"
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  if (!perfil) redirect("/auth/login")
  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar perfil={perfil} />
      <main style={{marginLeft:224,flex:1,padding:24,minHeight:"100vh"}}>{children}</main>
    </div>
  )
}