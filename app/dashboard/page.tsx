import { createClient } from "@/lib/supabase"
import { ESTADO_PROYECTO_LABELS } from "@/types"
const ESTADO_BADGE: Record<string, string> = {
  pendiente_aprobacion: "badge-yellow", aprobado: "badge-blue",
  en_curso: "badge-green", terminado: "badge-gray",
  facturado: "badge-purple", liquidado: "badge-gray",
}
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
    .eq("entidad", perfil?.entidad || "peru")
    .order("created_at", { ascending: false })
    .limit(10)
  const activos = proyectos?.filter((p: any) => ["aprobado","en_curso"].includes(p.estado)) || []
  const terminados = proyectos?.filter((p: any) => p.estado === "terminado") || []
  const pendientes = proyectos?.filter((p: any) => p.estado === "pendiente_aprobacion") || []
  const { count: rqPendientes } = await supabase.from("requerimientos_pago").select("id", { count: "exact", head: true }).in("estado", ["pendiente_aprobacion","aprobado"])
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
  const { count: cotizacionesMes } = await supabase.from("cotizaciones").select("id", { count: "exact", head: true }).gte("created_at", inicioMes.toISOString())
  const metrics = [
    { label: "Proyectos activos", value: activos.length.toString(), sub: `${pendientes.length} pendientes de aprobacion`, color: "text-izango-600" },
    { label: "Terminados sin liquidar", value: terminados.length.toString(), sub: "Requieren liquidacion", color: terminados.length > 0 ? "text-yellow-600" : "text-gray-700" },
    { label: "RQs pendientes", value: (rqPendientes || 0).toString(), sub: "Por aprobar o pagar", color: (rqPendientes || 0) > 0 ? "text-orange-600" : "text-gray-700" },
    { label: "Cotizaciones del mes", value: (cotizacionesMes || 0).toString(), sub: "Versiones generadas", color: "text-gray-700" },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {perfil?.nombre}</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="card">
            <div className="text-xs text-gray-500 mb-1">{m.label}</div>
            <div className={`text-3xl font-semibold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Proyectos recientes</h2>
          <a href="/proyectos" className="text-xs text-izango-600 hover:underline">Ver todos</a>
        </div>
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th>Fecha inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p: any) => (
              <tr key={p.id}>
                <td className="text-gray-400 font-mono text-xs">{p.codigo}</td>
                <td><a href={`/proyectos/${p.id}`} className="font-medium text-gray-900 hover:text-izango-600">{p.nombre}</a></td>
                <td>{p.cliente?.razon_social || "—"}</td>
                <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                <td><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{ESTADO_PROYECTO_LABELS[p.estado as keyof typeof ESTADO_PROYECTO_LABELS]}</span></td>
                <td className="text-gray-400 text-xs">{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">No hay proyectos aun. <a href="/proyectos/nuevo" className="text-izango-600 hover:underline">Crea el primero</a></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}