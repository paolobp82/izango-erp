import React, { useState } from "react";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, Search,
  RefreshCw, FileText, Send, Calendar, Building, Sparkles
} from "lucide-react";
import { CRMClient, CRMInvoice } from "../types";

interface FinanceModuleProps {
  clients: CRMClient[];
  setClients: React.Dispatch<React.SetStateAction<CRMClient[]>>;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export function FinanceModule({
  clients,
  setClients,
  isDarkMode,
  showToast
}: FinanceModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending">("All");

  // Compile all invoices
  const allInvoices = clients.flatMap(c =>
    c.invoices.map(i => ({
      ...i,
      clientName: c.name,
      clientId: c.id
    }))
  );

  // Compute metrics
  const paidInvoicesTotal = allInvoices
    .filter(i => i.status === "Paid")
    .reduce((acc, i) => acc + i.amount, 0);

  const pendingInvoicesTotal = allInvoices
    .filter(i => i.status === "Pending")
    .reduce((acc, i) => acc + i.amount, 0);

  const totalBilling = paidInvoicesTotal + pendingInvoicesTotal;
  const opExpenditures = Math.round(paidInvoicesTotal * 0.45); // Operational Cost representation (45%)

  // Filter invoices
  const filteredInvoices = allInvoices.filter(i => {
    const matchesSearch = i.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action: mark invoice as Paid
  const handleMarkAsPaid = (clientId: string, invoiceId: string, amount: number) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        // Mark paid
        const updatedInvoices = c.invoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: "Paid" as const } : inv
        );
        // Decrease pendingDebt
        const nextDebt = Math.max(c.pendingDebt - amount, 0);
        const nextDebtLabel = nextDebt > 0 ? c.pendingDebtLabel : "Al día con pagos";
        // Boost LTV because payment is collected successfully
        const nextLTV = c.ltv + amount;

        return {
          ...c,
          invoices: updatedInvoices,
          pendingDebt: nextDebt,
          pendingDebtLabel: nextDebtLabel,
          ltv: nextLTV,
          activities: [
            {
              id: "act-pay-" + Date.now(),
              type: "check",
              title: `Pago Recibido de Factura ${invoiceId}`,
              description: `Se procesó la cobranza exitosa de $${amount.toLocaleString()} por el concepto de "${c.invoices.find(i => i.id === invoiceId)?.concept}".`,
              timestamp: "Hace unos instantes",
              owner: "Pasarela Finanzas ERP"
            },
            ...c.activities
          ]
        };
      }
      return c;
    }));

    showToast(`Factura ${invoiceId} cobrada. LTV comercial incrementado.`);
  };

  // Action: simulate email alert
  const handleSendCollectionEmail = (clientName: string, amount: number) => {
    showToast(`ZIGI AI ha redactado y despachado un recordatorio de pago formal a ${clientName} por $${amount.toLocaleString()}!`);
  };

  // Accounts requiring collections
  const overdueAccounts = clients.filter(c => c.pendingDebt > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#75ff9e] bg-slate-900 p-1.5 rounded-lg text-lg">receipt_long</span>
            Finanzas y Control de Facturación
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Supervisa el flujo de caja, liquida facturas pendientes y gestiona las cobranzas pendientes.
          </p>
        </div>
      </div>

      {/* Cash Flow Visualizer */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          Proyección Analítica de Flujo de Caja
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">Inflows (Efectivo Cobrado)</p>
            <p className="text-xl font-black text-emerald-900">${paidInvoicesTotal.toLocaleString()}</p>
            <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: "100%" }}></div>
            </div>
            <p className="text-[9px] text-emerald-600 font-semibold">100% liquidados y acreditados</p>
          </div>

          <div className="space-y-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-[10px] text-amber-700 font-black uppercase tracking-wider">Receivables (Cuentas por Cobrar)</p>
            <p className="text-xl font-black text-amber-900">${pendingInvoicesTotal.toLocaleString()}</p>
            <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${Math.round((pendingInvoicesTotal / (totalBilling || 1)) * 100)}%` }}></div>
            </div>
            <p className="text-[9px] text-amber-600 font-semibold">Pendiente de depósito y cobro</p>
          </div>

          <div className="space-y-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-[10px] text-indigo-700 font-black uppercase tracking-wider">Outflows (Egresos Operativos 45%)</p>
            <p className="text-xl font-black text-indigo-900">${opExpenditures.toLocaleString()}</p>
            <div className="w-full h-1.5 bg-indigo-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600" style={{ width: "45%" }}></div>
            </div>
            <p className="text-[9px] text-indigo-600 font-semibold">Gasto técnico y administrativo</p>
          </div>

        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: General Invoices registry Ledger */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Libro Contable de Facturas Emitidas
            </h3>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar concepto o cliente..."
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-40 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-black uppercase">
                {(["All", "Paid", "Pending"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statusFilter === f ? "bg-white text-slate-900 shadow-3xs" : "text-slate-400"
                    }`}
                  >
                    {f === "All" ? "Todos" : f === "Paid" ? "Pagados" : "Pendientes"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                <tr>
                  <th className="px-5 py-3">ID Factura</th>
                  <th className="px-5 py-3">Concepto / Servicio</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Emisión</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                  <th className="px-5 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">
                      No hay comprobantes de facturación que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900">{inv.id}</td>
                      <td className="px-5 py-3 truncate max-w-[150px]" title={inv.concept}>{inv.concept}</td>
                      <td className="px-5 py-3">
                        <span className="text-slate-900 font-bold">{inv.clientName.split(" ")[0]}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{inv.billingDate}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status === "Paid" ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {inv.status === "Pending" ? (
                          <button
                            onClick={() => handleMarkAsPaid(inv.clientId, inv.id, inv.amount)}
                            className="px-2 py-1 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg transition-colors cursor-pointer"
                          >
                            Liquidar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Conciliado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Overdue Accounts alerts & Automated Collections */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                Gestión de Cobros Vencidos
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mb-4 leading-normal">
                Compañías con facturación pendiente. Utiliza ZIGI AI para disparar recordatorios de cobranza formales.
              </p>

              <div className="space-y-3">
                {overdueAccounts.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-center rounded-xl font-bold text-xs">
                    🎉 ¡Excelente! Todas las cuentas de clientes están 100% al día con sus pagos.
                  </div>
                ) : (
                  overdueAccounts.map(c => (
                    <div
                      key={c.id}
                      className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 text-xs truncate leading-tight">{c.name}</p>
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">Pendiente: ${c.pendingDebt.toLocaleString()}</p>
                      </div>

                      <button
                        onClick={() => handleSendCollectionEmail(c.name, c.pendingDebt)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white hover:text-emerald-400 font-black rounded-lg transition-all text-[9px] flex items-center gap-1 cursor-pointer shrink-0"
                        title="Enviar correo de recordatorio"
                      >
                        <Send className="w-3 h-3" />
                        AI Recordatorio
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="text-[10px] uppercase font-black text-slate-900">Pasarela Conciliadora</span>
              </div>
              <p className="text-[10px] text-slate-600 font-semibold leading-normal">
                Todas las liquidaciones de cobros hechas en este panel actualizan en tiempo real el LTV de la cuenta y la caja consolidada corporativa.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
