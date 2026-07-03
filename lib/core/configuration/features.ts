import type { FeatureFlag } from "./SystemConfigurationTypes"

export const SYSTEM_FEATURES: FeatureFlag[] = [
  {
    key: "configuration.engine.static_v1",
    enabled: true,
    description: "Habilita lectura estatica inicial del System Configuration Engine.",
  },
  {
    key: "crm.lifecycle_engine",
    enabled: false,
    description: "Reserva futura para migrar CRM al Lifecycle Engine.",
  },
  {
    key: "rq.workflow_configuration",
    enabled: false,
    description: "Reserva futura para gobernar estados RQ desde configuracion.",
  },
]
