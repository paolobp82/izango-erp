const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

const oldPERFIL = `const PERFIL: Record<string,string> = {
  gerente_general:"Gerente General", comercial:"Comercial",
  gerente_produccion:"Gerente de Produccion", productor:"Productor",
  administrador:"Administrador", gerente_finanzas:"Gerente de Finanzas",
}`;

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

const oldACCESO = `const ACCESO: Record<string, string[]> = {
  gerente_general: ["*"],
  gerente_produccion: ["/dashboard","/proyectos","/calendario","/gestor","/proformas","/biblioteca","/rq","/liquidaciones","/trazabilidad","/alertas","/inventario","/perfil"],
  comercial: ["/dashboard","/proyectos","/calendario","/clientes","/crm","/proformas","/perfil"],
  productor: ["/dashboard","/proyectos","/calendario","/gestor","/rq","/alertas","/inventario","/perfil"],
  administrador: ["/dashboard","/clientes","/proveedores","/facturacion","/liquidaciones","/alertas","/inventario","/perfil"],
  gerente_finanzas: ["/dashboard","/rq","/facturacion","/liquidaciones","/flujo-caja","/proyectos","/alertas","/perfil"],
}`;

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

if (c.includes(oldPERFIL) && c.includes(oldACCESO)) {
  c = c.replace(oldPERFIL, newPERFIL);
  c = c.replace(oldACCESO, newACCESO);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("PERFIL found:", c.includes(oldPERFIL));
  console.log("ACCESO found:", c.includes(oldACCESO));
}