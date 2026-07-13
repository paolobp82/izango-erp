import { FACTURAS_COBRADAS, FACTURAS_PENDIENTES, dueDateValue, financeNumber } from "@/lib/finance"
import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import { ymdTreasury } from "@/lib/domain/treasury"
import {
  TREASURY_COMPANIES,
  type FinancialCompanySummary,
  type FinancialDailyClose,
  type FinancialDashboardAlert,
  type FinancialDashboardInputs,
  type FinancialDashboardInvoice,
  type FinancialDashboardModel,
  type FinancialDashboardParameter,
  type TreasuryCompany,
  type TreasuryLiquidityStatus,
} from "./dashboard-financial.types"
import { resolveInvoiceCompany } from "./dashboard-financial.data"

const PAYMENT_CATEGORIES = ["Producción", "Personal", "Administrativo", "Servicios", "Impuestos", "Alquiler", "Otros"]

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sameDate(value: string | null | undefined, fecha: string) {
  return ymdTreasury(value) === fecha
}

function paymentDate(item: TreasuryPaymentItem) {
  return ymdTreasury(item.fecha_programada_pago) || ymdTreasury(item.fecha_necesidad_pago) || ymdTreasury(item.fecha_pago)
}

function invoiceAmount(invoice: FinancialDashboardInvoice) {
  const final = financeNumber(invoice.monto_final_abonado)
  if (final > 0) return final
  return financeNumber(invoice.subtotal) + financeNumber(invoice.igv)
}

function isPendingInvoice(invoice: FinancialDashboardInvoice) {
  return FACTURAS_PENDIENTES.includes(String(invoice.estado || ""))
}

function isCollectedInvoice(invoice: FinancialDashboardInvoice) {
  return FACTURAS_COBRADAS.includes(String(invoice.estado || ""))
}

function categoryOf(item: TreasuryPaymentItem) {
  const raw = String(item.categoria || item.origen || "").toLowerCase()
  if (raw.includes("produ")) return "Producción"
  if (raw.includes("personal") || raw.includes("sueldo") || raw.includes("planilla")) return "Personal"
  if (raw.includes("serv")) return "Servicios"
  if (raw.includes("imp") || raw.includes("detrac") || raw.includes("afp")) return "Impuestos"
  if (raw.includes("alquiler")) return "Alquiler"
  if (raw.includes("admin") || raw.includes("oficina") || raw.includes("obligacion") || raw.includes("prestamo")) return "Administrativo"
  if (item.origen === "rqp") return "Producción"
  return "Otros"
}

function companyParam(parameters: FinancialDashboardParameter[], empresa: TreasuryCompany) {
  return parameters.find(param => param.empresa === empresa)
}

function liquidityStatus(cajaFinal: number, minimo: number, seguridad: number, hasBalance: boolean, hasParameters: boolean): TreasuryLiquidityStatus {
  if (!hasBalance) return "sin_datos"
  if (!hasParameters) return "sin_configurar"
  if (cajaFinal < minimo) return "deficit"
  if (cajaFinal < seguridad) return "atencion"
  return "saludable"
}

function sum(values: number[]) {
  return roundMoney(values.reduce((total, value) => total + value, 0))
}

function createCompanySummary(inputs: FinancialDashboardInputs, empresa: TreasuryCompany): FinancialCompanySummary {
  const balances = inputs.balances.filter(balance => balance.empresa === empresa)
  const param = companyParam(inputs.parameters, empresa)
  const invoices = inputs.invoices.filter(invoice => resolveInvoiceCompany(invoice) === empresa)
  const payments = inputs.payments.filter(payment => (payment.empresa || "Izango 360") === empresa)

  const cajaInicial = sum(balances.map(balance => balance.saldo_inicial))
  const nivelMinimo = balances.find(balance => balance.nivel_minimo != null)?.nivel_minimo ?? param?.nivel_minimo ?? 0
  const nivelSeguridad = balances.find(balance => balance.nivel_seguridad != null)?.nivel_seguridad ?? param?.nivel_seguridad ?? 0

  const ingresosEsperados = sum(invoices
    .filter(isPendingInvoice)
    .filter(invoice => sameDate(dueDateValue(invoice), inputs.fecha))
    .map(invoiceAmount))

  const ingresosConfirmados = sum(invoices
    .filter(isCollectedInvoice)
    .filter(invoice => sameDate(invoice.fecha_abono, inputs.fecha))
    .map(invoiceAmount))

  const pagosProgramados = sum(payments
    .filter(payment => !["pagado", "anulado"].includes(payment.estado_pago))
    .filter(payment => paymentDate(payment) === inputs.fecha)
    .map(payment => payment.monto))

  const pagosEjecutados = sum(payments
    .filter(payment => payment.estado_pago === "pagado")
    .filter(payment => sameDate(payment.fecha_pago, inputs.fecha))
    .map(payment => payment.monto))

  const produccionDia = sum(payments
    .filter(payment => categoryOf(payment) === "Producción")
    .filter(payment => paymentDate(payment) === inputs.fecha)
    .map(payment => payment.monto))

  const cajaDisponible = roundMoney(cajaInicial + ingresosConfirmados - pagosEjecutados)
  const cajaFinalProyectada = roundMoney(cajaInicial + ingresosConfirmados - pagosProgramados)
  const necesidadFondeo = roundMoney(Math.max(0, -cajaFinalProyectada))
  const excedente = roundMoney(Math.max(0, cajaFinalProyectada - nivelSeguridad))
  const excedenteNecesidad = roundMoney(cajaFinalProyectada - nivelSeguridad)
  const hasBalance = balances.length > 0
  const hasParameters = Boolean(param || balances.some(balance => balance.nivel_minimo != null || balance.nivel_seguridad != null))

  return {
    empresa,
    cajaInicial,
    ingresosEsperados,
    ingresosConfirmados,
    pagosProgramados,
    pagosEjecutados,
    produccionDia,
    cajaDisponible,
    cajaFinalProyectada,
    necesidadFondeo,
    excedente,
    excedenteNecesidad,
    nivelMinimo,
    nivelSeguridad,
    estadoLiquidez: liquidityStatus(cajaFinalProyectada, nivelMinimo, nivelSeguridad, hasBalance, hasParameters),
    hasBalance,
    hasParameters,
  }
}

function createTotalSummary(summaries: FinancialCompanySummary[]): FinancialCompanySummary {
  const cajaInicial = sum(summaries.map(summary => summary.cajaInicial))
  const ingresosEsperados = sum(summaries.map(summary => summary.ingresosEsperados))
  const ingresosConfirmados = sum(summaries.map(summary => summary.ingresosConfirmados))
  const pagosProgramados = sum(summaries.map(summary => summary.pagosProgramados))
  const pagosEjecutados = sum(summaries.map(summary => summary.pagosEjecutados))
  const produccionDia = sum(summaries.map(summary => summary.produccionDia))
  const cajaDisponible = roundMoney(cajaInicial + ingresosConfirmados - pagosEjecutados)
  const cajaFinalProyectada = roundMoney(cajaInicial + ingresosConfirmados - pagosProgramados)
  const nivelMinimo = sum(summaries.map(summary => summary.nivelMinimo))
  const nivelSeguridad = sum(summaries.map(summary => summary.nivelSeguridad))
  const hasBalance = summaries.some(summary => summary.hasBalance)
  const hasParameters = summaries.every(summary => summary.hasParameters)

  return {
    empresa: "Total Grupo",
    cajaInicial,
    ingresosEsperados,
    ingresosConfirmados,
    pagosProgramados,
    pagosEjecutados,
    produccionDia,
    cajaDisponible,
    cajaFinalProyectada,
    necesidadFondeo: roundMoney(Math.max(0, -cajaFinalProyectada)),
    excedente: roundMoney(Math.max(0, cajaFinalProyectada - nivelSeguridad)),
    excedenteNecesidad: roundMoney(cajaFinalProyectada - nivelSeguridad),
    nivelMinimo,
    nivelSeguridad,
    estadoLiquidez: liquidityStatus(cajaFinalProyectada, nivelMinimo, nivelSeguridad, hasBalance, hasParameters),
    hasBalance,
    hasParameters,
  }
}

function createRebalance(summaries: FinancialCompanySummary[]) {
  const deficits = summaries
    .filter(summary => summary.empresa !== "Total Grupo")
    .filter(summary => summary.necesidadFondeo > 0)
    .sort((a, b) => b.necesidadFondeo - a.necesidadFondeo)
  const excedents = summaries
    .filter(summary => summary.empresa !== "Total Grupo")
    .filter(summary => summary.excedente > 0)
    .sort((a, b) => b.excedente - a.excedente)

  const deficit = deficits[0]
  const excedent = excedents[0]
  const totalDeficit = sum(deficits.map(item => item.necesidadFondeo))
  const totalExcedent = sum(excedents.map(item => item.excedente))
  const amount = deficit && excedent ? roundMoney(Math.min(deficit.necesidadFondeo, excedent.excedente)) : 0
  const externalFunding = roundMoney(Math.max(0, totalDeficit - totalExcedent))

  if (!deficit) {
    return {
      amount: 0,
      externalFunding: 0,
      message: "No se detecta deficit de caja para la fecha seleccionada.",
    }
  }

  if (!excedent || amount <= 0) {
    return {
      to: deficit.empresa as TreasuryCompany,
      amount: 0,
      externalFunding,
      message: `Se requiere fondeo externo por S/ ${externalFunding.toLocaleString("es-PE", { maximumFractionDigits: 0 })}.`,
    }
  }

  return {
    from: excedent.empresa as TreasuryCompany,
    to: deficit.empresa as TreasuryCompany,
    amount,
    externalFunding,
    message: `Transferir S/ ${amount.toLocaleString("es-PE", { maximumFractionDigits: 0 })} desde ${excedent.empresa} hacia ${deficit.empresa}.`,
  }
}

function createAlerts(total: FinancialCompanySummary, summaries: FinancialCompanySummary[], vencidos: TreasuryPaymentItem[], errors: string[]) {
  const alerts: FinancialDashboardAlert[] = []
  const negative = summaries.find(summary => summary.cajaFinalProyectada < 0)

  alerts.push(negative
    ? { title: "Caja negativa detectada", detail: `${negative.empresa} queda con caja final negativa.`, level: "critical" }
    : { title: "Caja negativa detectada", detail: "OK", level: "ok" })

  alerts.push(vencidos.length > 0
    ? { title: "Pagos vencidos pendientes", detail: `${vencidos.length} pagos vencidos por revisar.`, level: "warning" }
    : { title: "Pagos vencidos pendientes", detail: "OK", level: "ok" })

  const underSecurity = summaries.find(summary => summary.estadoLiquidez === "atencion")
  alerts.push(underSecurity
    ? { title: "Empresa bajo nivel de seguridad", detail: `${underSecurity.empresa} esta bajo su nivel de seguridad.`, level: "warning" }
    : { title: "Empresa bajo nivel de seguridad", detail: "OK", level: "ok" })

  alerts.push(total.necesidadFondeo > 0
    ? { title: "Necesidad de fondeo del grupo", detail: `Requiere cobertura por S/ ${total.necesidadFondeo.toLocaleString("es-PE", { maximumFractionDigits: 0 })}.`, level: "critical" }
    : { title: "Necesidad de fondeo del grupo", detail: "OK", level: "ok" })

  alerts.push(total.estadoLiquidez === "deficit"
    ? { title: "Liquidez general del grupo", detail: "Caja consolidada negativa o bajo minimo.", level: "critical" }
    : { title: "Liquidez general del grupo", detail: total.estadoLiquidez === "sin_datos" ? "Sin saldos configurados para la fecha." : "OK", level: total.estadoLiquidez === "sin_datos" ? "warning" : "ok" })

  if (errors.length > 0) {
    alerts.push({ title: "Datos incompletos", detail: errors.join(" | "), level: "warning" })
  }

  return alerts
}

function buildHistory(inputs: FinancialDashboardInputs, summaries: FinancialCompanySummary[], total: FinancialCompanySummary): FinancialDailyClose[] {
  const current: FinancialDailyClose[] = [...summaries, total].map(summary => ({
    fecha: inputs.fecha,
    empresa: summary.empresa,
    caja_final_proyectada: summary.cajaFinalProyectada,
    caja_disponible: summary.cajaDisponible,
    estado_liquidez: summary.estadoLiquidez,
  }))

  const keys = new Set(inputs.history.map(item => `${item.fecha}:${item.empresa}`))
  return [...inputs.history, ...current.filter(item => !keys.has(`${item.fecha}:${item.empresa}`))]
}

export function buildFinancialDashboardModel(inputs: FinancialDashboardInputs): FinancialDashboardModel {
  const summaries = TREASURY_COMPANIES.map(empresa => createCompanySummary(inputs, empresa))
  const total = createTotalSummary(summaries)
  const vencidos = inputs.payments.filter(payment => payment.estado_pago === "vencido")
  const byCategory = new Map<string, number>()

  for (const category of PAYMENT_CATEGORIES) byCategory.set(category, 0)
  for (const payment of inputs.payments) {
    if (payment.estado_pago === "pagado" || payment.estado_pago === "anulado") continue
    if (paymentDate(payment) !== inputs.fecha) continue
    const category = categoryOf(payment)
    byCategory.set(category, roundMoney((byCategory.get(category) || 0) + payment.monto))
  }

  const produccion = byCategory.get("Producción") || 0
  const pagosCategoriaTotal = sum(Array.from(byCategory.values()))

  const rebalance = createRebalance(summaries)

  return {
    fecha: inputs.fecha,
    summaries,
    total,
    kpis: {
      cajaInicialTotal: total.cajaInicial,
      ingresosEsperadosHoy: total.ingresosEsperados,
      ingresosConfirmadosHoy: total.ingresosConfirmados,
      pagosProgramadosHoy: total.pagosProgramados,
      pagosEjecutadosHoy: total.pagosEjecutados,
      produccionDia: total.produccionDia,
      cajaDisponibleAhora: total.cajaDisponible,
      cajaFinalProyectada: total.cajaFinalProyectada,
      necesidadFondeo: total.necesidadFondeo,
      transferenciaRecomendada: rebalance.amount,
      liquidezGrupo: total.estadoLiquidez,
      pagosVencidos: vencidos.length,
      montoVencido: sum(vencidos.map(payment => payment.monto)),
    },
    rebalance,
    alerts: createAlerts(total, summaries, vencidos, inputs.errors),
    paymentsByCategory: PAYMENT_CATEGORIES.map(categoria => ({ categoria, monto: byCategory.get(categoria) || 0 })),
    productionVsOther: {
      produccion,
      otros: roundMoney(Math.max(0, pagosCategoriaTotal - produccion)),
    },
    history: buildHistory(inputs, summaries, total),
    sources: {
      balances: inputs.balances.length,
      invoices: inputs.invoices.length,
      payments: inputs.payments.length,
      closes: inputs.history.length,
      errors: inputs.errors,
    },
  }
}
