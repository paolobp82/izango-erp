# Backlog Detallado del Izango SIG V2

Este documento recopila las incidencias, deudas técnicas y oportunidades de mejora detectadas incidentalmente en el sistema que se encuentran **fuera del alcance del rediseño puramente estético y visual V2**.

---

## 1. BACKLOG DE FASE 8

### ID-801: Inconsistencias cromáticas menores en Dark Mode
* **Sprint**: 8.1
* **Ruta**: `/admin/design-system-v2`
* **Tipo**: Visual
* **Prioridad**: BAJA
* **Descripción**: Ciertas clases secundarias de inputs o botones heredados del ThemeProvider V1 no cambian de color de texto en modo oscuro, dificultando la lectura marginal.
* **Criterio de Cierre**: Todos los campos de texto del panel del design system legibles en contraste oscuro.

### ID-802: Tooltips sin retardo de salida
* **Sprint**: 8.3
* **Ruta**: General (`V2Tooltip`)
* **Tipo**: Usabilidad
* **Prioridad**: BAJA
* **Descripción**: El tooltip parpadea si el puntero se mueve rápidamente sobre múltiples iconos de acción.
* **Criterio de Cierre**: Añadir un pequeño debounce o retardo al ocultar el componente V2Tooltip.

---

## 2. BACKLOG DE FASE 9

### ID-901: Loops potenciales en carga inicial de proyectos
* **Sprint**: 9.1
* **Ruta**: `/proyectos`
* **Tipo**: Defecto Funcional
* **Prioridad**: MEDIA
* **Descripción**: Si `supabase.auth.getUser()` falla silenciosamente o la sesión expira a mitad de sesión, `load` puede entrar en reintentos infinitos si no se maneja el estado de error de forma explícita.
* **Criterio de Cierre**: Añadir validación de catch blocks y control de timeouts.

### ID-902: Unificación de Estado "Pendiente de Facturación"
* **Sprint**: 9.1
* **Ruta**: `/proyectos` y `/rq`
* **Tipo**: Reglas de Negocio
* **Prioridad**: MEDIA
* **Descripción**: El KPI de "Pendiente de Facturación" en Proyectos V2 actualmente lee únicamente registros con `estado === "liquidado"`. Sin embargo, en otros módulos se contemplan también proyectos en estado `pendiente_facturacion`. Se requiere una definición formal del negocio para unificar el conteo.
* **Criterio de Cierre**: Unificar el conteo de proyectos basándose en la directiva unificada del Controller financiero.

---

## 3. DEUDA FUERA DE ALCANCE

### ID-1001: Bypass de RLS en consultas de perfiles de Sidebar
* **Ruta**: `/admin/usuarios` y layouts
* **Tipo**: Seguridad
* **Prioridad**: ALTA
* **Descripción**: Ciertas queries client-side leen la tabla completa de `perfiles`. Aunque la base de datos restringe la visibilidad por RLS, se deben asegurar filtros explícitos por id para evitar cargas completas inútiles.
* **Criterio de Cierre**: Agregar filtros `.eq("id", user.id)` en todas las queries de perfil del sidebar.

### ID-1002: Carga redundante de Perfil en Layouts
* **Ruta**: Global (`AppLayout` y `V2AppShell`)
* **Tipo**: Rendimiento
* **Prioridad**: ALTA
* **Descripción**: La coexistencia de dos shells monta tanto el Sidebar legacy como el V2, disparando dos consultas idénticas a la tabla de `perfiles` en cada refresco de página.
* **Criterio de Cierre**: Centralizar la carga de perfil en un contexto compartido (UserSessionContext).
