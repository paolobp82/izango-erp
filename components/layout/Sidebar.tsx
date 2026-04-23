import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
const navItems = [
  { section: "Principal", items: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Proyectos", href: "/proyectos" },
    { label: "Calendario", href: "/calendario" },
    { label: "Gestor", href: "/gestor" },
    { label: "Clientes", href: "/clientes" },
    { label: "CRM", href: "/crm" },
  ]},
  { section: "Comercial", items: [
    { label: "Proformas", href: "/proformas" },
    { label: "Proveedores", href: "/proveedores" },
    { label: "Biblioteca", href: "/biblioteca" },
  ]},
  { section: "Finanzas", items: [
    { label: "Req. de pago", href: "/rq" },
    { label: "Facturacion", href: "/facturacion" },
    { label: "Liquidaciones", href: "/liquidaciones" },
  ]},
  { section: "Administracion", items: [
    { label: "Trazabilidad", href: "/trazabilidad" },
    { label: "Alertas", href: "/alertas" },
  ]},
]
const ENTIDAD: Record<string,string> = { peru: "Izango Peru", selva: "Izango Selva" }
const PERFIL: Record<string,string> = {
  gerente_general:"Gerente General", comercial:"Comercial",
  gerente_produccion:"Gerente de Produccion", productor:"Productor",
  administrador:"Administrador", gerente_finanzas:"Gerente de Finanzas",
}
export default function Sidebar({ perfil }: { perfil: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function logout() { await supabase.auth.signOut(); router.push("/auth/login") }
  const initials = `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
  return (
    <aside style={{width:224,background:"#fff",borderRight:"1px solid #f3f4f6",display:"flex",flexDirection:"column",height:"100vh",position:"fixed",left:0,top:0}}>
      <div style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,background:"#1D9E75",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:12}}>iz</span>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>Izango</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>
        </div>
      </div>
      <nav style={{flex:1,overflowY:"auto",padding:"16px 12px"}}>
        {navItems.map(s => (
          <div key={s.section} style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:500,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",padding:"0 8px",marginBottom:4}}>{s.section}</div>
            {s.items.map(item => (
              <a key={item.href} href={item.href}
                className={`sidebar-item${pathname.startsWith(item.href) ? " active" : ""}`}>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div style={{padding:"12px",borderTop:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 8px",marginBottom:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#04342C",flexShrink:0}}>{initials}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{perfil.nombre} {perfil.apellido}</div>
            <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{PERFIL[perfil.perfil]}</div>
          </div>
        </div>
        <button onClick={logout} style={{width:"100%",textAlign:"left",fontSize:12,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:6}}>Cerrar sesion</button>
      </div>
    </aside>
  )

}
