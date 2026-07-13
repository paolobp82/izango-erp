import type { TreasuryPaymentItem } from "@/lib/domain/treasury"

export const TREASURY_COMPANIES = ["Izango 360", "Izango Selva", "Caja Chica"] as const
export type TreasuryCompany = typeof TREASURY_COMPANIES[number]
export type TreasuryCompanyOrGroup = TreasuryCompany | "Total Grupo"

export type TreasuryLiquidityStatus = "saludable" | "atencion" | "deficit" | "sin_configurar" | "sin_datos"
export type TreasuryAlertLevel = "ok" | "warning" | "critical"

export type FinancialDashboardBalance = {
  id?: string
  fecha: string
  empresa: TreasuryCompany
  cuenta: string
  saldo_inicial: number
  nivel_minimo?: number | null
  nivel_seguridad?: number | null
}

export type FinancialDashboardParameter = {
  empresa: TreasuryCompany
  cuenta: string
  nivel_minimo: number
  nivel_seguridad: number
}

export type FinancialDashboardInvoice = {
  id: string
  numero_factura?: string | null
  estado?: string | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
  fecha_abono?: string | null
  monto_final_abonado?: number | null
  subtotal?: number | null
  igv?: number | null
  entidad_factoring?: string | null
  tipo_cobro?: string | null
}

export type FinancialDashboardInputs = {
  fecha: string
  balances: FinancialDashboardBalance[]
  parameters: FinancialDashboardParameter[]
  invoices: FinancialDashboardInvoice[]
  payments: TreasuryPaymentItem[]
  history: FinancialDailyClose[]
  errors: string[]
}

export type FinancialDailyClose = {
  id?: string
  fecha: string
  empresa: TreasuryCompanyOrGroup
  caja_final_proyectada: number
  caja_disponible: number
  estado_liquidez: TreasuryLiquidityStatus | string
}

export type FinancialCompanySummary = {
  empresa: TreasuryCompanyOrGroup
  cajaInicial: number
  ingresosEsperados: number
  ingresosConfirmados: number
  pagosProgramados: number
  pagosEjecutados: number
  produccionDia: number
  cajaDisponible: number
  cajaFinalProyectada: number
  necesidadFondeo: number
  excedente: number
  excedenteNecesidad: number
  nivelMinimo: number
  nivelSeguridad: number
  estadoLiquidez: TreasuryLiquidityStatus
  hasBalance: boolean
  hasParameters: boolean
}

export type TreasuryRebalanceRecommendation = {
  from?: TreasuryCompany
  to?: TreasuryCompany
  amount: number
  externalFunding: number
  message: string
}

export type FinancialDashboardAlert = {
  title: string
  detail: string
  level: TreasuryAlertLevel
}

export type FinancialDashboardModel = {
  fecha: string
  summaries: FinancialCompanySummary[]
  total: FinancialCompanySummary
  kpis: {
    cajaInicialTotal: number
    ingresosEsperadosHoy: number
    ingresosConfirmadosHoy: number
    pagosProgramadosHoy: number
    pagosEjecutadosHoy: number
    produccionDia: number
    cajaDisponibleAhora: number
    cajaFinalProyectada: number
    necesidadFondeo: number
    transferenciaRecomendada: number
    liquidezGrupo: TreasuryLiquidityStatus
    pagosVencidos: number
    montoVencido: number
  }
  rebalance: TreasuryRebalanceRecommendation
  alerts: FinancialDashboardAlert[]
  paymentsByCategory: Array<{ categoria: string; monto: number }>
  productionVsOther: { produccion: number; otros: number }
  history: FinancialDailyClose[]
  sources: {
    balances: number
    invoices: number
    payments: number
    closes: number
    errors: string[]
  }
}
