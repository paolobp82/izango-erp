import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import Sidebar from "@/components/layout/Sidebar"
import type { Perfil } from "@/types"
export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
  if (!perfil) redirect("/auth/login")
  return <div className="flex min-h-screen"><Sidebar perfil={perfil as Perfil} /><main className="ml-56 flex-1 p-6">{children}</main></div>
}