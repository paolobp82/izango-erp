import type { SystemVariable } from "./SystemConfigurationTypes"

export const SYSTEM_VARIABLES: SystemVariable[] = [
  {
    key: "brand.primary_color",
    value: "#03E373",
    metadata: { description: "Color principal Izango 360." },
  },
  {
    key: "brand.dark_green",
    value: "#0F6E56",
    metadata: { description: "Color institucional secundario." },
  },
  {
    key: "system.locale",
    value: "es-PE",
    metadata: { description: "Locale operativo por defecto." },
  },
  {
    key: "system.currency",
    value: "PEN",
    metadata: { description: "Moneda funcional por defecto." },
  },
]
