import { SystemConfiguration } from "./SystemConfigurationEngine"

const FALLBACK = {
  pendiente_aprobacion:{label:"Pendiente"},
  aprobado_produccion:{label:"Aprobado Prod."},
  aprobado:{label:"Aprobado"},
  aprobado_gerencia:{label:"Aprobado Gerencia"},
  aprobado_cliente:{label:"Aprobado Cliente"},
  en_curso:{label:"En curso"},
  terminado:{label:"Terminado"},
  liquidado:{label:"Liquidado"},
  cerrado_financiero:{label:"Cerrado Financiero"}
}

export function getProyectoEstadosVisuales(){
  return FALLBACK
}
