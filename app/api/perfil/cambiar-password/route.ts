import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const { password } = await request.json()
    if (!password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    if (password.length < 6) {
      return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const { error } = await auth.supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
