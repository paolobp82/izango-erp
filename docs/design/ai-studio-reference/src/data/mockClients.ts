import { CRMClient } from "../types";

export const mockClients: CRMClient[] = [
  {
    id: "honda-peru",
    name: "Honda del Perú S.A.",
    isVIP: true,
    ruc: "20100123456",
    sector: "Automotriz",
    location: "Lima, Perú",
    kam: "Paolo Bastianelli",
    logoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAANSPHsHRlJptlOVfFyc13KM9sBnRjiQtYqYzowkULDmFJLZiwstWR_V48GCoYCRKudvMECDEe934ikhpNVHFGQaTWiRalli3ZAAZGLr4dUUgqadlJgJBbCwBfal2-H_rBV9YEziC16xXfUQl7bIPxUpS94XqAhAvotTX1XAVcZHaFLsFQvbEBuizyRmyiIj6W4OXFOys4KI9hUpBRtLxYUmkRlC3vej8itNwiHovZVQ5WR9d5zg0muXWOWcLa4zwo8TulZE1ib5A7",
    website: "www.honda.com.pe",
    sinceDate: "Enero 2018",
    ltv: 1420000,
    ltvGrowth: "+12% vs LY",
    pipelineOpen: 450200,
    pipelineOppsCount: 4,
    projectsCount: 12,
    projectsExecCount: 8,
    clientHealthScore: 94,
    clientHealthLabel: "Excelente (Net Promoter Score)",
    pendingDebt: 0,
    pendingDebtLabel: "Al día con pagos",
    lastInteractionTime: "Hoy, 10:45 AM",
    lastInteractionLabel: "Reunión de Status Q3",
    closeProbability: 82,
    avgTicket: 112550,
    daysInCycle: 45,
    stuckWarning: "Hay 1 oportunidad estancada hace más de 15 días.",
    addressName: "Sede Corporativa Surco",
    addressDetails: "Av. Javier Prado Este 1234, Lima 15023, Perú",
    mapEmbedUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeRts-6FB8WWPUHYGdpTOjUJsfVZIv_SohVb9POOar21KrL1WwKY63N9B7Cz0usDPZrWH3K90DfedlVLnNpnOqWdMeT3fhG7ux7vZjdF9pa7O2JfG7IQ-60wQrhL0cmHQlV2tztjVVF-JA_uAEMZ9xQs3NOSU9CvxedIx6FM4I3-O9Z8r992WkMJIdqiLj_dqlTFOjVLS3LgW3ASTgBqc8ZPprRZKPH8zZbF-gQfeOgy4aA0njMEfLF_fNMPDB_BOKO_K6N50OGuwT",
    contacts: [
      {
        id: "m-thorne",
        name: "Mariella Thorne",
        role: "Gerente de Logística",
        avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZ_ghqYnY1E3L3vrbvvC8Sknvpe6cKzy2vSNIDbLn9rOlF8Pz4kRjptifeaewH3lMYsCDyVaTYxIBbIjPkedlodXE6sBt6sTxkM3ikTebAA2afgQcQwRufSWTErNAbuglv_xShxJCyHsxWqFk-8WQxf4VVBGsgyKuPVIQ3tpCcn-2RzSvZhH_KZxONLRysdwsBDr_I3PWrbCvaVDKx7LCiVeK9BqruQEmExtM1F2lKkqO1VKwrEiENHnCHZlqGUkdJoNhCp2OMgNoJ",
        email: "mthorne@honda.com.pe",
        phone: "+51 987 654 321",
        isKey: true
      },
      {
        id: "c-ruiz",
        name: "Carlos Ruiz",
        role: "Director de Compras",
        avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQNcuKNCzWon7pWYtIVKNPGQ53tuonKyCu8O7PfOIGUhfN-OhgI9aLV1rnlC8r5l2MM3PhmcuZwp2LOXL4CVZeaW0-oMu7DTkuYnKItD0-gLMw0S7RNKsa5ZHv-7Ah5PjlvyOmKqkR06Qap_qh4fBDrTGpSSVH7kRyp7LKwTpL9p-DHnVQ_OFdZnouceP3qvln3lM8Te_v33TqdnZ8ChVspi5BMWmkPy5Ki4J7heCsXxok9KdN5ySVgH-oCI1l2DBEFDwA7UEPWkYB",
        email: "cruiz@honda.com.pe",
        phone: "+51 981 123 456",
        isKey: true
      },
      {
        id: "a-lucia",
        name: "Ana Lucía Meléndez",
        role: "Jefa de Proyectos TI",
        avatarUrl: "",
        email: "amelendez@honda.com.pe",
        phone: "+51 999 888 777",
        isKey: false
      },
      {
        id: "j-perez",
        name: "Jorge Pérez",
        role: "Director de Operaciones",
        avatarUrl: "",
        email: "jperez@honda.com.pe",
        phone: "+51 955 444 333",
        isKey: false
      }
    ],
    projects: [
      {
        id: "PRJ-00452",
        name: "Mantenimiento Preventivo 2024",
        leader: "Ana Lucía",
        progress: 75,
        status: "En Ejecución",
        amount: 42000
      },
      {
        id: "PRJ-00458",
        name: "Capacitación Staff Senior",
        leader: "Carlos R.",
        progress: 30,
        status: "Planificación",
        amount: 18500
      },
      {
        id: "PRJ-00511",
        name: "Migración a Nube Híbrida",
        leader: "Ana Lucía",
        progress: 10,
        status: "Planificación",
        amount: 125000
      },
      {
        id: "PRJ-00388",
        name: "Expansión Selva - Redes",
        leader: "Carlos R.",
        progress: 100,
        status: "Finalizado",
        amount: 68000
      }
    ],
    activities: [
      {
        id: "act-1",
        type: "email",
        title: "Email enviado a Carlos Ruiz",
        description: "Seguimiento de propuesta Q4 Automotriz.",
        timestamp: "Hace 2 horas",
        owner: "Paolo Bastianelli"
      },
      {
        id: "act-2",
        type: "check",
        title: "Proyecto \"Expansión Selva\" finalizado",
        description: "Se completó la implementación técnica exitosamente.",
        timestamp: "Ayer, 4:30 PM",
        owner: "Equipo Técnico"
      },
      {
        id: "act-3",
        type: "call",
        title: "Llamada de prospección",
        description: "Conversación sobre nuevos modelos eléctricos 2025.",
        timestamp: "2 de Noviembre",
        owner: "Maria Gomez"
      }
    ],
    invoices: [
      {
        id: "INV-2024-001",
        concept: "Suscripción Trimestral Plataforma Izango 360",
        amount: 15400,
        billingDate: "2026-07-01",
        dueDate: "2026-07-31",
        status: "Paid"
      },
      {
        id: "INV-2024-002",
        concept: "Consultoría de Expansión Logística - Fase 1",
        amount: 32000,
        billingDate: "2026-06-15",
        dueDate: "2026-07-15",
        status: "Paid"
      },
      {
        id: "INV-2024-003",
        concept: "Soporte de Infraestructura Mayo",
        amount: 8500,
        billingDate: "2026-05-30",
        dueDate: "2026-06-30",
        status: "Paid"
      },
      {
        id: "INV-2024-004",
        concept: "Servicios de Capacitación Preventiva (Adelanto)",
        amount: 9250,
        billingDate: "2026-07-10",
        dueDate: "2026-08-10",
        status: "Pending"
      }
    ],
    documents: [
      {
        id: "doc-1",
        name: "Contrato de Servicios Generales 2024.pdf",
        category: "Contrato",
        size: "2.4 MB",
        updatedAt: "2024-01-15",
        uploadedBy: "Paolo Bastianelli"
      },
      {
        id: "doc-2",
        name: "Acuerdo de Confidencialidad NDA - Honda.pdf",
        category: "NDA",
        size: "1.1 MB",
        updatedAt: "2018-02-10",
        uploadedBy: "Legal Izango"
      },
      {
        id: "doc-3",
        name: "Propuesta de Transición Flota Híbrida v2.pdf",
        category: "Propuesta",
        size: "4.8 MB",
        updatedAt: "2026-07-12",
        uploadedBy: "ZIGI AI"
      },
      {
        id: "doc-4",
        name: "Informe Trimestral de Salud Operativa Q2.pdf",
        category: "Informes",
        size: "3.2 MB",
        updatedAt: "2026-07-01",
        uploadedBy: "Equipo Operaciones"
      }
    ],
    insightsAI: "Basado en las últimas interacciones, Honda está priorizando la transición a flota híbrida. Se recomienda presentar el paquete de soporte 'Eco-Fleet' antes del cierre de Q4."
  },
  {
    id: "alicorp",
    name: "Alicorp S.A.A.",
    isVIP: true,
    ruc: "20100123999",
    sector: "Consumo Masivo",
    location: "Callao, Perú",
    kam: "Paolo Bastianelli",
    logoUrl: "", // We can use elegant UI initials with circular background
    website: "www.alicorp.com.pe",
    sinceDate: "Marzo 2019",
    ltv: 2850000,
    ltvGrowth: "+18% vs LY",
    pipelineOpen: 920000,
    pipelineOppsCount: 6,
    projectsCount: 24,
    projectsExecCount: 16,
    clientHealthScore: 97,
    clientHealthLabel: "Excelente (NPS Líder de Mercado)",
    pendingDebt: 12400,
    pendingDebtLabel: "1 Factura pendiente",
    lastInteractionTime: "Ayer, 3:15 PM",
    lastInteractionLabel: "Demo de Optimización de Rutas AI",
    closeProbability: 90,
    avgTicket: 245000,
    daysInCycle: 30,
    stuckWarning: undefined,
    addressName: "Planta Principal Callao",
    addressDetails: "Av. Argentina 4793, Carmen de la Legua Reynoso, Callao 07001",
    contacts: [
      {
        id: "j-mendoza",
        name: "Julia Mendoza",
        role: "Directora de Operaciones Globales",
        avatarUrl: "",
        email: "jmendoza@alicorp.com.pe",
        phone: "+51 912 345 678",
        isKey: true
      },
      {
        id: "r-quispe",
        name: "Renato Quispe",
        role: "Gerente de Abastecimiento",
        avatarUrl: "",
        email: "rquispe@alicorp.com.pe",
        phone: "+51 988 777 666",
        isKey: true
      }
    ],
    projects: [
      {
        id: "PRJ-00301",
        name: "Automatización de Almacén Central",
        leader: "Renato Q.",
        progress: 85,
        status: "En Ejecución",
        amount: 320000
      },
      {
        id: "PRJ-00320",
        name: "Optimización de Despacho Logístico",
        leader: "Julia M.",
        progress: 50,
        status: "En Ejecución",
        amount: 180000
      },
      {
        id: "PRJ-00411",
        name: "Predicción de Demanda AI",
        leader: "Julia M.",
        progress: 5,
        status: "Planificación",
        amount: 420000
      }
    ],
    activities: [
      {
        id: "act-ali-1",
        type: "meeting",
        title: "Reunión de Status Trimestral",
        description: "Revisión de ahorros generados por módulo de AI.",
        timestamp: "Ayer, 3:15 PM",
        owner: "Paolo Bastianelli"
      },
      {
        id: "act-ali-2",
        type: "email",
        title: "Envío de Cotización Mantenimiento Anual",
        description: "Propuesta comercial para el soporte preventivo 2026.",
        timestamp: "Hace 3 días",
        owner: "Paolo Bastianelli"
      }
    ],
    invoices: [
      {
        id: "INV-2024-A01",
        concept: "Licenciamiento Anual Izango Enterprise CORE",
        amount: 125000,
        billingDate: "2026-06-01",
        dueDate: "2026-06-30",
        status: "Paid"
      },
      {
        id: "INV-2024-A02",
        concept: "Servicios de Soporte Logístico 24/7 Q2",
        amount: 12400,
        billingDate: "2026-07-01",
        dueDate: "2026-07-31",
        status: "Pending"
      }
    ],
    documents: [
      {
        id: "doc-ali-1",
        name: "Acuerdo Marco de Servicios 2024-2028.pdf",
        category: "Contrato",
        size: "5.8 MB",
        updatedAt: "2024-03-01",
        uploadedBy: "Legal Izango"
      }
    ],
    insightsAI: "Alicorp muestra alta satisfacción con el piloto de optimización logística. La propuesta de 'Predicción de Demanda AI' tiene un 90% de probabilidad de cierre si se presenta antes de fin de mes."
  },
  {
    id: "interbank",
    name: "Interbank S.A.",
    isVIP: true,
    ruc: "20100055512",
    sector: "Financiero",
    location: "Lima, Perú",
    kam: "Paolo Bastianelli",
    logoUrl: "",
    website: "www.interbank.pe",
    sinceDate: "Octubre 2020",
    ltv: 1890000,
    ltvGrowth: "+8% vs LY",
    pipelineOpen: 210000,
    pipelineOppsCount: 3,
    projectsCount: 8,
    projectsExecCount: 4,
    clientHealthScore: 89,
    clientHealthLabel: "Bueno (Estable)",
    pendingDebt: 4500,
    pendingDebtLabel: "Cobro recurrente pendiente",
    lastInteractionTime: "Hace 4 días",
    lastInteractionLabel: "Llamada con Gerente de Infraestructura",
    closeProbability: 75,
    avgTicket: 70000,
    daysInCycle: 60,
    stuckWarning: "2 oportunidades sin actualización hace más de 30 días.",
    addressName: "Sede Central Carlos Villarán",
    addressDetails: "Av. Carlos Villarán 140, La Victoria, Lima 15034",
    contacts: [
      {
        id: "f-salas",
        name: "Fernando Salas",
        role: "Gerente de Arquitectura de Seguridad",
        avatarUrl: "",
        email: "fsalas@interbank.pe",
        phone: "+51 954 321 098",
        isKey: true
      },
      {
        id: "v-chavez",
        name: "Vanessa Chávez",
        role: "Subgerente de Innovación",
        avatarUrl: "",
        email: "vchavez@interbank.pe",
        phone: "+51 944 111 222",
        isKey: false
      }
    ],
    projects: [
      {
        id: "PRJ-00210",
        name: "Auditoría de Seguridad de Cuentas",
        leader: "Fernando S.",
        progress: 95,
        status: "En Ejecución",
        amount: 85000
      },
      {
        id: "PRJ-00234",
        name: "Portal de Onboarding Digital Emprendedores",
        leader: "Vanessa C.",
        progress: 15,
        status: "Planificación",
        amount: 125000
      }
    ],
    activities: [
      {
        id: "act-ib-1",
        type: "call",
        title: "Alineamiento técnico de seguridad",
        description: "Revisión de controles OWASP para portal de onboarding.",
        timestamp: "Hace 4 días",
        owner: "Equipo Soporte Izango"
      }
    ],
    invoices: [
      {
        id: "INV-IB-01",
        concept: "Soporte Mensual Premium Junio 2026",
        amount: 4500,
        billingDate: "2026-06-30",
        dueDate: "2026-07-30",
        status: "Pending"
      }
    ],
    documents: [
      {
        id: "doc-ib-1",
        name: "Anexo de Seguridad de la Información.pdf",
        category: "Contrato",
        size: "1.7 MB",
        updatedAt: "2020-11-12",
        uploadedBy: "Fernando Salas"
      }
    ],
    insightsAI: "Interbank prioriza el cumplimiento estricto de ciberseguridad antes de lanzar cualquier módulo externo. Se sugiere proponer el servicio de 'Muro Virtual Dedicado' para mitigar inquietudes de red."
  }
];
