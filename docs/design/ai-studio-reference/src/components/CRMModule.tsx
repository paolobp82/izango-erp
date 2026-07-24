import React, { useState } from "react";
import {
  Sparkles, DollarSign, Building, User, Target, ChevronRight, Plus,
  TrendingUp, Search, Layers, UserCheck, AlertCircle
} from "lucide-react";
import { CRMClient } from "../types";

interface CRMModuleProps {
  clients: CRMClient[];
  setClients: React.Dispatch<React.SetStateAction<CRMClient[]>>;
  onSelectClient: (clientId: string) => void;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export function CRMModule({
  clients,
  setClients,
  onSelectClient,
  isDarkMode,
  showToast
}: CRMModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("Todos");
  
  // States for Quick Add Opportunity Form
  const [targetClientId, setTargetClientId] = useState(clients[0]?.id || "");
  const [newOppAmount, setNewOppAmount] = useState("45000");
  const [newOppName, setNewOppName] = useState("Ampliación Licencias Cloud");

  const sectors = ["Todos", ...Array.from(new Set(clients.map(c => c.sector)))];

  // Global totals
  const totalPipeline = clients.reduce((acc, c) => acc + c.pipelineOpen, 0);
  const totalDeals = clients.reduce((acc, c) => acc + c.pipelineOppsCount, 0);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.kam.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === "Todos" || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  // Handle Quick Add Opportunity
  const handleQuickAddOpp = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newOppAmount);
    if (!targetClientId || isNaN(amount) || amount <= 0) {
      showToast("Por favor, ingresa un monto válido.");
      return;
    }

    setClients(prev => prev.map(c => {
      if (c.id === targetClientId) {
        return {
          ...c,
          pipelineOpen: c.pipelineOpen + amount,
          pipelineOppsCount: c.pipelineOppsCount + 1,
          activities: [
            {
              id: "act-opp-quick-" + Date.now(),
              type: "email",
              title: `Oportunidad Registrada: ${newOppName}`,
              description: `Se añadió una nueva oportunidad de venta por un valor de $${amount.toLocaleString()} al pipeline.`,
              timestamp: "Hace unos instantes",
              owner: "Paolo Bastianelli"
            },
            ...c.activities
          ]
        };
      }
      return c;
    }));

    const clientName = clients.find(c => c.id === targetClientId)?.name || "Cliente";
    showToast(`Oportunidad registrada para ${clientName}: $${amount.toLocaleString()}`);
    // reset form
    setNewOppAmount("45000");
    setNewOppName("Ampliación Licencias Cloud");
  };

  // Structured Stages for Kanban Board representation (derived dynamically)
  const stages = [
    {
      id: "leads",
      name: "Prospección / Leads",
      color: "border-indigo-500",
      deals: clients.map(c => ({
        id: `${c.id}-opp-1`,
        clientName: c.name,
        dealName: `Expansión de Plataforma - ${c.sector}`,
        amount: Math.round(c.pipelineOpen * 0.4),
        prob: 30,
        kam: c.kam
      })).filter(d => d.amount > 0)
    },
    {
      id: "proposals",
      name: "Propuesta Técnica",
      color: "border-blue-500",
      deals: clients.map(c => ({
        id: `${c.id}-opp-2`,
        clientName: c.name,
        dealName: `Consultoría de Procesos AI`,
        amount: Math.round(c.pipelineOpen * 0.3),
        prob: 60,
        kam: c.kam
      })).filter(d => d.amount > 0)
    },
    {
      id: "negotiations",
      name: "Negociación Contrato",
      color: "border-amber-500",
      deals: clients.map(c => ({
        id: `${c.id}-opp-3`,
        clientName: c.name,
        dealName: `Soporte Premium Multianual`,
        amount: Math.round(c.pipelineOpen * 0.3),
        prob: 85,
        kam: c.kam
      })).filter(d => d.amount > 0)
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#75ff9e] bg-slate-900 p-1.5 rounded-lg text-lg">groups</span>
            Embudo de Clientes y CRM
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitorea el ciclo de ventas, gestiona oportunidades en el pipeline y da seguimiento a cuentas clave.
          </p>
        </div>
      </div>

      {/* Statistics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-[#0d1c2d] border-slate-800" : "bg-white border-slate-200"} flex items-center justify-between shadow-xs`}>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Pipeline Neto</p>
            <p className="text-xl font-black text-slate-900 mt-1">${totalPipeline.toLocaleString()}</p>
          </div>
          <Target className="w-8 h-8 text-indigo-500 opacity-85 shrink-0" />
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-[#0d1c2d] border-slate-800" : "bg-white border-slate-200"} flex items-center justify-between shadow-xs`}>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Oportunidades en Curso</p>
            <p className="text-xl font-black text-slate-900 mt-1">{totalDeals} Deas</p>
          </div>
          <Layers className="w-8 h-8 text-blue-500 opacity-85 shrink-0" />
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-[#0d1c2d] border-slate-800" : "bg-white border-slate-200"} flex items-center justify-between shadow-xs`}>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Tasa Cierre Estimada</p>
            <p className="text-xl font-black text-slate-900 mt-1">82% Promedio</p>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500 opacity-85 shrink-0" />
        </div>
      </div>

      {/* Sales Pipeline Kanban Board */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Tablero Kanban de Negociación</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stages.map(stage => (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border-t-4 ${stage.color} ${
                isDarkMode ? "bg-[#0d1c2d]/50 border-slate-800" : "bg-slate-100/40 border-slate-200"
              } border min-h-[250px] flex flex-col space-y-3`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                <span className="text-xs font-extrabold text-slate-800">{stage.name}</span>
                <span className="bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {stage.deals.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar-light">
                {stage.deals.map(deal => (
                  <div
                    key={deal.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-all space-y-2"
                  >
                    <div>
                      <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-tight">{deal.clientName}</p>
                      <h4 className="font-bold text-slate-800 text-xs mt-0.5">{deal.dealName}</h4>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-slate-900 font-black">${deal.amount.toLocaleString()}</span>
                      <span className="text-slate-400">Prob: {deal.prob}%</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                      <span className="truncate">KAM: {deal.kam.split(" ")[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Client Accounts Table & Quick Deal Injector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Accounts Registry Spreadsheet */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" />
                Directorio de Cuentas y Pipeline
              </h3>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cuenta o KAM..."
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-44 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                <tr>
                  <th className="px-5 py-3">Cliente / Cuenta</th>
                  <th className="px-5 py-3">Sector</th>
                  <th className="px-5 py-3">Key Account Manager</th>
                  <th className="px-5 py-3">NPS Salud</th>
                  <th className="px-5 py-3 text-right">Pipeline Abierto</th>
                  <th className="px-5 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-400">RUC: {c.ruc}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{c.sector}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.kam}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          c.clientHealthScore >= 95 ? "bg-emerald-500" : "bg-amber-500"
                        }`}></span>
                        <span>{c.clientHealthScore}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      ${c.pipelineOpen.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => onSelectClient(c.id)}
                        className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg transition-colors flex items-center gap-0.5 mx-auto cursor-pointer"
                      >
                        Ficha
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Opportunity Injector Form */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">Nueva Oportunidad</h3>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold leading-normal">
              Inyecta de forma instantánea una oportunidad de venta calificada para cualquier cuenta activa del ERP.
            </p>

            <form onSubmit={handleQuickAddOpp} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Seleccionar Cuenta</label>
                <select
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Concepto / Deal Name</label>
                <input
                  type="text"
                  required
                  value={newOppName}
                  onChange={(e) => setNewOppName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500"
                  placeholder="Ej: Licencias Anuales"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Monto Estimado ($ USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="number"
                    required
                    value={newOppAmount}
                    onChange={(e) => setNewOppAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500"
                    placeholder="45000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 bg-[#75ff9e] hover:bg-[#5aff89] text-[#003918] font-black text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Registrar Oportunidad CRM
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center font-bold flex items-center justify-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            Acción auditada bajo KAM Paolo Bastianelli
          </div>
        </div>

      </div>

    </div>
  );
}
