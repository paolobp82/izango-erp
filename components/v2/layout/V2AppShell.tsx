"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { V2Content } from "./V2Content"
import { V2Sidebar } from "./V2Sidebar"
import { V2ThemeScope } from "./V2ThemeScope"
import { V2Topbar } from "./V2Topbar"

type V2Profile = {
  id: string
  nombre?: string | null
  apellido?: string | null
  perfil: string
  entidad?: string | null
}

export function V2AppShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<V2Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data } = await supabase
        .from("perfiles")
        .select("id,nombre,apellido,perfil,entidad")
        .eq("id", user.id)
        .single()

      if (!data) {
        router.push("/login")
        return
      }

      if (active) {
        setProfile(data)
        setLoading(false)
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [router, supabase])

  return (
    <V2ThemeScope>
      {loading || !profile ? (
        <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", width: "100%" }}>
          <div style={{ color: "var(--v2-muted)", fontSize: 13, fontWeight: 800 }}>Cargando shell V2...</div>
        </div>
      ) : (
        <>
          <V2Sidebar profile={profile} />
          <V2Topbar profile={profile} />
          <V2Content>{children}</V2Content>
        </>
      )}
    </V2ThemeScope>
  )
}
