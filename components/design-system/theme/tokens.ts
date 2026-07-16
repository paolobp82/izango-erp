export const izing = {
  color: {
    brand: {
      50: "var(--iz-color-brand-50)",
      100: "var(--iz-color-brand-100)",
      400: "var(--iz-color-brand-400)",
      500: "var(--iz-color-brand-500)",
      700: "var(--iz-color-brand-700)",
      900: "var(--iz-color-brand-900)",
    },
    bg: "var(--iz-color-bg)",
    surface: "var(--iz-color-surface)",
    surfaceMuted: "var(--iz-color-surface-muted)",
    text: "var(--iz-color-text)",
    textMuted: "var(--iz-color-text-muted)",
    border: "var(--iz-color-border)",
    danger: "var(--iz-color-danger)",
    warning: "var(--iz-color-warning)",
    info: "var(--iz-color-info)",
    success: "var(--iz-color-success)",
  },
  space: {
    1: "var(--iz-space-1)",
    2: "var(--iz-space-2)",
    3: "var(--iz-space-3)",
    4: "var(--iz-space-4)",
    5: "var(--iz-space-5)",
    6: "var(--iz-space-6)",
    8: "var(--iz-space-8)",
    10: "var(--iz-space-10)",
    12: "var(--iz-space-12)",
  },
  radius: {
    sm: "var(--iz-radius-sm)",
    md: "var(--iz-radius-md)",
    lg: "var(--iz-radius-lg)",
    xl: "var(--iz-radius-xl)",
    full: "var(--iz-radius-full)",
  },
  shadow: {
    sm: "var(--iz-shadow-sm)",
    md: "var(--iz-shadow-md)",
    lg: "var(--iz-shadow-lg)",
  },
  typography: {
    sans: "var(--iz-font-sans)",
    mono: "var(--iz-font-mono)",
  },
} as const

export type IzangoTokens = typeof izing
export type IzangoThemeName = "light" | "dark"
