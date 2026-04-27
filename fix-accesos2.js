const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

// Reemplazar bloque PERFIL
const idxPerfil = c.indexOf("const PERFIL:");
const idxPerfilEnd = c.indexOf("}", idxPerfil) + 1;
const newPERFIL = `const PERFIL: Record<string,string> = {
  superadmin:"Super Administrador",
  gerente_general:"Gerente General",
  administrador:"Administrador",
  controller:"Controller",
  gerente_produccion:"Gerente de Produccion",
  gerente_finanzas:"Gerente de Finanzas",
  productor:"Productor",
  logistica:"Logistica",
  comercial:"Comercial",
  practicante:"Practicante",
}`;
c = c.substring(0, idxPerfil) + newPERFIL + c.substring(idxPerfilEnd);

// Reemplazar bloque ACCESO
const idxAcceso = c.indexOf("const ACCESO:");
const idxAccesoEnd = c.indexOf("}", c.indexOf("}", c.indexOf("}", idxAcceso) + 1) + 1) + 1;
const newACCESO = `const ACCESO: Record<string, string[]> = {
  superadmin: ["*"],
  gerente_general: ["*"],
  administrador: ["/dashboard","/proyectos","/calendario","/clientes","/crm","/proformas","/proveedores","/biblioteca","/rq","/facturacion","/liquidaciones","/conciliacion","/flujo-caja","/centro-costos","/inventario","/rrhh","/ia","/trazabilidad","/alertas","/admin","/perfil"],
  controller: ["/dashboard","/proyectos","/calendario","/clientes","/proformas","/proveedores","/rq","/facturacion","/liquidaciones","/conciliacion","/flujo-caja","/centro-costos","/inventario","/rrhh","/ia","/trazabilidad","/alertas","/perfil"],
  gerente_produccion: ["/dashboard","/proyectos","/calendario","/gestor","/proformas","/biblioteca","/rq","/liquidaciones","/inventario","/rrhh","/ia","/trazabilidad","/alertas","/perfil"],
  gerente_finanzas: ["/dashboard","/proyectos","/rq","/facturacion","/liquidaciones","/conciliacion","/flujo-caja","/centro-costos","/ia","/alertas","/perfil"],
  productor: ["/dashboard","/proyectos","/calendario","/gestor","/proformas","/biblioteca","/rq","/liquidaciones","/ia","/alertas","/rrhh/vacaciones","/rrhh/horas-extras","/rrhh/permisos","/rrhh/faltas-medicas","/perfil"],
  logistica: ["/dashboard","/calendario","/inventario","/rq","/ia","/alertas","/rrhh/vacaciones","/rrhh/horas-extras","/rrhh/permisos","/rrhh/faltas-medicas","/perfil"],
  comercial: ["/dashboard","/proyectos","/calendario","/clientes","/crm","/proformas","/ia","/rrhh/vacaciones","/rrhh/horas-extras","/rrhh/permisos","/rrhh/faltas-medicas","/perfil"],
  practicante: ["/dashboard","/proyectos","/calendario","/gestor","/crm","/proformas","/biblioteca","/ia","/rrhh/vacaciones","/rrhh/horas-extras","/rrhh/permisos","/rrhh/faltas-medicas","/perfil"],
}`;
c = c.substring(0, idxAcceso) + newACCESO + c.substring(idxAccesoEnd);

fs.writeFileSync("components/layout/Sidebar.tsx", c);
console.log("OK - " + c.length);