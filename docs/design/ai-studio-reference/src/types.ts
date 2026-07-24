export interface CRMContact {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  email: string;
  phone: string;
  isKey: boolean;
}

export interface CRMProject {
  id: string;
  name: string;
  leader: string;
  leaderAvatar?: string;
  progress: number; // 0-100
  status: "En Ejecución" | "Planificación" | "Pendiente" | "Finalizado";
  amount: number;
}

export interface CRMActivity {
  id: string;
  type: "email" | "call" | "check" | "meeting" | "system";
  title: string;
  description: string;
  timestamp: string;
  owner: string;
}

export interface CRMInvoice {
  id: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue";
  billingDate: string;
}

export interface CRMDocument {
  id: string;
  name: string;
  category: "Contrato" | "Propuesta" | "NDA" | "Informes";
  size: string;
  updatedAt: string;
  uploadedBy: string;
}

export interface CRMClient {
  id: string;
  name: string;
  isVIP: boolean;
  ruc: string;
  sector: string;
  location: string;
  kam: string;
  logoUrl: string;
  website: string;
  sinceDate: string;
  ltv: number;
  ltvGrowth: string;
  
  // Pipeline Stats
  pipelineOpen: number;
  pipelineOppsCount: number;
  projectsCount: number;
  projectsExecCount: number;
  clientHealthScore: number;
  clientHealthLabel: string;
  pendingDebt: number;
  pendingDebtLabel: string;
  lastInteractionTime: string;
  lastInteractionLabel: string;
  
  // Health Details
  closeProbability: number;
  avgTicket: number;
  daysInCycle: number;
  stuckWarning?: string;
  
  // Address info
  addressName: string;
  addressDetails: string;
  mapEmbedUrl?: string; // fallback stylized representation

  // Relationships
  contacts: CRMContact[];
  projects: CRMProject[];
  activities: CRMActivity[];
  invoices: CRMInvoice[];
  documents: CRMDocument[];
  
  // Strategic AI notes
  insightsAI: string;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  progress: number; // 0-100
  dueDate: string;
  status: "Completado" | "En Proceso" | "Pendiente";
}

export interface RQItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface RQApprovalStep {
  role: string;
  user: string;
  status: "Aprobado" | "Pendiente" | "Observado" | "Pendiente de Firma";
  date?: string;
  comment?: string;
}

export interface PaymentRequest {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  amount: number;
  concept: string;
  status: "Aprobado" | "Pendiente" | "Observado" | "Borrador";
  requester: string;
  date: string;
  items: RQItem[];
  approvals: RQApprovalStep[];
}

export interface ProjectSettlement {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  budget: number;
  actualCost: number;
  deviation: number; // actualCost - budget
  savings: number;
  settledAt?: string;
  settledBy?: string;
  status: "Borrador" | "Pre-Liquidado" | "Liquidado";
  observations: string;
  approvals: { role: string; user: string; status: "Aprobado" | "Pendiente" }[];
}

export interface ExtendedProject extends CRMProject {
  clientName: string;
  clientId: string;
  startDate: string;
  endDate: string;
  description: string;
  milestones: ProjectMilestone[];
  logisticsMapUrl?: string;
  paymentRequests: PaymentRequest[];
  settlement?: ProjectSettlement;
}

