import { ExtendedProject, PaymentRequest, ProjectSettlement } from "../types";

export const initialPaymentRequests: PaymentRequest[] = [
  {
    id: "RQ-2026-001",
    projectId: "PRJ-00452",
    projectName: "Mantenimiento Preventivo 2024",
    clientName: "Honda del Perú S.A.",
    amount: 15400,
    concept: "Compra de Repuestos de Motor y Lubricantes Certificados",
    status: "Aprobado",
    requester: "Ana Lucía Meléndez",
    date: "2026-07-10",
    items: [
      { description: "Filtros de aceite industriales HeavyDuty", quantity: 20, unitPrice: 220, total: 4400 },
      { description: "Lubricante Sintético de Alto Rendimiento SAE 5W-30", quantity: 15, unitPrice: 400, total: 6000 },
      { description: "Correas de distribución reforzadas de kevlar", quantity: 10, unitPrice: 500, total: 5000 }
    ],
    approvals: [
      { role: "Líder Técnico", user: "Ana Lucía Meléndez", status: "Aprobado", date: "2026-07-10", comment: "Validado técnicamente según plan de mantenimiento" },
      { role: "Gerente de Finanzas", user: "Vanessa Chávez", status: "Aprobado", date: "2026-07-11", comment: "Presupuesto verificado e imputado" },
      { role: "Director de Operaciones", user: "Paolo Bastianelli", status: "Aprobado", date: "2026-07-12", comment: "Firma digital corporativa completada" }
    ]
  },
  {
    id: "RQ-2026-002",
    projectId: "PRJ-00452",
    projectName: "Mantenimiento Preventivo 2024",
    clientName: "Honda del Perú S.A.",
    amount: 8500,
    concept: "Contratación de Servicios Técnicos Tercerizados Especializados",
    status: "Pendiente",
    requester: "Ana Lucía Meléndez",
    date: "2026-07-14",
    items: [
      { description: "Técnico especialista en calibración electrónica", quantity: 1, unitPrice: 5000, total: 5000 },
      { description: "Viáticos y movilidad de equipo técnico de campo", quantity: 1, unitPrice: 3500, total: 3500 }
    ],
    approvals: [
      { role: "Líder Técnico", user: "Ana Lucía Meléndez", status: "Aprobado", date: "2026-07-14", comment: "Soporte externo indispensable para fase de calibración" },
      { role: "Gerente de Finanzas", user: "Vanessa Chávez", status: "Pendiente", comment: "Pendiente de adjuntar la orden de servicio" },
      { role: "Director de Operaciones", user: "Paolo Bastianelli", status: "Pendiente de Firma" }
    ]
  },
  {
    id: "RQ-2026-003",
    projectId: "PRJ-00301",
    projectName: "Automatización de Almacén Central",
    clientName: "Alicorp S.A.A.",
    amount: 120000,
    concept: "Adquisición de Sensores IoT y Controladores PLC Siemens S7-1500",
    status: "Aprobado",
    requester: "Renato Quispe",
    date: "2026-07-01",
    items: [
      { description: "PLC Siemens S7-1500 + Módulos I/O analógicos", quantity: 5, unitPrice: 12000, total: 60000 },
      { description: "Sensores láser de distancia industriales Sick", quantity: 30, unitPrice: 1500, total: 45000 },
      { description: "Cableado estructurado industrial LSZH Cat6A (Carretes)", quantity: 5, unitPrice: 3000, total: 15000 }
    ],
    approvals: [
      { role: "Líder Técnico", user: "Renato Quispe", status: "Aprobado", date: "2026-07-01", comment: "Equipos críticos para el control de fajas transportadoras" },
      { role: "Director de Operaciones", user: "Paolo Bastianelli", status: "Aprobado", date: "2026-07-03", comment: "Aprobado por comité directivo extraordinario" }
    ]
  },
  {
    id: "RQ-2026-004",
    projectId: "PRJ-00301",
    projectName: "Automatización de Almacén Central",
    clientName: "Alicorp S.A.A.",
    amount: 35000,
    concept: "Servicios de Integración de Software SCADA con ERP SAP",
    status: "Observado",
    requester: "Renato Quispe",
    date: "2026-07-05",
    items: [
      { description: "Ingeniería de software de comunicación OPC UA", quantity: 1, unitPrice: 20000, total: 20000 },
      { description: "Pruebas de conectividad y mapeo de base de datos SAP", quantity: 1, unitPrice: 15000, total: 15000 }
    ],
    approvals: [
      { role: "Líder Técnico", user: "Renato Quispe", status: "Aprobado", date: "2026-07-05", comment: "Hito de integración de base de datos" },
      { role: "Director de Operaciones", user: "Paolo Bastianelli", status: "Observado", date: "2026-07-07", comment: "Tarifa por hora del consultor excede el tarifario estándar acordado. Revisar propuesta comercial." }
    ]
  },
  {
    id: "RQ-2026-005",
    projectId: "PRJ-00210",
    projectName: "Auditoría de Seguridad de Cuentas",
    clientName: "Interbank S.A.",
    amount: 15000,
    concept: "Licencias de Escáner de Vulnerabilidades Nessus Professional",
    status: "Aprobado",
    requester: "Fernando Salas",
    date: "2026-07-03",
    items: [
      { description: "Suscripción Nessus Professional 1 Año", quantity: 2, unitPrice: 7500, total: 15000 }
    ],
    approvals: [
      { role: "Líder Técnico", user: "Fernando Salas", status: "Aprobado", date: "2026-07-03", comment: "Herramienta homologada para auditoría de Redes Q3" },
      { role: "Director de Operaciones", user: "Paolo Bastianelli", status: "Aprobado", date: "2026-07-04", comment: "Adquisición estándar en línea de seguridad" }
    ]
  }
];

export const initialProjectSettlements: ProjectSettlement[] = [
  {
    id: "LIQ-001",
    projectId: "PRJ-00388",
    projectName: "Expansión Selva - Redes",
    clientName: "Honda del Perú S.A.",
    budget: 68000,
    actualCost: 62500,
    deviation: -5500,
    savings: 5500,
    settledAt: "2026-07-01",
    settledBy: "Paolo Bastianelli",
    status: "Liquidado",
    observations: "Proyecto concluido exitosamente en Pucallpa y Tarapoto. Se logró un ahorro del 8% en viáticos y subcontratación de fibra óptica debido a sinergia con proveedor local.",
    approvals: [
      { role: "Líder Operaciones", user: "Carlos Ruiz", status: "Aprobado" },
      { role: "KAM / Director ERP", user: "Paolo Bastianelli", status: "Aprobado" }
    ]
  },
  {
    id: "LIQ-002",
    projectId: "PRJ-00452",
    projectName: "Mantenimiento Preventivo 2024",
    clientName: "Honda del Perú S.A.",
    budget: 42000,
    actualCost: 44200,
    deviation: 2200,
    savings: 0,
    status: "Borrador",
    observations: "Pre-liquidación técnica en curso. Se observa una desviación de $2,200 por incremento imprevisto de repuestos importados debido a tasas aduaneras. Se propone compensar en fase final.",
    approvals: [
      { role: "Líder Operaciones", user: "Ana Lucía Meléndez", status: "Pendiente" },
      { role: "KAM / Director ERP", user: "Paolo Bastianelli", status: "Pendiente" }
    ]
  }
];

export const mockExtendedProjects: ExtendedProject[] = [
  {
    id: "PRJ-00452",
    name: "Mantenimiento Preventivo 2024",
    leader: "Ana Lucía",
    progress: 75,
    status: "En Ejecución",
    amount: 42000,
    clientName: "Honda del Perú S.A.",
    clientId: "honda-peru",
    startDate: "2026-01-15",
    endDate: "2026-08-30",
    description: "Inspección técnica anual de fajas mecánicas, calibración de sensores de seguridad y lubricación de motores de alta tracción en las plantas de ensamblaje.",
    milestones: [
      { id: "M1", name: "Diagnóstico inicial de desgaste de motores", progress: 100, dueDate: "2026-02-15", status: "Completado" },
      { id: "M2", name: "Adquisición de lubricantes y repuestos certificados", progress: 100, dueDate: "2026-04-10", status: "Completado" },
      { id: "M3", name: "Recalibración electrónica y cambio de filtros", progress: 70, dueDate: "2026-07-15", status: "En Proceso" },
      { id: "M4", name: "Pruebas de estrés mecánico y emisión de acta", progress: 0, dueDate: "2026-08-20", status: "Pendiente" }
    ],
    logisticsMapUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-0mBeiSbC7B9BBYqXeHbHaUpxVSbsoIxGa4L-NE8bOyaEhynwpYYcftjBUFijwdHK7ylZMZ75oIVoqCeIj_P_-uvMcNd6O8-dC0dIJGlbVGjYT-YM0iVLcwQ5dG3dgYqBpP5vqMKECU_sg-9SH7maMmlVFz2JCNtxZeCNcnl1WrrsSBahRCiOe2aM-n6OhbNDZMTOlgHrO12CUA-6M6p0-mb7TjbE3FaBxb3afEXgelr-cOfnc6vUptI1Jtx7WdUoUDx9hV-uKO0g",
    paymentRequests: [], // will load dynamically
    settlement: undefined
  },
  {
    id: "PRJ-00458",
    name: "Capacitación Staff Senior",
    leader: "Carlos R.",
    progress: 30,
    status: "Planificación",
    amount: 18500,
    clientName: "Honda del Perú S.A.",
    clientId: "honda-peru",
    startDate: "2026-06-01",
    endDate: "2026-10-15",
    description: "Programa ejecutivo de actualización sobre normativas de seguridad industrial ISO 45001 y automatización de procesos para el equipo de ingenieros senior.",
    milestones: [
      { id: "M1", name: "Definición del sílabo y homologación académica", progress: 100, dueDate: "2026-06-15", status: "Completado" },
      { id: "M2", name: "Contratación de ponentes certificados internacionales", progress: 20, dueDate: "2026-08-01", status: "En Proceso" },
      { id: "M3", name: "Sesiones presenciales de laboratorio de control", progress: 0, dueDate: "2026-09-20", status: "Pendiente" }
    ],
    logisticsMapUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-0mBeiSbC7B9BBYqXeHbHaUpxVSbsoIxGa4L-NE8bOyaEhynwpYYcftjBUFijwdHK7ylZMZ75oIVoqCeIj_P_-uvMcNd6O8-dC0dIJGlbVGjYT-YM0iVLcwQ5dG3dgYqBpP5vqMKECU_sg-9SH7maMmlVFz2JCNtxZeCNcnl1WrrsSBahRCiOe2aM-n6OhbNDZMTOlgHrO12CUA-6M6p0-mb7TjbE3FaBxb3afEXgelr-cOfnc6vUptI1Jtx7WdUoUDx9hV-uKO0g",
    paymentRequests: [],
    settlement: undefined
  },
  {
    id: "PRJ-00388",
    name: "Expansión Selva - Redes",
    leader: "Carlos R.",
    progress: 100,
    status: "Finalizado",
    amount: 68000,
    clientName: "Honda del Perú S.A.",
    clientId: "honda-peru",
    startDate: "2025-09-01",
    endDate: "2026-06-30",
    description: "Instalación y configuración de fibra óptica aérea, routers industriales CISCO y repetidores satelitales en las sucursales de Pucallpa e Iquitos.",
    milestones: [
      { id: "M1", name: "Relevamiento de terreno e ingeniería de detalle", progress: 100, dueDate: "2025-10-15", status: "Completado" },
      { id: "M2", name: "Tendido de cableado de fibra óptica y repetidores", progress: 100, dueDate: "2025-02-10", status: "Completado" },
      { id: "M3", name: "Configuración y pruebas de redundancia satelital", progress: 100, dueDate: "2026-06-25", status: "Completado" }
    ],
    logisticsMapUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-0mBeiSbC7B9BBYqXeHbHaUpxVSbsoIxGa4L-NE8bOyaEhynwpYYcftjBUFijwdHK7ylZMZ75oIVoqCeIj_P_-uvMcNd6O8-dC0dIJGlbVGjYT-YM0iVLcwQ5dG3dgYqBpP5vqMKECU_sg-9SH7maMmlVFz2JCNtxZeCNcnl1WrrsSBahRCiOe2aM-n6OhbNDZMTOlgHrO12CUA-6M6p0-mb7TjbE3FaBxb3afEXgelr-cOfnc6vUptI1Jtx7WdUoUDx9hV-uKO0g",
    paymentRequests: [],
    settlement: undefined // will load dynamically
  },
  {
    id: "PRJ-00301",
    name: "Automatización de Almacén Central",
    leader: "Renato Q.",
    progress: 85,
    status: "En Ejecución",
    amount: 320000,
    clientName: "Alicorp S.A.A.",
    clientId: "alicorp",
    startDate: "2025-11-01",
    endDate: "2026-09-15",
    description: "Implementación de fajas transportadoras inteligentes, sensores de proximidad e integración SCADA con el sistema central SAP ERP de Alicorp.",
    milestones: [
      { id: "M1", name: "Planificación de fajas transportadoras de rodillos", progress: 100, dueDate: "2025-12-15", status: "Completado" },
      { id: "M2", name: "Instalación física de sensores láser y PLC Siemens", progress: 100, dueDate: "2026-03-30", status: "Completado" },
      { id: "M3", name: "Conectividad de software SCADA a base de datos SAP", progress: 60, dueDate: "2026-08-01", status: "En Proceso" }
    ],
    logisticsMapUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-0mBeiSbC7B9BBYqXeHbHaUpxVSbsoIxGa4L-NE8bOyaEhynwpYYcftjBUFijwdHK7ylZMZ75oIVoqCeIj_P_-uvMcNd6O8-dC0dIJGlbVGjYT-YM0iVLcwQ5dG3dgYqBpP5vqMKECU_sg-9SH7maMmlVFz2JCNtxZeCNcnl1WrrsSBahRCiOe2aM-n6OhbNDZMTOlgHrO12CUA-6M6p0-mb7TjbE3FaBxb3afEXgelr-cOfnc6vUptI1Jtx7WdUoUDx9hV-uKO0g",
    paymentRequests: [],
    settlement: undefined
  },
  {
    id: "PRJ-00210",
    name: "Auditoría de Seguridad de Cuentas",
    leader: "Fernando S.",
    progress: 95,
    status: "En Ejecución",
    amount: 85000,
    clientName: "Interbank S.A.",
    clientId: "interbank",
    startDate: "2026-04-01",
    endDate: "2026-08-01",
    description: "Revisión integral de endpoints, escaneo de puertos, pruebas de pentesting externo y auditoría de accesos a bases de datos de tarjetahabientes.",
    milestones: [
      { id: "M1", name: "Homologación de alcance y NDA firmado", progress: 100, dueDate: "2026-04-15", status: "Completado" },
      { id: "M2", name: "Escaneo automatizado de vulnerabilidades de red", progress: 100, dueDate: "2026-05-30", status: "Completado" },
      { id: "M3", name: "Simulaciones de Pentesting de Red Interna", progress: 90, dueDate: "2026-07-20", status: "En Proceso" }
    ],
    logisticsMapUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-0mBeiSbC7B9BBYqXeHbHaUpxVSbsoIxGa4L-NE8bOyaEhynwpYYcftjBUFijwdHK7ylZMZ75oIVoqCeIj_P_-uvMcNd6O8-dC0dIJGlbVGjYT-YM0iVLcwQ5dG3dgYqBpP5vqMKECU_sg-9SH7maMmlVFz2JCNtxZeCNcnl1WrrsSBahRCiOe2aM-n6OhbNDZMTOlgHrO12CUA-6M6p0-mb7TjbE3FaBxb3afEXgelr-cOfnc6vUptI1Jtx7WdUoUDx9hV-uKO0g",
    paymentRequests: [],
    settlement: undefined
  }
];
