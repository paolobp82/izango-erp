import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  let payload: { email?: string; password?: string }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const email = payload.email?.trim()
  const password = payload.password

  if (!email || !password) {
    return NextResponse.json({ error: "Ingresa email y contraseña" }, { status: 400 })
  }

  let response: NextResponse = NextResponse.json({ ok: true })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    response = NextResponse.json(
      { error: error.message || "Email o contraseña incorrectos" },
      { status: 401 }
    )
  }

  return response
}
