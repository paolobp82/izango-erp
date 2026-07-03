import type { FeatureFlag } from "./SystemConfigurationTypes"

export const SYSTEM_FEATURES: FeatureFlag[] = [
  { key: "features.ia", enabled: true },
  { key: "features.audiovisual", enabled: true },
  { key: "features.finanzas_corporativas", enabled: true },
  { key: "features.configuration_ui", enabled: false }
]
