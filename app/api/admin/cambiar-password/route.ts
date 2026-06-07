import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getErrorMessage, requireAdminProfile } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if (auth.error) return auth.error

    const { user_id, password } = await request.json()
    if (!user_id || !password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 })

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
