import React, { useState } from "react";
import {
  Sparkles, Briefcase, Plus, User, ArrowUpRight, CheckCircle, Clock,
  Calendar, Layers, DollarSign, ShieldAlert, CheckSquare, Settings,
  ChevronRight, ArrowLeft, Trash2, Eye, MapPin, Edit3, Clipboard, FileText,
  AlertTriangle, RefreshCw, Check, X, ShieldCheck, Heart
} from "lucide-react";
import { CRMClient, CRMProject, ExtendedProject, PaymentRequest, ProjectSettlement, RQItem } from "../types";
import { mockExtendedProjects, initialPaymentRequests, initialProjectSettlements } from "../data/mockExtendedProjects";

interface ProjectsModuleProps {
  clients: CRMClient[];
  setClients: React.Dispatch<React.SetStateAction<CRMClient[]>>;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export function ProjectsModule({
  clients,
  setClients,
  isDarkMode,
  showToast
}: ProjectsModuleProps) {
  // Operational state managers for multi-screen system
  const [currentSubView, setCurrentSubView] = useState<"list" | "detail" | "rq-detail" | "rq-edit" | "settlement">("list");
  
  // High-Density Filter variables for Project List
  const [filterSector, setFilterSector] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");

  // Target object state management
  const [extendedProjects, setExtendedProjects] = useState<ExtendedProject[]>(mockExtendedProjects);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(initialPaymentRequests);
  const [projectSettlements, setProjectSettlements] = useState<ProjectSettlement[]>(initialProjectSettlements);

  // Selected Object IDs
  const [selectedProjectId, setSelectedProjectId] = useState<string>("PRJ-00452");
  const [selectedRQId, setSelectedRQId] = useState<string>("RQ-2026-001");

  // New Project State (used for quick creation form)
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLeader, setNewProjectLeader] = useState("Ana Lucía");
  const [newProjectBudget, setNewProjectBudget] = useState("75000");
  const [targetClientId, setTargetClientId] = useState(clients[0]?.id || "");

  // Form states for creating/editing RQs
  const [rqFormRequester, setRqFormRequester] = useState("Ana Lucía Meléndez");
  const [rqFormConcept, setRqFormConcept] = useState("");
  const [rqFormItems, setRqFormItems] = useState<RQItem[]>([
    { description: "Item Nuevo 1", quantity: 1, unitPrice: 100, total: 100 }
  ]);

  // Form states for Settle project
  const [settleActualCost, setSettleActualCost] = useState<number>(0);
  const [settleObservations, setSettleObservations] = useState("");
  const [settleChecklists, setSettleChecklists] = useState({
    deliverables: true,
    kamSigned: true,
    securityAudited: false,
    billingCompleted: false
  });

  // Derived calculations
  const totalOperationalBudget = extendedProjects.reduce((acc, p) => acc + p.amount, 0);
  const activeTechnicalExecCount = extendedProjects.filter(p => p.status === "En Ejecución").length;
  const activeTechnicalPlanCount = extendedProjects.filter(p => p.status === "Planificación").length;
  const completedProjectsCount = extendedProjects.filter(p => p.status === "Finalizado").length;

  const sectorsList = ["Todos", "Automotriz", "Consumo Masivo", "Financiero"];
  const statusList = ["Todos", "En Ejecución", "Planificación", "Finalizado"];

  // Fetching target objects based on selections
  const activeProject = extendedProjects.find(p => p.id === selectedProjectId) || extendedProjects[0];
  const activeRQ = paymentRequests.find(r => r.id === selectedRQId) || paymentRequests[0];

  // Load associated RQs for the active project
  const activeProjectRQs = paymentRequests.filter(r => r.projectId === activeProject.id);

  // Load settlement for the active project
  const activeProjectSettlement = projectSettlements.find(s => s.projectId === activeProject.id);

  // Filter project list dynamically
  const filteredProjects = extendedProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          p.clientName.toLowerCase().includes(projectSearchQuery.toLowerCase());
    const matchesSector = filterSector === "Todos" || p.clientName.includes(filterSector === "Automotriz" ? "Honda" : filterSector === "Consumo Masivo" ? "Alicorp" : "Interbank");
    const matchesStatus = filterStatus === "Todos" || p.status === filterStatus;
    return matchesSearch && matchesSector && matchesStatus;
  });

  // ----------------------------------------------------
  // Actions handlers
  // ----------------------------------------------------

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = Number(newProjectBudget);
    if (!targetClientId || !newProjectName || isNaN(budget) || budget <= 0) {
      showToast("Completa los campos de proyecto de forma válida.");
      return;
    }

    const clientObj = clients.find(c => c.id === targetClientId);
    const clientName = clientObj ? clientObj.name : "Cliente Desconocido";

    const newProj: ExtendedProject = {
      id: "PRJ-" + Math.floor(10000 + Math.random() * 90000),
      name: newProjectName,
      leader: newProjectLeader,
      progress: 0,
      status: "Planificación",
      amount: budget,
      clientName: clientName,
      clientId: targetClientId,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "Ampliación de servicios técnicos e ingeniería operativa planificada por el KAM de la cuenta.",
      milestones: [
        { id: "M1", name: "Estudio de ingeniería de alcance técnico", progress: 0, dueDate: "Fase Inicial", status: "Pendiente" },
        { id: "M2", name: "Ejecución técnica e integración del software", progress: 0, dueDate: "Fase Intermedia", status: "Pendiente" },
        { id: "M3", name: "Pruebas integrales de estrés técnico y cierre", progress: 0, dueDate: "Hito Final", status: "Pendiente" }
      ],
      paymentRequests: []
    };

    setExtendedProjects(prev => [newProj, ...prev]);

    // Sync CRM Client database
    setClients(prev => prev.map(c => {
      if (c.id === targetClientId) {
        return {
          ...c,
          projectsCount: c.projectsCount + 1,
          projects: [...c.projects, {
            id: newProj.id,
            name: newProj.name,
            leader: newProj.leader,
            progress: 0,
            status: "Planificación",
            amount: newProj.amount
          }],
          activities: [
            {
              id: "act-ext-new-" + Date.now(),
              type: "check",
              title: `Hito Comercial: Nuevo Proyecto ${newProj.id}`,
              description: `Se registró en el ERP el proyecto "${newProj.name}" con un presupuesto de $${newProj.amount.toLocaleString()}.`,
              timestamp: "Hace unos instantes",
              owner: "Operaciones"
            },
            ...c.activities
          ]
        };
      }
      return c;
    }));

    showToast(`Proyecto ${newProj.id} registrado para ${clientName}.`);
    setNewProjectName("");
    setNewProjectBudget("75000");
  };

  // Toggle milestone completion and update overall progress
  const handleToggleMilestone = (projectId: string, milestoneId: string) => {
    setExtendedProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const nextMilestones = p.milestones.map(m => {
          if (m.id === milestoneId) {
            const nextStatus = m.status === "Completado" ? "Pendiente" as const : "Completado" as const;
            return {
              ...m,
              progress: nextStatus === "Completado" ? 100 : 0,
              status: nextStatus
            };
          }
          return m;
        });

        // Calculate overall progress from milestones
        const completedCount = nextMilestones.filter(m => m.status === "Completado").length;
        const totalCount = nextMilestones.length;
        const nextProgress = Math.round((completedCount / (totalCount || 1)) * 100);
        const nextStatus = nextProgress === 100 ? "Finalizado" as const : "En Ejecución" as const;

        // Sync with CRM main Clients
        setClients(crmPrev => crmPrev.map(c => {
          if (c.id === p.clientId) {
            return {
              ...c,
              projects: c.projects.map(cp => cp.id === projectId ? { ...cp, progress: nextProgress, status: nextStatus } : cp)
            };
          }
          return c;
        }));

        return {
          ...p,
          milestones: nextMilestones,
          progress: nextProgress,
          status: nextStatus
        };
      }
      return p;
    }));

    showToast("Hito técnico actualizado. Progreso del proyecto sincronizado.");
  };

  // Approve / Reject Payment Request
  const handleUpdateRQStatus = (rqId: string, nextStatus: "Aprobado" | "Pendiente" | "Observado" | "Borrador", comment?: string) => {
    setPaymentRequests(prev => prev.map(r => {
      if (r.id === rqId) {
        // Append log step
        const nextApprovals = [
          ...r.approvals,
          {
            role: "Control de Proyectos",
            user: "Paolo Bastianelli (KAM)",
            status: nextStatus === "Observado" ? "Observado" as const : "Aprobado" as const,
            date: new Date().toISOString().split("T")[0],
            comment: comment || (nextStatus === "Aprobado" ? "Solicitud aprobada técnicamente" : "Observaciones técnicas añadidas")
          }
        ];
        return {
          ...r,
          status: nextStatus,
          approvals: nextApprovals
        };
      }
      return r;
    }));

    showToast(`Solicitud de Pago ${rqId} configurada como: ${nextStatus}.`);
  };

  // Open RQ Edit Form
  const handleOpenRQEdit = (rq: PaymentRequest) => {
    setSelectedRQId(rq.id);
    setRqFormRequester(rq.requester);
    setRqFormConcept(rq.concept);
    setRqFormItems([...rq.items]);
    setCurrentSubView("rq-edit");
  };

  // Open RQ Create Form (New)
  const handleOpenRQCreate = () => {
    const tempId = "RQ-TEMP-" + Date.now();
    const newRQ: PaymentRequest = {
      id: "RQ-2026-" + Math.floor(100 + Math.random() * 900),
      projectId: activeProject.id,
      projectName: activeProject.name,
      clientName: activeProject.clientName,
      amount: 0,
      concept: "",
      status: "Pendiente",
      requester: "Paolo Bastianelli",
      date: new Date().toISOString().split("T")[0],
      items: [{ description: "Servicio Técnico Inicial", quantity: 1, unitPrice: 2000, total: 2000 }],
      approvals: [
        { role: "Líder Técnico", user: "Paolo Bastianelli", status: "Pendiente", date: new Date().toISOString().split("T")[0], comment: "Ingreso inicial de gastos" }
      ]
    };
    
    // Add to list, select it, and open editor
    setPaymentRequests(prev => [...prev, newRQ]);
    handleOpenRQEdit(newRQ);
  };

  // Save / Update RQ
  const handleSaveRQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rqFormConcept) {
      showToast("Ingresa un concepto descriptivo para la RQ.");
      return;
    }

    const calculatedTotal = rqFormItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);

    setPaymentRequests(prev => prev.map(r => {
      if (r.id === selectedRQId) {
        return {
          ...r,
          requester: rqFormRequester,
          concept: rqFormConcept,
          items: rqFormItems,
          amount: calculatedTotal
        };
      }
      return r;
    }));

    showToast(`Solicitud de Pago ${selectedRQId} guardada exitosamente.`);
    setCurrentSubView("rq-detail");
  };

  // Settle / Settle Form open
  const handleOpenSettle = (proj: ExtendedProject) => {
    setSelectedProjectId(proj.id);
    setSettleActualCost(proj.amount);
    setSettleObservations(
      proj.progress === 100 
        ? "Cierre técnico operativo completo. Todas las fases de entrega técnica fueron completadas según el acuerdo." 
        : "Liquidación anticipada de proyecto comercial en curso."
    );
    setCurrentSubView("settlement");
  };

  // Settle Action
  const handleProcessSettlement = (status: "Borrador" | "Pre-Liquidado" | "Liquidado") => {
    const deviation = settleActualCost - activeProject.amount;
    const savings = deviation < 0 ? Math.abs(deviation) : 0;

    const newSettle: ProjectSettlement = {
      id: "LIQ-" + Math.floor(100 + Math.random() * 900),
      projectId: activeProject.id,
      projectName: activeProject.name,
      clientName: activeProject.clientName,
      budget: activeProject.amount,
      actualCost: settleActualCost,
      deviation: deviation,
      savings: savings,
      settledAt: status === "Liquidado" ? new Date().toISOString().split("T")[0] : undefined,
      settledBy: status === "Liquidado" ? "Paolo Bastianelli (KAM)" : undefined,
      status: status,
      observations: settleObservations,
      approvals: [
        { role: "Líder Operaciones", user: activeProject.leader, status: status === "Liquidado" ? "Aprobado" : "Pendiente" },
        { role: "KAM / Director ERP", user: "Paolo Bastianelli", status: status === "Liquidado" ? "Aprobado" : "Pendiente" }
      ]
    };

    // Update settlements
    setProjectSettlements(prev => {
      const filtered = prev.filter(s => s.projectId !== activeProject.id);
      return [newSettle, ...filtered];
    });

    // Update Project Status if Liquidado
    if (status === "Liquidado") {
      setExtendedProjects(prev => prev.map(p => {
        if (p.id === activeProject.id) {
          return {
            ...p,
            status: "Finalizado" as const,
            progress: 100
          };
        }
        return p;
      }));

      // Sync CRM Client database
      setClients(prev => prev.map(c => {
        if (c.id === activeProject.clientId) {
          return {
            ...c,
            projects: c.projects.map(p => p.id === activeProject.id ? { ...p, status: "Finalizado", progress: 100 } : p),
            activities: [
              {
                id: "act-settle-" + Date.now(),
                type: "check",
                title: `Proyecto Liquidado: ${activeProject.id}`,
                description: `Se cerró formalmente la liquidación financiera del proyecto. Costo final: $${settleActualCost.toLocaleString()} (Ahorro: $${savings.toLocaleString()}).`,
                timestamp: "Hace unos instantes",
                owner: "Auditoría Finanzas"
              },
              ...c.activities
            ]
          };
        }
        return c;
      }));
    }

    showToast(`Liquidación para ${activeProject.id} guardada como ${status}.`);
    setCurrentSubView("detail");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ----------------------------------------------------
          SCREEN 1: PROJECT LIST (PORTAFOLIO DE PROYECTOS)
         ---------------------------------------------------- */}
      {currentSubView === "list" && (
        <div className="space-y-6">
          {/* Header Title Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 bg-white p-6 rounded-xl shadow-xs">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-[#75ff9e] bg-slate-900 p-1.5 rounded-lg text-lg">account_tree</span>
                Izango 360 - Lista de Proyectos Integrados
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Seguimiento holístico de hitos, liquidaciones presupuestarias, requerimientos de pago (RQ) y cierres operacionales.
              </p>
            </div>
          </div>

          {/* High-Density KPI Dashboard Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs`}>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Presupuesto en Portafolio</p>
                <p className="text-lg font-black text-slate-900 mt-1">${totalOperationalBudget.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs`}>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">En Ejecución Técnica</p>
                <p className="text-lg font-black text-blue-600 mt-1">{activeTechnicalExecCount} Activos</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs`}>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Fase de Planificación</p>
                <p className="text-lg font-black text-amber-500 mt-1">{activeTechnicalPlanCount} Proyectos</p>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs`}>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cerrados y Liquidados</p>
                <p className="text-lg font-black text-green-600 mt-1">{completedProjectsCount} Entregados</p>
              </div>
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters, Search & Layout Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Area: Project List Table */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  Portafolio de Entregables
                </h3>

                {/* Sub-Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs outline-none"
                  >
                    <option value="Todos">Todos los Sectores</option>
                    <option value="Automotriz">Sector Automotriz</option>
                    <option value="Consumo Masivo">Consumo Masivo</option>
                    <option value="Financiero">Sector Financiero</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs outline-none"
                  >
                    <option value="Todos">Todos los Estados</option>
                    <option value="En Ejecución">En Ejecución</option>
                    <option value="Planificación">Planificación</option>
                    <option value="Finalizado">Finalizados</option>
                  </select>

                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Buscar proyecto..."
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs outline-none w-36 focus:w-48 transition-all"
                  />
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                    <tr>
                      <th className="px-4 py-3">ID / Proyecto</th>
                      <th className="px-4 py-3">Cliente / Sector</th>
                      <th className="px-4 py-3">Líder</th>
                      <th className="px-4 py-3">Progreso</th>
                      <th className="px-4 py-3">Presupuesto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No se encontraron proyectos activos que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((proj) => {
                        const hasLiq = projectSettlements.find(s => s.projectId === proj.id);
                        return (
                          <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => { setSelectedProjectId(proj.id); setCurrentSubView("detail"); }}>
                                {proj.name}
                              </p>
                              <p className="text-[10px] text-slate-400">ID: {proj.id}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-slate-800">{proj.clientName}</p>
                              <p className="text-[10px] text-slate-400">Sector {proj.clientName.includes("Honda") ? "Automotriz" : proj.clientName.includes("Alicorp") ? "Consumo" : "Finanzas"}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                                  {proj.leader.substring(0, 2).toUpperCase()}
                                </span>
                                <span>{proj.leader}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-1 min-w-[70px]">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                  <span>{proj.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${proj.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                                    style={{ width: `${proj.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900">${proj.amount.toLocaleString()}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                proj.status === "En Ejecución" ? "bg-blue-100 text-blue-700" :
                                proj.status === "Planificación" ? "bg-amber-100 text-amber-700" :
                                "bg-emerald-100 text-emerald-700"
                              }`}>
                                {proj.status}
                              </span>
                              {hasLiq && (
                                <span className={`block text-[9px] font-bold text-slate-400 mt-1`}>
                                  {hasLiq.status === "Liquidado" ? "✓ Liquidado" : "⚡ En Liquidación"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => { setSelectedProjectId(proj.id); setCurrentSubView("detail"); }}
                                className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                                title="Ver Detalle de Proyecto"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Area: Sidebar Register form */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Workload stress indicator */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  Carga Laboral de Ingeniería
                </h3>
                <div className="space-y-4">
                  {[
                    { name: "Ana Lucía Meléndez", projects: 3, percent: 80, color: "bg-amber-500" },
                    { name: "Carlos Ruiz", projects: 2, percent: 50, color: "bg-indigo-600" },
                    { name: "Renato Quispe", projects: 1, percent: 30, color: "bg-emerald-500" },
                    { name: "Vanessa Chávez", projects: 1, percent: 25, color: "bg-emerald-500" }
                  ].map((lead) => (
                    <div key={lead.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{lead.name}</span>
                        <span className="text-slate-400">{lead.projects} Hitos Activos</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${lead.color}`} style={{ width: `${lead.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Create */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-black text-xs uppercase tracking-wider">Crear Hito / Proyecto Técnico</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-normal">
                  Inicia un nuevo hito de consultoría, mantenimiento o ingeniería integrada para clientes corporativos autorizados.
                </p>

                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cuenta Cliente</label>
                    <select
                      value={targetClientId}
                      onChange={(e) => setTargetClientId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nombre del Proyecto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Auditoría de Red Inalámbrica Planta Callao"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Líder Técnico</label>
                      <select
                        value={newProjectLeader}
                        onChange={(e) => setNewProjectLeader(e.target.value)}
                        className="w-full px-2 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none"
                      >
                        <option value="Ana Lucía">Ana Lucía</option>
                        <option value="Carlos R.">Carlos R.</option>
                        <option value="Julia M.">Julia M.</option>
                        <option value="Fernando S.">Fernando S.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Presupuesto ($)</label>
                      <input
                        type="number"
                        required
                        value={newProjectBudget}
                        onChange={(e) => setNewProjectBudget(e.target.value)}
                        className="w-full px-3 py-2 bg-[#122131] border border-slate-800 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#75ff9e] hover:bg-[#5aff89] text-[#003918] font-black text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Registrar en ERP Izango
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SCREEN 2: PROJECT DETAIL (DETALLE DE PROYECTO)
         ---------------------------------------------------- */}
      {currentSubView === "detail" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation & actions */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button onClick={() => setCurrentSubView("list")} className="hover:text-indigo-600 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Proyectos
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-bold">Detalle de Proyecto: {activeProject.id}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenSettle(activeProject)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" /> Liquidar Proyecto
              </button>
              <button
                onClick={handleOpenRQCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Crear RQ / Pago
              </button>
            </div>
          </div>

          {/* Project Title and client summary header card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded uppercase tracking-wider border border-indigo-100">
                    {activeProject.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    activeProject.status === "En Ejecución" ? "bg-blue-50 text-blue-700" :
                    activeProject.status === "Planificación" ? "bg-amber-50 text-amber-700" :
                    "bg-emerald-50 text-emerald-700"
                  }`}>
                    {activeProject.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                  {activeProject.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cliente: <strong className="text-slate-800">{activeProject.clientName}</strong> • Líder Técnico Asignado: <strong className="text-slate-800">{activeProject.leader}</strong>
                </p>
              </div>

              {/* Quick statistics breakdown */}
              <div className="flex gap-6 border-l border-slate-100 pl-6 shrink-0 text-right">
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Presupuesto</p>
                  <p className="text-xl font-black text-slate-900">${activeProject.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Progreso Operativo</p>
                  <p className="text-xl font-black text-indigo-600">{activeProject.progress}%</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 border-t border-slate-100 mt-4 pt-4 leading-relaxed font-semibold">
              {activeProject.description}
            </p>
          </div>

          {/* Layout Grid details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Area: Timeline Milestones & Logistics Map */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Timeline Milestones (Hitos) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-slate-500" />
                  Control de Hitos Técnicos (Milestones)
                </h4>

                <div className="space-y-4">
                  {activeProject.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`p-3.5 rounded-lg border transition-all flex items-start gap-3.5 ${
                        milestone.status === "Completado" 
                          ? "bg-slate-50/50 border-slate-200" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <button
                        onClick={() => handleToggleMilestone(activeProject.id, milestone.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                          milestone.status === "Completado"
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white hover:border-indigo-500"
                        }`}
                      >
                        {milestone.status === "Completado" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold text-xs truncate ${milestone.status === "Completado" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                            {milestone.name}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                            milestone.status === "Completado" ? "bg-emerald-50 text-emerald-700" :
                            milestone.status === "En Proceso" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {milestone.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Vencimiento: {milestone.dueDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logistics Map Card (Aida style map representation) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  Mapa de Operación Logística
                </h4>

                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group">
                  <img
                    className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 transition-all duration-700"
                    alt="Map coordinates"
                    src={activeProject.logisticsMapUrl}
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Styled Interactive Overlay HUD indicators */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none"></div>

                  {/* Active coordinates pin overlay */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-ping absolute"></div>
                    <div className="w-5 h-5 rounded-full bg-red-600 border border-white flex items-center justify-center text-white shadow-lg relative">
                      <MapPin className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <div className="mt-1 bg-slate-900/95 border border-slate-700 text-slate-100 text-[10px] px-2 py-1 rounded shadow-xl font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Planta de Entrega {activeProject.id}
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-lg p-2.5 text-white max-w-xs text-[10px] space-y-1">
                    <p className="font-black uppercase tracking-wider text-emerald-400">Coordenadas del Proyecto</p>
                    <p className="text-slate-300 font-mono">LAT: -12.0934 | LON: -77.0123</p>
                    <p className="text-slate-400">Ruta crítica activa: Despacho aduanas a almacén principal.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Area: RQs & Settlements logs */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Payment Requests (RQs) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Solicitudes de Pago (RQs)
                  </h4>
                  <button
                    onClick={handleOpenRQCreate}
                    className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    + Nuevo RQ
                  </button>
                </div>

                <div className="space-y-3">
                  {activeProjectRQs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-medium text-xs">
                      No hay requerimientos de pago registrados para este proyecto técnico.
                    </div>
                  ) : (
                    activeProjectRQs.map((rq) => (
                      <div
                        key={rq.id}
                        onClick={() => { setSelectedRQId(rq.id); setCurrentSubView("rq-detail"); }}
                        className="p-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all rounded-lg cursor-pointer flex justify-between items-center gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate leading-snug">
                            {rq.concept || "Concepto sin registrar"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            ID: {rq.id} • Solicitado por: {rq.requester}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-slate-950">${rq.amount.toLocaleString()}</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-1 ${
                            rq.status === "Aprobado" ? "bg-green-100 text-green-700" :
                            rq.status === "Observado" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {rq.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Settlement Progress & details status box */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight mb-3 flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-slate-500" />
                  Estado de Liquidación ERP
                </h4>

                {activeProjectSettlement ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          activeProjectSettlement.status === "Liquidado" ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                          {activeProjectSettlement.status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">ID Acta: {activeProjectSettlement.id}</p>
                      </div>

                      {activeProjectSettlement.status === "Liquidado" && (
                        <div className="p-1 bg-green-500 text-white rounded-full">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-slate-800">
                      <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Costo Real Soportado</p>
                        <p className="text-xs font-black">${activeProjectSettlement.actualCost.toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Ahorro Generado</p>
                        <p className={`text-xs font-black ${activeProjectSettlement.savings > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          ${activeProjectSettlement.savings.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-100 font-semibold">
                      "{activeProjectSettlement.observations}"
                    </p>

                    {activeProjectSettlement.status !== "Liquidado" && (
                      <button
                        onClick={() => handleOpenSettle(activeProject)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Continuar Liquidación de Obra
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Este proyecto aún no ha iniciado su fase de liquidación comercial.</p>
                    <p className="text-[10px] text-slate-500">Un proyecto puede ser pre-liquidado en cualquier fase para controlar desvíos de caja.</p>
                    <button
                      onClick={() => handleOpenSettle(activeProject)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors"
                    >
                      Iniciar Liquidación Presupuestaria
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SCREEN 3: PAYMENT REQUEST DETAIL (DETALLE DE RQ)
         ---------------------------------------------------- */}
      {currentSubView === "rq-detail" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button onClick={() => setCurrentSubView("detail")} className="hover:text-indigo-600 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Detalle de Proyecto
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-bold">Solicitud de Pago: {activeRQ.id}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenRQEdit(activeRQ)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Solicitud
              </button>
              
              {activeRQ.status === "Pendiente" && (
                <>
                  <button
                    onClick={() => handleUpdateRQStatus(activeRQ.id, "Observado")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Observar
                  </button>
                  <button
                    onClick={() => handleUpdateRQStatus(activeRQ.id, "Aprobado")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Aprobar RQ
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RQ Header sheet */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-5 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded border border-indigo-100 uppercase">
                    Requerimiento de Pago
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    activeRQ.status === "Aprobado" ? "bg-green-100 text-green-700" :
                    activeRQ.status === "Observado" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {activeRQ.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {activeRQ.concept}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ID Código: <strong className="text-slate-700">{activeRQ.id}</strong> • Vinculado al Proyecto: <strong className="text-slate-700">{activeRQ.projectName}</strong>
                </p>
              </div>

              {/* Amount visual label */}
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Solicitado (USD)</p>
                <p className="text-2xl font-black text-slate-900">${activeRQ.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Fecha de registro: {activeRQ.date}</p>
              </div>
            </div>

            {/* Requester meta detail */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 font-semibold">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Usuario Solicitante</p>
                <p className="text-slate-900 font-extrabold">{activeRQ.requester}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Cuenta de Cargo</p>
                <p className="text-slate-900 font-extrabold">{activeRQ.clientName}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Clasificación Presupuesto</p>
                <p className="text-slate-900 font-extrabold">Operaciones / Mantenimiento Técnico</p>
              </div>
            </div>
          </div>

          {/* Layout Split: Line Items & Workflow approvals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Area: Line items breakdown table */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight mb-4 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Desglose de Líneas de Gasto (Items)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black tracking-wider uppercase text-[9px]">
                    <tr>
                      <th className="px-4 py-2.5">Descripción del Item</th>
                      <th className="px-4 py-2.5 text-center">Cant.</th>
                      <th className="px-4 py-2.5 text-right">Precio Unit.</th>
                      <th className="px-4 py-2.5 text-right">Total Linea</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {activeRQ.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-900">{it.description}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-500">${it.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">${(it.quantity * it.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Box breakdown card */}
              <div className="border-t border-slate-100 mt-6 pt-4 flex flex-col items-end text-xs font-semibold text-slate-500 space-y-1.5">
                <div className="flex justify-between w-64">
                  <span>Subtotal Neto:</span>
                  <span className="text-slate-800">${(activeRQ.amount * 0.82).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64">
                  <span>IGV Tributario (18%):</span>
                  <span className="text-slate-800">${(activeRQ.amount * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64 border-t border-slate-200 pt-2 text-sm font-black text-slate-950">
                  <span>Total Neto Aprobado:</span>
                  <span>${activeRQ.amount.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            {/* Right Area: Verticle Workflow approval timeline */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight mb-5 flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-slate-500" />
                Workflow y Log del Canal de Aprobación
              </h4>

              {/* approval timeline items */}
              <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                {activeRQ.approvals.map((app, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle indicators color coded */}
                    <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${
                      app.status === "Aprobado" ? "bg-emerald-500" :
                      app.status === "Observado" ? "bg-red-500" : "bg-amber-400"
                    }`}>
                      {app.status === "Aprobado" ? <Check className="w-2.5 h-2.5 text-white stroke-[3]" /> : null}
                    </span>

                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-900 text-xs">{app.role}</p>
                        <span className="text-[9px] text-slate-400 font-bold">{app.date || "Pendiente"}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold">{app.user}</p>
                      
                      {app.comment && (
                        <p className="text-[10px] text-slate-500 italic border-t border-slate-200/50 mt-2 pt-1.5 leading-normal font-medium">
                          "{app.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SCREEN 4: EDIT RQ (EDITAR / CREAR SOLICITUD DE PAGO)
         ---------------------------------------------------- */}
      {currentSubView === "rq-edit" && (
        <div className="space-y-6">
          {/* Header breadcrumbs */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button onClick={() => setCurrentSubView("rq-detail")} className="hover:text-indigo-600 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Detalle de RQ
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-bold">Edición / Modificación de RQ: {selectedRQId}</span>
            </div>
          </div>

          <form onSubmit={handleSaveRQ} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-4.5 h-4.5 text-indigo-600" />
                Formulario de Modificación Presupuestaria de RQ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Sube, elimina o modifica líneas de gasto específicas para revisión del comité financiero.</p>
            </div>

            {/* Meta Fields group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre Solicitante</label>
                <input
                  type="text"
                  required
                  value={rqFormRequester}
                  onChange={(e) => setRqFormRequester(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Concepto General del Pago</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra urgente de repuestos para fajas de motor"
                  value={rqFormConcept}
                  onChange={(e) => setRqFormConcept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Items Dynamic Rows Creator */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Desglose de Líneas de Items</h4>
                <button
                  type="button"
                  onClick={() => setRqFormItems([...rqFormItems, { description: "Línea nueva", quantity: 1, unitPrice: 100, total: 100 }])}
                  className="px-2.5 py-1 bg-slate-100 text-indigo-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  + Añadir Item
                </button>
              </div>

              {/* Items mapping rows */}
              <div className="space-y-3">
                {rqFormItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-end p-3 bg-slate-50 rounded-lg border border-slate-150">
                    <div className="flex-1">
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Descripción del Item / Servicio</label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRqFormItems(prev => prev.map((it, i) => i === idx ? { ...it, description: val } : it));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Cantidad</label>
                      <input
                        type="number"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRqFormItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val, total: val * it.unitPrice } : it));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="w-32">
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Precio Unitario ($)</label>
                      <input
                        type="number"
                        required
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRqFormItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: val, total: it.quantity * val } : it));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Total</p>
                      <p className="font-extrabold text-xs text-slate-900 py-1.5">${(item.quantity * item.unitPrice).toLocaleString()}</p>
                    </div>

                    <button
                      type="button"
                      disabled={rqFormItems.length === 1}
                      onClick={() => setRqFormItems(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* grand total estimation banner */}
            <div className="flex justify-between items-center bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl">
              <div>
                <p className="text-xs font-bold text-indigo-700">Estimación Total Solicitada</p>
                <p className="text-[10px] text-slate-400 mt-0.5">El monto incluye estimación de tasas tributarias IGV local.</p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-slate-400">Total General (USD)</p>
                <p className="text-lg font-black text-slate-950">
                  ${rqFormItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0).toLocaleString()} USD
                </p>
              </div>
            </div>

            {/* save buttons form footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentSubView("rq-detail")}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancelar Edición
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg transition-colors shadow-xs"
              >
                Guardar Cambios RQ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------
          SCREEN 5: PROJECT SETTLEMENT (LIQUIDACIÓN DE PROYECTO)
         ---------------------------------------------------- */}
      {currentSubView === "settlement" && (
        <div className="space-y-6">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button onClick={() => setCurrentSubView("detail")} className="hover:text-indigo-600 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Volver al Proyecto
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-bold">Liquidación de Obra: {activeProject.id}</span>
            </div>
          </div>

          {/* Settle main sheet form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Clipboard className="w-4.5 h-4.5 text-indigo-600" />
                  Liquidación y Acta de Cierre Técnico-Financiero
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Audita costos de RQs, evalúa la desviación con el presupuesto base, y concluye el proyecto.</p>
              </div>

              <span className="px-2 py-0.5 bg-slate-950 text-[#75ff9e] text-[9px] font-black rounded uppercase border border-slate-800 shrink-0">
                Módulo Auditoría ERP
              </span>
            </div>

            {/* Budget vs Actual Comparison Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-150">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Presupuesto Inicial ERP</p>
                <p className="text-lg font-black text-slate-900">${activeProject.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Registrado el {activeProject.startDate}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Costo Real Soportado (USD)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settleActualCost}
                    onChange={(e) => setSettleActualCost(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-200 text-slate-950 text-sm font-black rounded w-32 outline-none"
                  />
                  <span className="text-xs text-slate-400 font-bold">Editar</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Prefill del presupuesto base. Modificable.</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Desviación Presupuestaria</p>
                {settleActualCost - activeProject.amount < 0 ? (
                  <p className="text-lg font-black text-emerald-600">
                    -${Math.abs(settleActualCost - activeProject.amount).toLocaleString()} (Ahorro)
                  </p>
                ) : settleActualCost - activeProject.amount > 0 ? (
                  <p className="text-lg font-black text-red-600">
                    +${Math.abs(settleActualCost - activeProject.amount).toLocaleString()} (Sobrecosto)
                  </p>
                ) : (
                  <p className="text-lg font-black text-slate-500">$0 (Sin desviación)</p>
                )}
                <p className="text-[9px] text-slate-400 mt-1">Margen final del proyecto.</p>
              </div>
            </div>

            {/* Checklist checks of deliverables */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wide">Actividades Requeridas de Cierre Legal</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settleChecklists.deliverables}
                    onChange={(e) => setSettleChecklists({ ...settleChecklists, deliverables: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Entregables Técnicos Aprobados por Cliente</p>
                    <p className="text-[9px] text-slate-400">Verificado según el hito de aceptación final del proyecto.</p>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settleChecklists.kamSigned}
                    onChange={(e) => setSettleChecklists({ ...settleChecklists, kamSigned: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Acta de Recepción Firmada por el KAM</p>
                    <p className="text-[9px] text-slate-400">Certifica que el Key Account Manager validó los alcances.</p>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settleChecklists.securityAudited}
                    onChange={(e) => setSettleChecklists({ ...settleChecklists, securityAudited: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Auditoría de Red y Seguridad Completada</p>
                    <p className="text-[9px] text-slate-400">Requerimiento de cumplimiento normativo ISO 27001 local.</p>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settleChecklists.billingCompleted}
                    onChange={(e) => setSettleChecklists({ ...settleChecklists, billingCompleted: e.target.checked })}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Facturación Final Emitida y Cobrada</p>
                    <p className="text-[9px] text-slate-400">Sincronización con el canal de tesorería y finanzas.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Observations text area */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Observaciones / Conclusiones Generales del Proyecto</label>
              <textarea
                rows={3}
                required
                value={settleObservations}
                onChange={(e) => setSettleObservations(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                placeholder="Escribe un resumen formal de cierre, desviaciones presupuestarias, felicitaciones al equipo u observaciones para el reporte comercial."
              />
            </div>

            {/* Settle Action buttons footer */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold leading-normal max-w-sm">
                * Al presionar "Liquidar y Cerrar", el proyecto cambiará automáticamente a estado <strong>Finalizado</strong>, se creará el acta de liquidación formal, e impactará el LTV comercial.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessSettlement("Borrador")}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessSettlement("Pre-Liquidado")}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Pre-Liquidar
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessSettlement("Liquidado")}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-[#75ff9e] font-black text-xs rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  Liquidar y Cerrar Hito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
