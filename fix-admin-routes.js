const fs = require("fs");

const newContent = `import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY
  if (!url || !key) throw new Error("Supabase admin credentials missing")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, password } = await request.json()
    if (!user_id || !password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: "La contrasena debe tener al menos 6 caracteres" }, { status: 400 })
    const supabaseAdmin = getAdmin()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}`;

fs.writeFileSync("app/api/admin/cambiar-password/route.ts", newContent);

const newContent2 = `import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY
  if (!url || !key) throw new Error("Supabase admin credentials missing")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, nombre, apellido, perfil, entidad } = await request.json()
    if (!email || !password || !nombre || !apellido || !perfil) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }
    const supabaseAdmin = getAdmin()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    const { error: perfilError } = await supabaseAdmin.from("perfiles").insert({
      id: authData.user.id, nombre, apellido, perfil, entidad: entidad || "peru",
    })
    if (perfilError) return NextResponse.json({ error: perfilError.message }, { status: 400 })
    return NextResponse.json({ success: true, user_id: authData.user.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}`;

fs.writeFileSync("app/api/admin/crear-usuario/route.ts", newContent2);
console.log("OK");