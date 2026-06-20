"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { puedeVerFinanzasCorporativas } from "@/lib/permissions"

export function useFinanceAccess() {
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingAccess(false)
        return
      }

      const { data } = await supabase.from("perfiles").select("perfil").eq("id", user.id).single()
      setAuthorized(puedeVerFinanzasCorporativas(data?.perfil))
      setLoadingAccess(false)
    }

    loadAccess()
  }, [])

  return { loadingAccess, authorized }
}
