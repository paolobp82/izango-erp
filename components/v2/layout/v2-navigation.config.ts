import type { ComponentType } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Banknote,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  MapPin,
  Package,
  Palmtree,
  Percent,
  PieChart,
  Presentation,
  Receipt,
  ReceiptText,
  Route,
  Scale,
  Send,
  Shield,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Waypoints,
  HeartPulse,
  LineChart,
} from "lucide-react"

export type V2NavIcon = ComponentType<{ size?: number; strokeWidth?: number }>

export type V2NavItem = {
  label: string
  href: string
  icon: V2NavIcon
  adminOnly?: boolean
}

export type V2NavSection = {
  section: string
  items: V2NavItem[]
}

// Fuente unica de verdad para la navegacion V2.
// La consumen el sidebar (V2Sidebar) y el selector de atajos de la topbar (V2TopbarShortcuts).
// Catalogo auditado contra app/ y el sidebar V1 (components/layout/Sidebar.tsx): solo rutas reales,
// filtradas en cada consumidor con el mismo mecanismo de permisos (puedeVerRuta / isV2Admin).
// No incluye rutas de demo/laboratorio interno (UI V2 Shell, Design System V2, Dashboard V2).
export const V2_NAVIGATION: V2NavSection[] = [
  {
    section: "Inicio",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Mi Trabajo", href: "/tareas", icon: CheckSquare },
      { label: "Calendario", href: "/calendario", icon: CalendarDays },
      { label: "Alertas", href: "/alertas", icon: AlertTriangle },
    ],
  },
  {
    section: "Comercial",
    items: [
      { label: "Dashboard Comercial", href: "/comercial/dashboard", icon: Presentation },
      { label: "CRM", href: "/crm", icon: BriefcaseBusiness },
      { label: "Clientes", href: "/clientes", icon: UsersRound },
      { label: "Biblioteca", href: "/biblioteca", icon: FolderKanban },
      { label: "Biblioteca Medios", href: "/biblioteca-medios", icon: FileText },
    ],
  },
  {
    section: "Operacion",
    items: [
      { label: "Proyectos", href: "/proyectos", icon: FolderKanban },
      { label: "Gestor", href: "/gestor", icon: BarChart3 },
      { label: "Req. Audiovisuales", href: "/audiovisual/requerimientos", icon: Sparkles },
    ],
  },
  {
    section: "Compras y Logistica",
    items: [
      { label: "Proveedores", href: "/proveedores", icon: Store },
      { label: "Inventario", href: "/inventario", icon: Package },
      { label: "Ordenes", href: "/inventario/ordenes", icon: ClipboardList },
      { label: "Ubicaciones", href: "/inventario/ubicaciones", icon: MapPin },
      { label: "Mi Trabajo Logistica", href: "/logistica/mi-trabajo", icon: Route },
      { label: "Traslados", href: "/logistica/traslados", icon: Truck },
      { label: "Envios de Materiales", href: "/envios-materiales", icon: Send },
    ],
  },
  {
    section: "Finanzas",
    items: [
      { label: "Facturacion", href: "/facturacion", icon: ReceiptText },
      { label: "RQ", href: "/rq", icon: FileText },
      { label: "Liquidaciones", href: "/liquidaciones", icon: CircleDollarSign },
      { label: "Caja Chica", href: "/caja-chica", icon: Wallet },
      { label: "Flujo de Caja", href: "/flujo-caja", icon: TrendingUp },
      { label: "Conciliacion", href: "/conciliacion", icon: Scale },
      { label: "Gastos de Oficina", href: "/gastos-oficina", icon: Receipt },
      { label: "Centro de Costos", href: "/centro-costos", icon: PieChart },
    ],
  },
  {
    section: "Finanzas Corporativas",
    items: [
      { label: "Dashboard Financiero", href: "/finanzas/dashboard", icon: LineChart },
      { label: "Tesoreria", href: "/finanzas/tesoreria", icon: Landmark },
      { label: "Cuentas por Cobrar", href: "/finanzas/cuentas-por-cobrar", icon: ArrowDownToLine },
      { label: "Cuentas por Pagar", href: "/finanzas/cuentas-por-pagar", icon: ArrowUpFromLine },
      { label: "Rentabilidad", href: "/finanzas/rentabilidad", icon: Percent },
      { label: "Rentabilidad por Proyecto", href: "/finanzas/centro-costos", icon: Target },
      { label: "Flujo Ejecutivo", href: "/finanzas/flujo-ejecutivo", icon: Activity },
      { label: "Obligaciones Financieras", href: "/prestamos", icon: Banknote },
    ],
  },
  {
    section: "Recursos Humanos",
    items: [
      { label: "Trabajadores", href: "/rrhh/trabajadores", icon: Users },
      { label: "Planilla", href: "/rrhh/planilla", icon: FileSpreadsheet },
      { label: "Permisos", href: "/rrhh/permisos", icon: FileCheck },
      { label: "Horas Extras", href: "/rrhh/horas-extras", icon: Clock3 },
      { label: "Vacaciones", href: "/rrhh/vacaciones", icon: Palmtree },
      { label: "Faltas Medicas", href: "/rrhh/faltas-medicas", icon: HeartPulse },
    ],
  },
  {
    section: "Gestion y Control",
    items: [
      { label: "Reporteria", href: "/reporteria", icon: BarChart3 },
      { label: "Trazabilidad", href: "/trazabilidad", icon: Waypoints },
      { label: "Asistente IA", href: "/ia", icon: Bot },
    ],
  },
  {
    section: "Cuenta",
    items: [
      { label: "Mi Perfil", href: "/perfil", icon: UserRound },
      { label: "Usuarios", href: "/admin/usuarios", icon: Shield },
    ],
  },
]

export function isV2Admin(perfil: string | null | undefined) {
  return ["superadmin", "gerente_general", "controller"].includes(perfil || "")
}
