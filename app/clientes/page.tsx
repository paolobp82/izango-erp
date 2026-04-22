import { createClient } from "@/lib/supabase"
export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: clientes } = await supabase.from("clientes").select("*").eq("entidad", perfil?.entidad || "peru").order("razon_social")
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Clientes</h1><p className="text-sm text-gray-500 mt-0.5">{clientes?.length || 0} clientes registrados</p></div>
        <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
      </div>
      <div className="card p-0 overflow-hidden">
        <table>
          <thead><tr><th>Razon social</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {clientes && clientes.length > 0 ? clientes.map((c: any) => (
              <tr key={c.id}>
                <td><a href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-izango-600">{c.razon_social}</a></td>
                <td className="text-gray-400 font-mono text-xs">{c.ruc || "—"}</td>
                <td>{c.nombre_contacto || "—"}</td>
                <td className="text-gray-400 text-xs">{c.email_contacto || "—"}</td>
                <td><span className={`badge ${c.activo ? "badge-green" : "badge-gray"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
              </tr>
            )) : <tr><td colSpan={5} className="text-center text-gray-400 py-10">No hay clientes. <a href="/clientes/nuevo" className="text-izango-600 hover:underline">Agrega el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}