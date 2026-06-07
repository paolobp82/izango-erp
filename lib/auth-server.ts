import { NextResponse } from "next/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import { createServerSupabase } from "@/lib/supabase-server"

const ADMIN_ROLES = new Set(["superadmin", "gerente_general"])

export type AuthProfile = {
  id: string
  perfil: string
  entidad?: string | null
  activo?: boolean | null
}

type AuthResult =
  | { error: null; supabase: Awaited<ReturnType<typeof createServerSupabase>>; user: User; profile: AuthProfile }
  | { error: NextResponse; supabase: Awaited<ReturnType<typeof createServerSupabase>>; user?: User }

export async function getAuthenticatedProfile(): Promise<AuthResult> {
  const supabase = await createServerSupabase()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
      supabase,
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("perfiles")
    .select("id, perfil, entidad, activo")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.activo === false) {
    return {
      error: NextResponse.json({ error: "Perfil no autorizado" }, { status: 403 }),
      supabase,
      user,
    }
  }

  return { error: null, supabase, user, profile: profile as AuthProfile }
}

export async function requireAdminProfile() {
  const auth = await getAuthenticatedProfile()
  if (auth.error) return auth

  if (!ADMIN_ROLES.has(auth.profile.perfil)) {
    return {
      ...auth,
      error: NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 }),
    }
  }

  return auth
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Supabase admin credentials missing")
  }

  return createSupabaseAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error interno"
}
