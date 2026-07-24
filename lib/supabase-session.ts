import type { SupabaseClient } from "@supabase/supabase-js"

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as { message?: unknown; name?: unknown; code?: unknown }
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : ""
  const name = typeof candidate.name === "string" ? candidate.name : ""
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : ""

  return (
    name === "AuthApiError" &&
    (code === "refresh_token_not_found" ||
      (code === "validation_failed" && message.includes("refresh token")) ||
      (message.includes("invalid refresh token") && message.includes("refresh token not found")))
  )
}

export function isSupabaseSessionCookie(name: string) {
  return name.startsWith("sb-") && (name.includes("auth-token") || name.includes("code-verifier"))
}

export async function clearBrowserSupabaseSession(supabase: SupabaseClient) {
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch {}

  if (typeof window === "undefined") return

  clearBrowserStorage(window.localStorage)
  clearBrowserStorage(window.sessionStorage)

  document.cookie
    .split(";")
    .map(cookie => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name) && isSupabaseSessionCookie(name))
    .forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`
    })
}

function clearBrowserStorage(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && isSupabaseSessionCookie(key)) keys.push(key)
  }
  keys.forEach(key => storage.removeItem(key))
}

