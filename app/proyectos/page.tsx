import { createClient } from "@/lib/supabase"
import { ESTADO_PROYECTO_LABELS } from "@/types"
const ESTADO_BADGE: Record<string, string> = {
  pendiente_aprobacion: "badge-yellow", aprobado: "badge-blue",
  en_curso: "badge-green", terminado: "badge-gray", facturado: "badge-purple", liquidado: "badge-gray",
}
export default async function ProyectosPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido), cotizaciones(total_cliente,margen_pct,estado)")
    .eq("entidad", perfil?.entidad || "peru")
    .order("created_at", { ascending: false })
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{proyectos?.length || 0} proyectos en total</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div className="card p-0 overflow-hidden">
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th className="text-right">Presupuesto</th><th className="text-right">Margen</th><th>Inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p: any) => {
              const cot = p.cotizaciones?.find((c: any) => c.estado === "aprobada_cliente") || p.cotizaciones?.[0]
              const margen = cot?.margen_pct || 0
              return (
                <tr key={p.id}>
                  <td className="text-gray-400 font-mono text-xs">{p.codigo}</td>
                  <td><a href={`/proyectos/${p.id}`} className="font-medium text-gray-900 hover:text-izango-600">{p.nombre}</a></td>
                  <td>{p.cliente?.razon_social || "—"}</td>
                  <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{ESTADO_PROYECTO_LABELS[p.estado as keyof typeof ESTADO_PROYECTO_LABELS]}</span></td>
                  <td className="text-right font-medium">{cot?.total_cliente ? "S/ " + Number(cot.total_cliente).toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td className="text-right">{margen > 0 ? <span className={`font-medium ${margen >= 35 ? "text-green-600" : margen >= 20 ? "text-yellow-600" : "text-red-600"}`}>{Number(margen).toFixed(1)}%</span> : "—"}</td>
                  <td className="text-gray-400 text-xs">{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
                </tr>
              )
            }) : <tr><td colSpan={8} className="text-center text-gray-400 py-10">No hay proyectos. <a href="/proyectos/nuevo" className="text-izango-600 hover:underline">Crea el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}