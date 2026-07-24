import React, { useState } from "react";
import {
  Settings, Building, Sparkles, Sliders, Shield, Zap,
  Save, Database, ToggleLeft, ToggleRight, CheckCircle, RefreshCw
} from "lucide-react";

interface SettingsModuleProps {
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export function SettingsModule({
  isDarkMode,
  showToast
}: SettingsModuleProps) {
  // General details
  const [ruc, setRuc] = useState("20601234567");
  const [legalName, setLegalName] = useState("Izango Enterprises SAC");
  const [currency, setCurrency] = useState("USD");
  const [address, setAddress] = useState("Av. República de Panamá 3420, San Isidro, Lima, Perú");

  // KPI Targets
  const [targetPipeline, setTargetPipeline] = useState("1000000");
  const [targetHealth, setTargetHealth] = useState("90");

  // ERP Module Toggles
  const [modules, setModules] = useState({
    crm: true,
    projects: true,
    finance: true,
    docs: true,
    aiCoPilot: true,
    hr: false,
    inventory: false
  });

  const toggleModule = (key: keyof typeof modules) => {
    setModules(prev => {
      const nextValue = !prev[key];
      showToast(`Módulo "${String(key).toUpperCase()}" ${nextValue ? "activado" : "desactivado"} exitosamente.`);
      return { ...prev, [key]: nextValue };
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Configuración de Izango Enterprises SAC guardada con éxito en la nube.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#75ff9e] bg-slate-900 p-1.5 rounded-lg text-lg">settings</span>
            Configuración del Sistema ERP
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Personaliza los parámetros fiscales de la empresa, configura límites del pipeline comercial y administra módulos de negocio.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Fiscal Information Form & KPI Targets */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Fiscal Profile Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-500" />
              Perfil Fiscal de la Empresa
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">RUC Fiscal</label>
                  <input
                    type="text"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Divisa Base</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="USD">Dólares Americanos ($ USD)</option>
                    <option value="PEN">Soles Peruanos (S/ PEN)</option>
                    <option value="EUR">Euros (€ EUR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Dirección Fiscal Legal</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Guardar Perfil Fiscal
                </button>
              </div>
            </form>
          </div>

          {/* Strategic KPI targets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-slate-500" />
              Metas Estratégicas y Límites de Alerta
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mb-4 leading-normal">
              Ajusta los objetivos anuales que disparan alertas de salud o desempeño en el Dashboard y en los briefings generados por Inteligencia Artificial.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Meta del Pipeline Comercial ($ USD)</label>
                <input
                  type="number"
                  value={targetPipeline}
                  onChange={(e) => setTargetPipeline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Límite de Alerta de Salud Cliente (%)</label>
                <input
                  type="number"
                  value={targetHealth}
                  onChange={(e) => setTargetHealth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Active Module Toggles & System Integration Health */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Active Modules Toggles */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-500" />
              Módulos Activos ERP
            </h3>

            <div className="space-y-3.5">
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-xs">CRM Comercial & Funnel</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Pipelines, deals y KAMs</p>
                </div>
                <button onClick={() => toggleModule("crm")} className="cursor-pointer text-slate-700 hover:text-slate-900">
                  {modules.crm ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Portafolio Operativo</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Proyectos, hitos y PMs</p>
                </div>
                <button onClick={() => toggleModule("projects")} className="cursor-pointer text-slate-700 hover:text-slate-900">
                  {modules.projects ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Finanzas & Facturas</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Cobros, caja y liquidaciones</p>
                </div>
                <button onClick={() => toggleModule("finance")} className="cursor-pointer text-slate-700 hover:text-slate-900">
                  {modules.finance ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-xs">ZIGI AI Copilot</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Asistente estratégico Gemini</p>
                </div>
                <button onClick={() => toggleModule("aiCoPilot")} className="cursor-pointer text-slate-700 hover:text-slate-900">
                  {modules.aiCoPilot ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Recursos Humanos (HR)</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Planillas y vacaciones</p>
                </div>
                <button onClick={() => toggleModule("hr")} className="cursor-pointer text-slate-700 hover:text-slate-900">
                  {modules.hr ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

            </div>
          </div>

          {/* System Health Status */}
          <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-5 shadow-xs">
            <h3 className="font-black text-xs text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              Integraciones del Servidor
            </h3>

            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Gemini AI API SDK</span>
                <span className="text-[#75ff9e] flex items-center gap-1 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" /> Activo (2.5)
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Database Engine</span>
                <span className="text-slate-100 flex items-center gap-1 font-bold">
                  <Database className="w-3.5 h-3.5 text-indigo-400" /> State-Cache
                </span>
              </div>

              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Ingress Port / Server</span>
                <span className="text-slate-100 font-bold">0.0.0.0:3000 (Proxy)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
