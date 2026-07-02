# Arquitectura SIG Izango 360

Este documento describe la arquitectura base del ERP Izango 360 y la direccion del SIG. La aplicacion actual esta construida sobre Next.js App Router, Supabase, componentes React y modulos operativos organizados bajo `app/`, `components/` y `lib/`.

## Estado Actual

- `app/` contiene rutas funcionales como Dashboard, CRM, Proyectos, RQ, Facturacion, Liquidaciones, Finanzas, RRHH y Logistica.
- `components/` contiene componentes reutilizables de UI, navegacion, finanzas y design-system.
- `lib/` contiene clientes Supabase, helpers financieros, permisos actuales, trazabilidad, alertas y utilidades.
- `lib/permisos` contiene el Permission Engine transversal actual. No se mueve en esta fase.

## Objetivo del Core Engine

`lib/core` sera la capa contractual futura para motores transversales del SIG:

- Configuration
- Business Rules
- Lifecycle
- Calculations
- Events
- Notifications
- Search

Esta fase crea solo contratos y estructura. No cambia comportamiento funcional.

