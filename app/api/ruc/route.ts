import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const ruc = request.nextUrl.searchParams.get("numero")
  if (!ruc || ruc.length !== 11) return NextResponse.json({ error: "RUC invalido" }, { status: 400 })
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, {
      headers: { "Referer": "https://api.apis.net.pe" }
    })
    if (!res.ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Error de conexion" }, { status: 500 })
  }
}