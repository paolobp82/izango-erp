import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = new Set(["/login", "/reset-password", "/auth/callback", "/api/auth/login"])
const LEGACY_PUBLIC_REDIRECTS: Record<string, string> = {
  "/auth/login": "/login",
  "/auth/reset-password": "/reset-password",
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const legacyRedirect = LEGACY_PUBLIC_REDIRECTS[pathname]
  if (legacyRedirect) {
    return NextResponse.redirect(new URL(legacyRedirect, request.url))
  }

  if (PUBLIC_ROUTES.has(pathname) || isPublicAsset(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === "/finanzas" || pathname.startsWith("/finanzas/")) {
    const { data: profile } = await supabase
      .from("perfiles")
      .select("perfil")
      .eq("id", user.id)
      .single()

    if (!["superadmin", "controller", "gerente_general"].includes(profile?.perfil || "")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
