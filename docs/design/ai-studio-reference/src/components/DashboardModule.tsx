import React, { useState, useEffect } from "react";
import {
  Sparkles, DollarSign, Briefcase, Heart, Clock, ChevronRight,
  ArrowUpRight, Users, AlertTriangle, RefreshCw, Building, TrendingUp
} from "lucide-react";
import { CRMClient } from "../types";

interface DashboardModuleProps {
  clients: CRMClient[];
  onSelectClient: (clientId: string) => void;
  onNavigateToModule: (module: string) => void;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export function DashboardModule({
  clients,
  onSelectClient,
  onNavigateToModule,
  isDarkMode,
  showToast
}: DashboardModuleProps) {
  const [executiveBriefing, setExecutiveBriefing] = useState<string>("");
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState<boolean>(false);

  // Global KPIs Calculation
  const totalLTV = clients.reduce((acc, c) => acc + c.ltv, 0);
  const totalPipeline = clients.reduce((acc, c) => acc + c.pipelineOpen, 0);
  const totalOppsCount = clients.reduce((acc, c) => acc + c.pipelineOppsCount, 0);
  const totalProjects = clients.reduce((acc, c) => acc + c.projects.length, 0);
  const activeProjects = clients.reduce(
    (acc, c) => acc + c.projects.filter(p => p.status === "En Ejecución").length,
    0
  );
  const avgHealth = Math.round(
    clients.reduce((acc, c) => acc + c.clientHealthScore, 0) / clients.length
  );
  const totalDebt = clients.reduce((acc, c) => acc + c.pendingDebt, 0);

  // Auto-generate executive briefing on first load
  useEffect(() => {
    generateExecutiveBriefing();
  }, []);

  const generateExecutiveBriefing = async () => {
    if (isGeneratingBriefing) return;
    setIsGeneratingBriefing(true);
    setExecutiveBriefing("");
    showToast("ZIGI AI está redactando el briefing consolidado de la empresa...");

    try {
      const summaryText = clients
        .map(
          c =>
            `- ${c.name}: LTV $${c.ltv.toLocaleString()}, Pipeline $${c.pipelineOpen.toLocaleString()} (${
              c.pipelineOppsCount
            } opps), Salud ${c.clientHealthScore}%, Proyectos ${c.projects.length}.`
        )
        .join("\n");

      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: "Izango Enterprise Portfolio",
          sector: "Consolidado ERP",
          kam: "Paolo Bastianelli",
          ltv: `$${totalLTV.toLocaleString()}`,
          activeProjects: totalProjects,
          openPipeline: `$${totalPipeline.toLocaleString()}`,
          systemPrompt: `
You are ZIGI AI, the senior executive AI strategist for Izango 360 ERP.
Analyze the consolidated accounts of the enterprise and write a professional, highly strategic, and actionable executive briefing (in Spanish) of exactly 4 sentences.
Structure it with:
1. An overall evaluation of the sales pipeline and portfolio health.
2. A high-priority operational/financial alert (e.g., mention active projects or pending debt).
3. A specific strategic suggestion for a key client (Honda, Alicorp, or Interbank) based on their status.
Keep the tone formal, highly business-oriented, and encouraging. Do not use generic introductions.
          `,
          userMessage: `Consolidated Client State:\n${summaryText}`
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      setExecutiveBriefing(data.text);
    } catch (err) {
      console.error(err);
      setExecutiveBriefing(
        "[Briefing Heurístico]: La cartera muestra una excelente salud operativa con un NPS promedio de 93%. Se recomienda priorizar la propuesta comercial en Alicorp para acelerar el pipeline de Q4 y realizar seguimiento de facturación pendiente con Interbank."
      );
      showToast("Briefing heurístico alternativo cargado.");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  // Funnel segments values
  const funnelSteps = [
    { name: "Prospección (Lead)", value: Math.round(totalPipeline * 0.4), color: "bg-indigo-500", percent: "100%" },
    { name: "Calificación / Demo", value: Math.round(totalPipeline * 0.28), color: "bg-blue-500", percent: "70%" },
    { name: "Propuesta Presentada", value: Math.round(totalPipeline * 0.18), color: "bg-cyan-500", percent: "45%" },
    { name: "Negociación de Contrato", value: Math.round(totalPipeline * 0.14), color: "bg-teal-500", percent: "35%" },
    { name: "Cierre Estimado (Q4)", value: Math.round(totalPipeline * 0.08), color: "bg-[#75ff9e]", percent: "20%" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#75ff9e] bg-slate-900 p-1.5 rounded-lg text-lg">dashboard</span>
            Dashboard de Control ERP
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Analíticas consolidadas de ventas, finanzas corporativas y estado de portafolio para Izango 360.
          </p>
        </div>

        <button
          onClick={generateExecutiveBriefing}
          disabled={isGeneratingBriefing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBriefing ? "animate-spin" : ""}`} />
          Refrescar Briefing AI
        </button>
      </div>

      {/* Bento Grid KPIs Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: total billing */}
        <div className={`p-5 rounded-xl border transition-all ${
          isDarkMode ? "bg-[#0d1c2d] border-slate-800/60" : "bg-white border-slate-200"
        } shadow-xs`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Facturación LTV</p>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${totalLTV.toLocaleString()}</p>
          <p className="text-[10px] text-green-600 font-extrabold flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3 h-3" />
            +14.3% vs LY
          </p>
        </div>

        {/* KPI 2: Pipeline */}
        <div className={`p-5 rounded-xl border transition-all ${
          isDarkMode ? "bg-[#0d1c2d] border-slate-800/60" : "bg-white border-slate-200"
        } shadow-xs`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Pipeline Comercial</p>
            <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <Building className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${totalPipeline.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {totalOppsCount} oportunidades activas
          </p>
        </div>

        {/* KPI 3: Projects */}
        <div className={`p-5 rounded-xl border transition-all ${
          isDarkMode ? "bg-[#0d1c2d] border-slate-800/60" : "bg-white border-slate-200"
        } shadow-xs`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Portafolio Operativo</p>
            <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{totalProjects}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {activeProjects} en ejecución técnica
          </p>
        </div>

        {/* KPI 4: Customer NPS */}
        <div className={`p-5 rounded-xl border transition-all ${
          isDarkMode ? "bg-[#0d1c2d] border-slate-800/60" : "bg-white border-slate-200"
        } shadow-xs`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Salud Cliente (NPS)</p>
            <span className="p-1.5 bg-red-500/10 text-red-500 rounded-lg">
              <Heart className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{avgHealth}%</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${avgHealth}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 5: Pending debt */}
        <div className={`p-5 rounded-xl border transition-all ${
          isDarkMode ? "bg-[#0d1c2d] border-slate-800/60" : "bg-white border-slate-200"
        } shadow-xs`}>
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cuentas por Cobrar</p>
            <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-xl font-black mt-2 ${totalDebt > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            ${totalDebt.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {totalDebt > 0 ? "Requiere gestión de cobro" : "Cartera 100% al día"}
          </p>
        </div>

      </div>

      {/* Main Core Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: ZIGI Briefing and Sales Funnel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* ZIGI AI Strategic Briefing */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 relative overflow-hidden shadow-xs">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">ZIGI Executive Briefing (Análisis AI)</h3>
            </div>

            {isGeneratingBriefing ? (
              <div className="py-4 flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Generando síntesis comercial de la empresa mediante Gemini...</span>
              </div>
            ) : (
              <p className="text-xs text-slate-700 italic leading-relaxed font-semibold">
                "{executiveBriefing || "Ningún análisis generado aún. Haz clic en Refrescar Briefing para conectar con ZIGI AI."}"
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-emerald-500/10 flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>Soporte de Inteligencia Comercial Activa</span>
              <button
                onClick={() => onNavigateToModule("crm")}
                className="text-emerald-600 hover:underline flex items-center gap-0.5"
              >
                Abrir Pipeline Comercial
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Interactive Sales Funnel Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-slate-500 text-base">filter_alt</span>
                  Embudo de Ventas Consolidado
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Distribución del Pipeline comercial estimado para cierre de año.</p>
              </div>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                Total: ${totalPipeline.toLocaleString()}
              </span>
            </div>

            {/* Custom high-fidelity funnel drawing with nested bars */}
            <div className="space-y-3.5">
              {funnelSteps.map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${step.color}`}></span>
                      {step.name}
                    </span>
                    <span className="text-slate-900">${step.value.toLocaleString()} ({step.percent})</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200/40">
                    <div
                      className={`h-full ${step.color} transition-all duration-1000`}
                      style={{ width: step.percent }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Key Portfolio Client Accounts List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                Cartera de Clientes
              </h3>

              <div className="space-y-3">
                {clients.map(c => (
                  <div
                    key={c.id}
                    className="p-3 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 text-xs truncate leading-tight">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">LTV: ${c.ltv.toLocaleString()} • {c.sector}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        c.clientHealthScore >= 90
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {c.clientHealthScore}% NPS
                      </span>
                      <button
                        onClick={() => onSelectClient(c.id)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 group-hover:text-indigo-600 transition-all cursor-pointer"
                        title="Ver detalles de cuenta"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateToModule("crm")}
              className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              Gestionar Cuentas y Pipeline
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
