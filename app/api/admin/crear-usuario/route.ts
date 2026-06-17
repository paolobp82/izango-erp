import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getErrorMessage, requireAdminProfile } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if (auth.error) return auth.error

    const { email, password, nombre, apellido, perfil, entidad } = await request.json()
    if (!email || !password || !nombre || !apellido || !perfil) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    const { error: perfilError } = await supabaseAdmin.from("perfiles").insert({
      id: authData.user.id, email, nombre, apellido, perfil, entidad: entidad || "peru",
    })
    if (perfilError) return NextResponse.json({ error: perfilError.message }, { status: 400 })
    return NextResponse.json({ success: true, user_id: authData.user.id })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

