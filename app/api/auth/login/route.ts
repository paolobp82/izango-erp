import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = {
  name: string
  value: string
  options: Parameters<NextResponse["cookies"]["set"]>[2]
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  const accept = request.headers.get("accept") || ""
  const wantsHtml = accept.includes("text/html")
  let payload: { email?: string; password?: string }

  try {
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      payload = {
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      }
    } else {
      payload = await request.json()
    }
  } catch {
    if (wantsHtml) {
      return NextResponse.redirect(new URL("/login?error=Solicitud%20inválida", request.url))
    }
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const email = payload.email?.trim()
  const password = payload.password

  if (!email || !password) {
    if (wantsHtml) {
      return NextResponse.redirect(new URL("/login?error=Ingresa%20email%20y%20contraseña", request.url))
    }
    return NextResponse.json({ error: "Ingresa email y contraseña" }, { status: 400 })
  }

  let response: NextResponse = NextResponse.json({ ok: true })
  const cookiesToApply: CookieToSet[] = []
  const applyCookies = (target: NextResponse) => {
    cookiesToApply.forEach(({ name, value, options }) => {
      target.cookies.set(name, value, options)
    })
    return target
  }
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
            cookiesToApply.push({ name, value, options })
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (wantsHtml) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message || "Email o contraseña incorrectos")}`, request.url))
    }
    response = NextResponse.json(
      { error: error.message || "Email o contraseña incorrectos" },
      { status: 401 }
    )
  }

  if (!error && wantsHtml) {
    const next = new URL(request.url).searchParams.get("next") || "/dashboard"
    response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", request.url))
  }

  return applyCookies(response)
}
