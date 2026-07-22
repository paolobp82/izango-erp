import React, { useState, useEffect } from "react";
import {
  X, Save, Plus, DollarSign, Calendar, Globe, User, Phone, Mail, Award,
  MapPin, Search, ChevronRight, Edit3, Share2, AlertTriangle, Building,
  Inbox, CheckCircle, Clock, Trash2, Sparkles, Moon, Sun, ArrowUpRight,
  HelpCircle, Menu, Eye, HardDrive, FileText, Download, Briefcase,
  FileSpreadsheet, CheckSquare, MessageSquare, ExternalLink, RefreshCw
} from "lucide-react";

import { mockClients } from "./data/mockClients";
import { CRMClient, CRMContact, CRMProject, CRMActivity } from "./types";
import { EditClientModal, NewOpportunityModal, AddContactModal } from "./components/Modals";
import { ZigiChatWidget } from "./components/ZigiChatWidget";
import { DashboardModule } from "./components/DashboardModule";
import { CRMModule } from "./components/CRMModule";
import { ProjectsModule } from "./components/ProjectsModule";
import { FinanceModule } from "./components/FinanceModule";
import { SettingsModule } from "./components/SettingsModule";

export default function App() {
  // Application States
  const [clients, setClients] = useState<CRMClient[]>(mockClients);
  const [activeClientId, setActiveClientId] = useState<string>("honda-peru");
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubTab, setSelectedSubTab] = useState<string>("resumen");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // High-Density Project Filter
  const [projectFilter, setProjectFilter] = useState<"todos" | "en-curso" | "pendientes">("todos");

  // Modals Visibility
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isNewOpportunityOpen, setIsNewOpportunityOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isZigiChatOpen, setIsZigiChatOpen] = useState(false);

  // Dynamic feedback systems
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);
  
  // Get active client
  const activeClient = clients.find(c => c.id === activeClientId) || clients[0];

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Switch clients safely
  const handleClientChange = (clientId: string) => {
    setActiveClientId(clientId);
    setActiveModule("clientes");
    setSelectedSubTab("resumen");
    showToast(`Cargando cuenta: ${clients.find(c => c.id === clientId)?.name}`);
  };

  // Edit Client handler
  const handleSaveClient = (updatedClient: CRMClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    showToast("Ficha de cliente actualizada exitosamente.");
  };

  // Add pipeline opportunity handler
  const handleAddOpportunity = (amount: number) => {
    setClients(prev => prev.map(c => {
      if (c.id === activeClient.id) {
        const newPipeline = c.pipelineOpen + amount;
        const newCount = c.pipelineOppsCount + 1;
        const newActivities: CRMActivity[] = [
          {
            id: "act-new-" + Date.now(),
            type: "email",
            title: `Nueva Oportunidad Añadida`,
            description: `Se registró una oportunidad de venta por un valor estimado de $${amount.toLocaleString()}.`,
            timestamp: "Hace unos instantes",
            owner: "Paolo Bastianelli"
          },
          ...c.activities
        ];
        return {
          ...c,
          pipelineOpen: newPipeline,
          pipelineOppsCount: newCount,
          activities: newActivities
        };
      }
      return c;
    }));
    showToast(`Oportunidad de $${amount.toLocaleString()} registrada en el Pipeline.`);
  };

  // Add Contact handler
  const handleAddContact = (newContact: CRMContact) => {
    setClients(prev => prev.map(c => {
      if (c.id === activeClient.id) {
        return {
          ...c,
          contacts: [...c.contacts, newContact]
        };
      }
      return c;
    }));
    showToast(`Contacto ${newContact.name} agregado.`);
  };

  // Delete Contact handler
  const handleDeleteContact = (contactId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === activeClient.id) {
        return {
          ...c,
          contacts: c.contacts.filter(contact => contact.id !== contactId)
        };
      }
      return c;
    }));
    showToast("Contacto removido de la cuenta.");
  };

  // Real-time AI Strategic Insights Regenerator (backend call!)
  const handleRegenerateInsights = async () => {
    if (isRegeneratingInsights) return;
    setIsRegeneratingInsights(true);
    showToast("Conectando con ZIGI AI para optimizar análisis comercial...");

    try {
      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: activeClient.name,
          sector: activeClient.sector,
          kam: activeClient.kam,
          ltv: `$${activeClient.ltv.toLocaleString()}`,
          activeProjects: activeClient.projects.length,
          openPipeline: `$${activeClient.pipelineOpen.toLocaleString()}`,
          userMessage: "Genera recomendaciones tácticas actualizadas basadas en la transición de mercado y estado de cuenta."
        })
      });

      if (!response.ok) {
        throw new Error("Error en la llamada al servidor");
      }

      const data = await response.json();
      setClients(prev => prev.map(c => {
        if (c.id === activeClient.id) {
          return {
            ...c,
            insightsAI: data.text
          };
        }
        return c;
      }));
      showToast("Insights actualizados exitosamente por ZIGI AI.");
    } catch (error) {
      console.error(error);
      showToast("Error al regenerar insights. Cargando modelo heurístico alternativo.");
      // Fallback
      setClients(prev => prev.map(c => {
        if (c.id === activeClient.id) {
          return {
            ...c,
            insightsAI: `[Estrategia Recomendada]: Priorizar venta consultiva de alta gama en ${c.sector} y realizar llamadas de fidelización de Q4 con los directores de compras.`
          };
        }
        return c;
      }));
    } finally {
      setIsRegeneratingInsights(false);
    }
  };

  // Filter active projects
  const filteredProjects = activeClient.projects.filter(p => {
    if (projectFilter === "en-curso") return p.status === "En Ejecución" || p.status === "Planificación";
    if (projectFilter === "pendientes") return p.status === "Pendiente";
    return true; // "todos"
  });

  // Filter contacts or projects with global search query
  const matchesSearch = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? "bg-[#051424] text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#122131] border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-300">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Side Navigation Bar */}
      <aside className="w-[240px] h-screen fixed left-0 top-0 flex flex-col border-r border-[#3b4a3d]/20 bg-[#0d1c2d] z-50">
        <div className="p-6 flex flex-col h-full justify-between">
          <div>
            {/* Brand Logo Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-[#75ff9e] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#003918] font-bold text-lg">hub</span>
              </div>
              <div>
                <h1 className="text-sm font-black text-[#75ff9e] tracking-wider uppercase">Izango 360 SAC</h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-tight">Izango Perú Portal</p>
              </div>
            </div>

            {/* Quick Create Action Button */}
            <button
              onClick={() => setIsNewOpportunityOpen(true)}
              className="w-full py-2.5 px-4 bg-[#75ff9e] hover:bg-[#5aff89] text-[#003918] font-black text-xs rounded-lg mb-6 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-[#75ff9e]/10 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nuevo Proyecto
            </button>

            {/* Sidebar Modules List */}
            <nav className="flex flex-col gap-1.5 custom-scrollbar overflow-y-auto max-h-[calc(100vh-340px)]">
              
              {/* Account / Client Quick Switcher Widget Inside Sidebar */}
              <div className="px-3 py-2 bg-[#122131]/60 rounded-lg border border-slate-800 mb-3 space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Cuentas Disponibles</p>
                <div className="flex flex-col gap-1">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleClientChange(c.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-bold transition-all truncate flex items-center gap-1.5 ${
                        c.id === activeClient.id
                          ? "bg-indigo-600/25 text-[#75ff9e] border border-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      {c.name.split(" ")[0]} {c.name.includes("Perú") ? "Perú" : ""}
                    </button>
                  ))}
                </div>
              </div>
                        <button
                onClick={() => setActiveModule("dashboard")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "dashboard"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => showToast("Módulo 'Mi Trabajo' está sincronizado con tus proyectos activos.")}
                className="px-3 py-2 flex items-center gap-3 text-slate-400 hover:text-slate-100 hover:bg-[#122131] rounded-lg text-xs font-semibold nav-item-transition w-full text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Mi Trabajo</span>
              </button>

              <button
                onClick={() => showToast("Calendario Izango enlazado con Google Calendar.")}
                className="px-3 py-2 flex items-center gap-3 text-slate-400 hover:text-slate-100 hover:bg-[#122131] rounded-lg text-xs font-semibold nav-item-transition w-full text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Calendario</span>
              </button>

              <button
                onClick={() => showToast("No tienes nuevas alertas operativas en este momento.")}
                className="px-3 py-2 flex items-center gap-3 text-slate-400 hover:text-slate-100 hover:bg-[#122131] rounded-lg text-xs font-semibold nav-item-transition w-full text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                <span>Alertas</span>
              </button>

              <button
                onClick={() => setActiveModule("crm")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "crm"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">hub</span>
                <span>CRM</span>
              </button>

              <button
                onClick={() => setActiveModule("clientes")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "clientes"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                <span>Clientes</span>
              </button>

              <button
                onClick={() => setActiveModule("proyectos")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "proyectos"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                <span>Proyectos</span>
              </button>

              <button
                onClick={() => setActiveModule("finanzas")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "finanzas"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Finanzas</span>
              </button>

              <button
                onClick={() => setActiveModule("settings")}
                className={`px-3 py-2 flex items-center gap-3 rounded-lg text-xs font-semibold nav-item-transition w-full text-left transition-colors cursor-pointer ${
                  activeModule === "settings"
                    ? "bg-indigo-600/25 text-[#75ff9e] border-l-4 border-[#75ff9e]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-[#122131]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Configuración</span>
              </button>

              {/* ZIGI AI Action */}
              <button
                onClick={() => setIsZigiChatOpen(true)}
                className="w-full text-slate-400 hover:text-slate-100 px-3 py-2 flex items-center gap-3 transition-colors hover:bg-[#122131] rounded-lg text-xs font-semibold text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-400">auto_awesome</span>
                <span>ZIGI AI Assistant</span>
              </button>
            </nav>
          </div>

          {/* User profile footer */}
          <div className="border-t border-[#3b4a3d]/20 pt-4 space-y-2">
            <div className="px-3 py-1.5 flex items-center gap-3 bg-slate-800/20 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#122131] flex items-center justify-center text-xs font-bold text-slate-300">
                PB
              </div>
              <span className="text-[11px] text-slate-300 font-bold truncate">Paolo Bastianelli</span>
            </div>
            <button
              onClick={() => showToast("Cerrando sesión de Izango Portal...")}
              className="w-full px-3 py-1.5 text-left text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-3 text-[11px]"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Top Application Bar Header */}
      <header className="h-16 w-[calc(100%-240px)] fixed top-0 left-[240px] z-40 bg-[#051424] border-b border-slate-800/40 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar en ${activeClient.name}...`}
              className="bg-[#122131] border-none rounded-lg pl-9 pr-4 py-1.5 text-xs font-medium text-slate-100 focus:ring-1 focus:ring-emerald-400 w-64 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Header Subtabs */}
          <nav className="flex gap-6 h-full items-center">
            <button
              onClick={() => setActiveModule("dashboard")}
              className={`font-extrabold text-xs py-5 px-1 transition-all cursor-pointer ${
                activeModule === "dashboard" ? "text-[#75ff9e] border-b-2 border-[#75ff9e]" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveModule("crm")}
              className={`font-extrabold text-xs py-5 px-1 transition-all cursor-pointer ${
                activeModule === "crm" ? "text-[#75ff9e] border-b-2 border-[#75ff9e]" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              CRM Comercial
            </button>
            <button
              onClick={() => setActiveModule("proyectos")}
              className={`font-extrabold text-xs py-5 px-1 transition-all cursor-pointer ${
                activeModule === "proyectos" ? "text-[#75ff9e] border-b-2 border-[#75ff9e]" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Operaciones
            </button>
            <button
              onClick={() => setActiveModule("finanzas")}
              className={`font-extrabold text-xs py-5 px-1 transition-all cursor-pointer ${
                activeModule === "finanzas" ? "text-[#75ff9e] border-b-2 border-[#75ff9e]" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Finanzas
            </button>
          </nav>
        </div>

        {/* Global actions and Theme Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => showToast("Abriendo Centro de Aprobaciones corporativas...")}
            className="px-4 py-1.5 bg-[#122131] border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Centro de Aprobaciones
          </button>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 h-8">
            {/* Dark Mode toggle */}
            <button
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                showToast(`Visualización configurada en modo ${!isDarkMode ? "Oscuro" : "Claro"}`);
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Cambiar tema visual"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification indicators */}
            <button
              onClick={() => showToast("Tienes 3 notificaciones comerciales sin leer.")}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 relative transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>

            {/* User profile picture */}
            <div className="w-8 h-8 rounded-full overflow-hidden ml-2 bg-slate-800 border border-slate-700">
              <img
                className="w-full h-full object-cover"
                alt="Paolo"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_2c9w-ddcR0TThCkKbli-mCjjrZ_G4LWwYLCxpbtsYmWd9eJ9BDwV1wKNbEoOW024rmrRRsuWPBaSm8YGGKZJmc5hqet0gSRIS898okuZNCsazvbKHiytXL5PPJcCt1UVskAofSLSCXQYxn5npuunnRlvMOcSpycEoBVdMAxBJDS2KZcGsUq3wBUVPr5zHd6YBT45mycxCIN7p4V9InH7X_6PpSReyZks54hRjKP6VNmqO5K9hj5gfaashIVPe1Zp9wS0fu4DwJ3R"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame Canvas */}
      <main className="ml-[240px] pt-16 min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors">
        
        {/* Breadcrumb Navigation and Client Actions */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => setActiveModule("dashboard")}>ERP</span>
            <ChevronRight className="w-3.5 h-3.5" />
            {activeModule === "clientes" ? (
              <>
                <span className="hover:text-indigo-600 cursor-pointer" onClick={() => setActiveModule("crm")}>Clientes</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-900 font-extrabold">{activeClient.name}</span>
              </>
            ) : (
              <span className="text-slate-900 font-extrabold uppercase">
                {activeModule === "dashboard" ? "Dashboard General" :
                 activeModule === "crm" ? "CRM & Pipeline" :
                 activeModule === "proyectos" ? "Portafolio de Entregas" :
                 activeModule === "finanzas" ? "Finanzas Corporativas" :
                 activeModule === "settings" ? "Configuración" : ""}
              </span>
            )}
          </nav>
          
          {activeModule === "clientes" && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditClientOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Ficha
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Enlace de ficha copiado al portapapeles.");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Compartir
              </button>
              <button
                onClick={() => setIsNewOpportunityOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Oportunidad
              </button>
            </div>
          )}
        </div>

        {activeModule === "clientes" ? (
          <>
            {/* Dynamic Client Header Sheet (VIP Style) */}
            <div className="px-8 py-8 bg-white border-b border-slate-200">
          <div className="flex gap-6 items-start">
            
            {/* Logo box */}
            <div className="w-24 h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 p-3 shrink-0 shadow-xs">
              {activeClient.logoUrl ? (
                <img
                  className="w-full h-full object-contain"
                  alt={activeClient.name}
                  referrerPolicy="no-referrer"
                  src={activeClient.logoUrl}
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">
                  {activeClient.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{activeClient.name}</h2>
                {activeClient.isVIP && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase tracking-wider border border-green-200">
                    Cliente VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mb-4">
                RUC: {activeClient.ruc} • Sector {activeClient.sector} • {activeClient.location}
              </p>
              
              <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-slate-700 font-semibold">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Key Account Manager: <strong className="text-slate-900">{activeClient.kam}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Desde: <strong className="text-slate-900">{activeClient.sinceDate}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <a
                    href={`https://${activeClient.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    {activeClient.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Lifetime Value Metric Box */}
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor de Vida (LTV)</p>
              <p className="text-2xl font-black text-slate-900">${activeClient.ltv.toLocaleString()}</p>
              <p className="text-[11px] text-green-600 font-extrabold flex items-center justify-end gap-0.5">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {activeClient.ltvGrowth}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Dashboard Strip (Interactive High Density Banner) */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-900 rounded-xl p-6 text-white shadow-xl shadow-slate-200 border border-slate-800">
            
            <div className="border-r border-slate-800 pr-4">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Pipeline Abierto</p>
              <p className="text-lg font-black text-[#75ff9e]">${activeClient.pipelineOpen.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">{activeClient.pipelineOppsCount} oportunidades activas</p>
            </div>

            <div className="border-r border-slate-800 px-4">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1 font-sans">Proyectos en Curso</p>
              <p className="text-lg font-black">{activeClient.projects.length}</p>
              <p className="text-[11px] text-slate-400">{activeClient.projects.filter(p => p.status === "En Ejecución").length} en fase de ejecución</p>
            </div>

            <div className="border-r border-slate-800 px-4">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Salud del Cliente</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-[#75ff9e]">{activeClient.clientHealthScore}%</span>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#75ff9e]"
                    style={{ width: `${activeClient.clientHealthScore}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold truncate">{activeClient.clientHealthLabel}</p>
            </div>

            <div className="border-r border-slate-800 px-4">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Deuda Pendiente</p>
              <p className={`text-lg font-black ${activeClient.pendingDebt > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                ${activeClient.pendingDebt.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">{activeClient.pendingDebtLabel}</p>
            </div>

            <div className="pl-4">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Última Interacción</p>
              <p className="text-sm font-bold text-[#75ff9e]">{activeClient.lastInteractionTime}</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">{activeClient.lastInteractionLabel}</p>
            </div>

          </div>
        </div>

        {/* Secondary Navigation Section Tabs */}
        <div className="px-8 border-b border-slate-200 bg-white flex gap-6 overflow-x-auto">
          {[
            { id: "resumen", label: "Resumen", icon: "dashboard" },
            { id: "contactos", label: "Contactos", count: activeClient.contacts.length, icon: "groups" },
            { id: "proyectos", label: "Proyectos", count: activeClient.projects.length, icon: "account_tree" },
            { id: "facturacion", label: "Facturación", icon: "receipt_long" },
            { id: "documentos", label: "Documentos", icon: "description" },
            { id: "actividad", label: "Actividad", icon: "history" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedSubTab(tab.id)}
              className={`py-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                selectedSubTab === tab.id
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-400 border-transparent hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dynamic Inner Tab Viewport */}
        <div className="px-8 py-6 flex-1 bg-slate-50">
          
          {selectedSubTab === "resumen" && (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Side Bento Panels: Activity Log & Pipeline Status */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Recent Activity Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-500" />
                          Actividad Reciente
                        </h3>
                        <button
                          onClick={() => setSelectedSubTab("actividad")}
                          className="text-indigo-600 font-black text-xs hover:underline cursor-pointer"
                        >
                          Ver todo
                        </button>
                      </div>

                      {/* Timeline Events list */}
                      <div className="space-y-4">
                        {activeClient.activities.slice(0, 3).map((act) => (
                          <div key={act.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              {act.type === "email" ? (
                                <Mail className="w-4 h-4 text-blue-600" />
                              ) : act.type === "call" ? (
                                <Phone className="w-4 h-4 text-orange-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{act.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{act.timestamp} • {act.owner}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Health Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          Salud del Pipeline
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1 font-semibold">
                            <span className="text-slate-500">Probabilidad de Cierre (Q4)</span>
                            <span className="text-slate-900 font-bold">{activeClient.closeProbability}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600"
                              style={{ width: `${activeClient.closeProbability}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Ticket Promedio</p>
                            <p className="text-xs font-black text-slate-900">${activeClient.avgTicket.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Días en Ciclo</p>
                            <p className="text-xs font-black text-slate-900">{activeClient.daysInCycle} días</p>
                          </div>
                        </div>

                        {activeClient.stuckWarning && (
                          <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-800 font-bold leading-normal">{activeClient.stuckWarning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* High Density Active Projects Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      Proyectos Activos
                    </h3>
                    
                    {/* Filter controls */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-black uppercase">
                      {(["todos", "en-curso", "pendientes"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setProjectFilter(opt)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                            projectFilter === opt
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {opt === "en-curso" ? "En Curso" : opt === "pendientes" ? "Pendientes" : "Todos"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                        <tr>
                          <th className="px-6 py-3">Nombre del Proyecto</th>
                          <th className="px-6 py-3">Líder</th>
                          <th className="px-6 py-3">Progreso</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {filteredProjects.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                              No hay proyectos en esta categoría que coincidan.
                            </td>
                          </tr>
                        ) : (
                          filteredProjects.map((proj) => (
                            <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5">
                                <p className="font-bold text-slate-900">{proj.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {proj.id}</p>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {proj.leader[0]}
                                  </div>
                                  <span className="text-slate-600 font-medium">{proj.leader}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2 min-w-[80px]">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${proj.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                                      style={{ width: `${proj.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] text-slate-500">{proj.progress}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  proj.status === "En Ejecución" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                  proj.status === "Planificación" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                  proj.status === "Finalizado" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {proj.status}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right font-bold text-slate-900">${proj.amount.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Side Column Panels: Contacts Key List, Location, Strategic AI Notes */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                
                {/* Contacts Key List Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-500" />
                      Contactos Clave
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar-light">
                    {activeClient.contacts.map((cont) => (
                      <div key={cont.id} className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100">
                        {cont.avatarUrl ? (
                          <img
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                            alt={cont.name}
                            src={cont.avatarUrl}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {cont.name.split(" ").map(w => w[0]).join("")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate leading-tight">{cont.name}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{cont.role}</p>
                        </div>
                        {cont.isKey && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1 py-0.5 rounded border border-indigo-100">KEY</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsAddContactOpen(true)}
                    className="w-full mt-4 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Añadir Contacto
                  </button>
                </div>

                {/* Location Map Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Ubicación Principal
                  </h3>
                  
                  {activeClient.mapEmbedUrl ? (
                    <div className="w-full h-32 rounded-lg overflow-hidden mb-3 grayscale border border-slate-200">
                      <img
                        className="w-full h-full object-cover"
                        alt="Map"
                        src={activeClient.mapEmbedUrl}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 border border-slate-200 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{activeClient.addressName}</p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{activeClient.addressDetails}</p>
                    </div>
                  </div>
                </div>

                {/* Strategic Notes ZIGI AI Card */}
                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 shadow-xs relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl"></div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Insights ZIGI AI</h3>
                    </div>
                    <button
                      onClick={handleRegenerateInsights}
                      disabled={isRegeneratingInsights}
                      className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                      title="Refrescar insights con Gemini"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingInsights ? "animate-spin text-emerald-600" : ""}`} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 italic leading-relaxed mb-4">
                    "{activeClient.insightsAI}"
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-emerald-500/10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Analizado hoy 09:00</span>
                    <button
                      onClick={() => setIsZigiChatOpen(true)}
                      className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      Abrir Análisis
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Contactos Database Screen */}
          {selectedSubTab === "contactos" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Directorio Completo de Contactos</h3>
                  <p className="text-xs text-slate-500 font-medium">Gestiona los tomadores de decisión claves en la organización</p>
                </div>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer animate-in fade-in"
                >
                  <Plus className="w-4 h-4" /> Añadir Contacto
                </button>
              </div>

              {/* Grid of contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClient.contacts.map(c => (
                  <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {c.avatarUrl ? (
                            <img className="w-10 h-10 rounded-full object-cover border border-slate-200" alt={c.name} src={c.avatarUrl} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm">
                              {c.name.split(" ").map(w => w[0]).join("")}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{c.name}</p>
                            <p className="text-[11px] text-slate-500 font-bold">{c.role}</p>
                          </div>
                        </div>
                        {c.isKey && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded-sm">VIP</span>
                        )}
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-semibold border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{c.email || "Sin registrar"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone || "Sin registrar"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Remover contacto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proyectos Comprehensive Directory */}
          {selectedSubTab === "proyectos" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Directorio Completo de Proyectos</h3>
                  <p className="text-xs text-slate-500 font-medium">Seguimiento de entregas, hitos y presupuestos asignados</p>
                </div>
                <button
                  onClick={() => setIsNewOpportunityOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nuevo Proyecto
                </button>
              </div>

              <div className="space-y-4">
                {activeClient.projects.map(p => (
                  <div key={p.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Identificador único: {p.id} • Líder de proyecto: {p.leader}</p>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-500">Progreso Operativo</span>
                        <span className="text-slate-900 font-bold">{p.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${p.progress === 100 ? "bg-green-500" : "bg-indigo-600"}`}
                          style={{ width: `${p.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        p.status === "En Ejecución" ? "bg-blue-100 text-blue-700" :
                        p.status === "Planificación" ? "bg-amber-100 text-amber-700" :
                        p.status === "Finalizado" ? "bg-green-100 text-green-700" :
                        "bg-slate-200 text-slate-600"
                      }`}>
                        {p.status}
                      </span>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Presupuesto</p>
                        <p className="font-black text-slate-900">${p.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facturación Screen */}
          {selectedSubTab === "facturacion" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Registro de Facturación y Finanzas</h3>
                  <p className="text-xs text-slate-500 font-medium">Lista de comprobantes, cobros anuales e historial de pagos</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                    Historial Completo Al Día
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                    <tr>
                      <th className="px-6 py-3">Código Factura</th>
                      <th className="px-6 py-3">Concepto / Servicio</th>
                      <th className="px-6 py-3">Fecha Emisión</th>
                      <th className="px-6 py-3">Vencimiento</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Monto Facturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {activeClient.invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{inv.id}</td>
                        <td className="px-6 py-3.5">{inv.concept}</td>
                        <td className="px-6 py-3.5 text-slate-500">{inv.billingDate}</td>
                        <td className="px-6 py-3.5 text-slate-500">{inv.dueDate}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            inv.status === "Paid" ? "bg-green-100 text-green-700" :
                            inv.status === "Pending" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {inv.status === "Paid" ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">${inv.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documentos Log with Upload portal */}
          {selectedSubTab === "documentos" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Carpeta de Documentos Digitales</h3>
                  <p className="text-xs text-slate-500 font-medium">Contratos marco, NDAs vigentes, cotizaciones y propuestas aprobadas</p>
                </div>
                <button
                  onClick={() => showToast("La subida de archivos está disponible para usuarios con licencia enterprise.")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Subir Archivo
                </button>
              </div>

              {/* Drag and drop portal illustration */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 mb-6 text-center hover:bg-slate-50 transition-all cursor-pointer">
                <HardDrive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Arrastra archivos aquí o haz clic para subir</p>
                <p className="text-[10px] text-slate-400 mt-1">Soporta PDFs, XLS, DOC de hasta 15MB</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClient.documents.map(doc => (
                  <div key={doc.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex justify-between items-center">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.category} • {doc.size} • Act. {doc.updatedAt}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => showToast(`Descargando documento: ${doc.name}`)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actividad Interaction Logs Timeline */}
          {selectedSubTab === "actividad" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Historial Completo de Interacciones</h3>
                  <p className="text-xs text-slate-500 font-medium">Bitácora cronológica de llamadas, correos y visitas de seguimiento</p>
                </div>
              </div>

              {/* Timeline layout */}
              <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                {activeClient.activities.map((act) => (
                  <div key={act.id} className="relative">
                    {/* timeline marker node */}
                    <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${
                      act.type === "email" ? "bg-blue-500" :
                      act.type === "call" ? "bg-orange-500" :
                      "bg-green-500"
                    }`}></span>
                    
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">{act.title}</h4>
                        <span className="text-[10px] text-slate-400 font-bold">{act.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">{act.description}</p>
                      <div className="mt-3 pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>Canal de CRM: {act.type.toUpperCase()}</span>
                        <span>Registrado por: {act.owner}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
          </>
        ) : activeModule === "dashboard" ? (
          <div className="px-8 py-8 flex-1 bg-slate-50">
            <DashboardModule
              clients={clients}
              onSelectClient={(id) => {
                setActiveClientId(id);
                setActiveModule("clientes");
              }}
              onNavigateToModule={(mod) => setActiveModule(mod)}
              isDarkMode={isDarkMode}
              showToast={showToast}
            />
          </div>
        ) : activeModule === "crm" ? (
          <div className="px-8 py-8 flex-1 bg-slate-50">
            <CRMModule
              clients={clients}
              setClients={setClients}
              onSelectClient={(id) => {
                setActiveClientId(id);
                setActiveModule("clientes");
              }}
              isDarkMode={isDarkMode}
              showToast={showToast}
            />
          </div>
        ) : activeModule === "proyectos" ? (
          <div className="px-8 py-8 flex-1 bg-slate-50">
            <ProjectsModule
              clients={clients}
              setClients={setClients}
              isDarkMode={isDarkMode}
              showToast={showToast}
            />
          </div>
        ) : activeModule === "finanzas" ? (
          <div className="px-8 py-8 flex-1 bg-slate-50">
            <FinanceModule
              clients={clients}
              setClients={setClients}
              isDarkMode={isDarkMode}
              showToast={showToast}
            />
          </div>
        ) : activeModule === "settings" ? (
          <div className="px-8 py-8 flex-1 bg-slate-50">
            <SettingsModule
              isDarkMode={isDarkMode}
              showToast={showToast}
            />
          </div>
        ) : null}

        {/* Footer Technical Indicators */}
        <footer className="py-4 bg-slate-900 text-slate-400 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center px-8 text-[11px] font-semibold font-sans">
          <div>
            <span className="font-black text-[#75ff9e] mr-4 uppercase">Izango 360</span>
            <span>© 2026 Izango 360 SAC - Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-6 mt-2 md:mt-0 text-slate-400">
            <span className="hover:text-[#75ff9e] transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#75ff9e] rounded-full animate-pulse"></span>
              Servidores Operacionales
            </span>
            <a className="hover:text-[#75ff9e] transition-colors" href="#soporte">Soporte Técnico</a>
            <a className="hover:text-[#75ff9e] transition-colors" href="#api-docs">API Docs</a>
          </div>
        </footer>

      </main>

      {/* Slide-out ZIGI AI Chat Widget Drawer */}
      <ZigiChatWidget
        client={activeClient}
        isOpen={isZigiChatOpen}
        onClose={() => setIsZigiChatOpen(false)}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditClientOpen}
        onClose={() => setIsEditClientOpen(false)}
        client={activeClient}
        onSave={handleSaveClient}
      />

      {/* New Opportunity Pipeline Modal */}
      <NewOpportunityModal
        isOpen={isNewOpportunityOpen}
        onClose={() => setIsNewOpportunityOpen(false)}
        onAdd={handleAddOpportunity}
      />

      {/* Add Key Contact Modal */}
      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        onAdd={handleAddContact}
      />

    </div>
  );
}
