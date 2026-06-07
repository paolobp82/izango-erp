import { readFileSync } from "node:fs"

const checks = []

function check(id, condition, detail) {
  checks.push({ id, result: condition ? "PASS" : "FAIL", detail })
}

const middleware = readFileSync("middleware.ts", "utf8")
const appLayout = readFileSync("components/layout/AppLayout.tsx", "utf8")
const sidebar = readFileSync("components/layout/Sidebar.tsx", "utf8")
const login = readFileSync("app/auth/login/page.tsx", "utf8")
const callback = readFileSync("app/auth/callback/route.ts", "utf8")

check("MW-01", !middleware.includes("return NextResponse.next()\n}"), "Middleware no es passthrough simple")
check("MW-02", middleware.includes('"/login"') && middleware.includes('"/reset-password"') && middleware.includes('"/auth/callback"'), "Rutas publicas canonicas permitidas")
check("MW-03", middleware.includes('"/auth/login": "/login"') && middleware.includes('"/auth/reset-password": "/reset-password"'), "Rutas legacy redirigen a canonicas")
check("MW-04", middleware.includes("createServerClient") && middleware.includes("supabase.auth.getUser()"), "Middleware valida sesion con Supabase Auth")
check("MW-05", middleware.includes('new URL("/login", request.url)'), "No autenticados redirigen a /login")
check("MW-06", !middleware.includes("ADMIN_ROLES") && !middleware.includes("perfil"), "No implementa permisos finos por rol")
check("MW-07", middleware.includes("isPublicAsset") && middleware.includes('pathname.startsWith("/_next/")'), "Assets publicos excluidos")
check("APP-01", appLayout.includes('pathname === "/login"') && appLayout.includes('pathname === "/reset-password"'), "Layout trata rutas canonicas como publicas")
check("APP-02", !appLayout.includes("/auth/login"), "Layout ya no redirige a /auth/login")
check("APP-03", !sidebar.includes("/auth/login"), "Logout redirige a /login")
check("AUTH-01", login.includes('window.location.origin + "/reset-password"'), "Reset usa ruta canonica")
check("AUTH-02", callback.includes('`${origin}/login`'), "Callback fallido vuelve a /login")

for (const item of checks) {
  console.log(`${item.result} ${item.id} ${item.detail}`)
}

if (checks.some((item) => item.result === "FAIL")) {
  process.exit(1)
}
