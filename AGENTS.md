<!-- BEGIN:nextjs-agent-rules -->
# Izango ERP 360 — Manual operativo para agentes

## 1. Propósito y alcance
* Este manual gobierna de forma obligatoria el trabajo de todos los agentes autónomos de desarrollo (incluyendo Codex, Antigravity, Claude Code y otros agentes) que interactúen con el repositorio.
* Las directrices y reglas operativas detalladas en este documento aplican a la totalidad del repositorio.
* El desarrollo de Izango ERP 360 debe ser tratado estrictamente por dominios (Comercial, Operaciones, Finanzas, RRHH), y nunca como pantallas aisladas o independientes.

## 2. Entorno oficial
* **Sistema operativo:** Windows.
* **Consola obligatoria:** PowerShell (no usar sintaxis de Bash ni comandos Unix a menos que no exista equivalente nativo en PowerShell).
* **Ruta oficial del proyecto:** `C:\Users\user\Desktop\izango-erp`
* **Stack real detectado:**
  * **Next.js:** `16.2.4`
  * **React:** `19.2.4` / **React-DOM:** `19.2.4`
  * **TypeScript:** `^5` (configurado en `tsconfig.json`)
  * **Supabase:** Client-side (`@supabase/ssr` `0.10.2` y `@supabase/supabase-js` `2.104.0`)
  * **TailwindCSS:** `3.4.1` (con `@tailwindcss/postcss` `^4` como preprocesador)
  * **Despliegue:** Vercel

## 3. Diagnóstico obligatorio antes de trabajar
Antes de realizar cualquier modificación, análisis de código o propuesta de plan, el agente debe ejecutar la siguiente secuencia de comandos en PowerShell:
```powershell
Get-Location
git status
git branch --show-current
git log -5 --oneline
git remote -v
Get-ChildItem -Path . -Force
```
El agente tiene la **obligación** de:
1. Revisar que el working tree esté limpio al iniciar. El agente debe detenerse únicamente si, al inicio de la tarea, encuentra cambios locales previos no identificados o ajenos al alcance.
2. Identificar el historial reciente y posibles cambios introducidos por otros agentes.
3. Analizar la estructura de directorios del módulo sobre el cual va a trabajar.
4. Leer completos los archivos fuente relacionados al alcance del cambio.
5. Confirmar mediante búsqueda cruzada (usando las herramientas de búsqueda del agente o PowerShell) que no repetirá una tarea o función que ya se encuentre implementada en otra parte de la aplicación.
6. **Detenerse de inmediato** e informar al usuario si encuentra cambios locales previos no explicados al inicio de la tarea. Los cambios creados legítimamente durante el desarrollo de la tarea actual no deben provocar un bloqueo, pero deben revisarse con `git diff` y no descartarse sin autorización.

## Uso de Graphify
Graphify es una herramienta de navegación inteligente del repositorio.

Debe utilizarse únicamente para:
- localizar archivos relevantes;
- comprender relaciones entre módulos;
- identificar dependencias;
- detectar impacto transversal;
- reducir lectura innecesaria del repositorio.

El flujo obligatorio será:
1. Consultar Graphify.
2. Formular una hipótesis.
3. Leer únicamente los archivos necesarios para validarla.
4. Implementar los cambios.
5. Validar contra el código real.

El grafo nunca sustituye la lectura del código. Toda modificación debe confirmarse revisando los archivos reales.

NO utilizar Graphify cuando:
- el usuario ya indicó exactamente qué archivos modificar;
- la tarea sea exclusivamente documental;
- el cambio afecte únicamente uno o pocos archivos perfectamente identificados.

Si existe contradicción entre Graphify y el código fuente, prevalece siempre el código.

### Herramientas recomendadas

Para navegación y descubrimiento:
- Graphify

Para edición:
- Codex
- Antigravity
- Claude Code

Para validación:
- PowerShell
- Git
- Build
- Lint

Ninguna herramienta sustituye la validación sobre el código fuente.

## 4. Jerarquía de fuentes de verdad
En caso de discrepancia técnica, lógica o documental, se aplicará el siguiente orden de precedencia (de mayor a menor importancia):
1. **Código fuente vigente** y **migraciones SQL aplicadas** en la base de datos.
2. **Reglas centralizadas de dominio** (`lib/core/business-rules/`) y **estados de ciclo de vida** (`lib/core/lifecycle/`).
3. **Tipos de datos** (`types/index.ts`) y **servicios** (`lib/services/`).
4. **Documentación técnica vigente** contenida en la carpeta `docs/`.
5. **`AGENTS.md`** (este manual operativo).
6. **`README.md`**.
7. **Documentos históricos** (e.g., reportes de auditoría antiguos).

*Nota: Ningún documento histórico prevalece sobre el código real actual. Si se detectan contradicciones lógicas entre el comportamiento del código y la documentación, el agente debe reportarlo y solicitar autorización antes de modificar la lógica del sistema.*

## 5. Arquitectura del repositorio
* **`app/`**: Rutas y vistas principales de la aplicación (Next.js App Router).
* **`components/`**: Componentes visuales reutilizables.
* **`components/design-system/`**: Componentes oficiales del sistema de diseño de Izango ERP.
* **`components/ui/`**: Componentes básicos y bloques estructurados compartidos.
* **`lib/`**: Lógica de negocio, utilidades compartidas e integraciones de servicios.
* **`lib/core/business-rules/`**: Reglas de negocio programáticas agrupadas por dominios (CRM, proyectos, facturación, RQs).
* **`lib/core/lifecycle/`**: Definiciones formales de estados y transiciones permitidas (Lifecycles).
* **`lib/domain/`**: Tipos financieros y mappers de dominio (e.g. RQP, Tesorería).
* **`lib/services/`**: Servicios de negocio consolidados (e.g. cálculos financieros de tesorería).
* **`lib/permisos/`**: Lógica de alcances y matrices de autorización de usuarios.
* **`types/`**: Interfaces y tipos estáticos globales de la aplicación (`types/index.ts`).
* **`supabase/migrations/`**: Scripts de base de datos SQL versionados y aplicados en Supabase.
* **`docs/`**: Documentación funcional y técnica, arquitectura y guías de UX.
* **`scripts/`**: Scripts de automatización y mantenimiento.
* **`public/`**: Recursos estáticos públicos del sistema (e.g., manifest, service worker, imágenes).

## 6. Reglas específicas de Next.js 16
* Esta versión de Next.js posee cambios disruptivos a nivel de APIs, convenciones y estructura de archivos en comparación con datos de entrenamiento generales.
* **Acción obligatoria:** Revisar la documentación interna en `node_modules/next/dist/docs/` antes de escribir cualquier código.
* No asumir comportamientos basados en versiones anteriores de Next.js y prestar atención a los avisos de obsolescencia (deprecation notices).
* Para problemas de navegación lenta en cliente o carga instantánea, revisar la guía local de optimización en `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.mdx`.
* No aplicar patrones antiguos de Next.js sin verificar su compatibilidad en la documentación local de la biblioteca instalada.

## 7. Design System obligatorio
Los componentes del sistema de diseño son **de uso obligatorio** para garantizar coherencia visual. Está estrictamente prohibido implementar componentes duplicados, ad-hoc o estilos en línea personalizados que contradigan el diseño ya implementado.

### Catálogo de componentes preferentes
1. **`MasterPage`** (`components/design-system/MasterPage.tsx`): Estructura la cabecera estándar de página (título, subtítulo, eyebrow y acciones principales).
2. **`DataTable`** (`components/design-system/DataTable.tsx`): Renderizado consistente de tablas de datos con soporte de alineación, anchos y estados vacíos.
3. **`Drawer`** (`components/design-system/Drawer.tsx`): Contenedor deslizable lateral (ancho por defecto 420px) para formularios de creación/edición.
4. **`EmptyState`** (`components/design-system/EmptyState.tsx`): Ilustración y mensaje estándar al no encontrar registros en listas.
5. **`ExecutiveSummary`** (`components/design-system/ExecutiveSummary.tsx`): Rejilla de tarjetas de resumen métrico con colores semánticos (tones).
6. **`FiltersBar`** (`components/design-system/FiltersBar.tsx`): Contenedor flex horizontal para agrupar filtros e inputs de búsqueda de tablas.
7. **`FormField`** (`components/design-system/FormField.tsx`): Wrapper oficial para inputs y selects que gestiona etiquetas, obligatoriedad y visualización de errores.
8. **`StatusBadge`** (`components/ui/StatusBadge.tsx`): Emblema circular/redondeado para mostrar estados de negocio con su mapeo de color oficial (`getStatusType`).
9. **`KpiCard`** (`components/ui/KpiCard.tsx`): Tarjeta individual de métrica con icono predefinido (money, shield, chart, wallet, folder, file).
10. **`SectionCard`** (`components/ui/SectionCard.tsx`): Caja contenedora de sección para segmentar visualmente bloques dentro de una misma vista.

### Reglas del Design System:
* **Prohibición de duplicidad:** No crees componentes de propósito equivalente. Usa siempre los del design system.
* **Prohibición de modificación no autorizada:** No modifiques los componentes compartidos a menos que exista una instrucción explícita del usuario.
* **Análisis de impacto:** Antes de proponer un cambio en un componente compartido, realiza una búsqueda de referencias (usando las herramientas de búsqueda del agente o comandos de PowerShell como `Get-ChildItem` y `Select-String`) para identificar todos sus puntos de uso actuales. Modificar props o estilos base de estos componentes introduce un riesgo transversal muy alto de romper vistas en otros módulos.
* **Paleta de Colores Institucionales:**
  * Verde Principal (Brand): `#0F6E56`
  * Verde Acento (Highlight): `#03E373`
  * Gris Muted: `#64748B`
  * Bordes: `#E2E8F0`
  * Fondos de Tabla/Muted: `#F8FAFC`
  * Texto Base: `#0F172A`
* Respetar los colores y estilos construidos; los tokens visuales no deben alterarse ni rediseñarse ad-hoc.

## 8. Modelo de datos, Supabase y migraciones
* **Clientes Supabase:** Utilizar `createClient` de `@/lib/supabase` para ejecuciones client-side, y `createServerSupabase` de `@/lib/supabase-server` para operaciones del servidor (APIs, middleware, server actions).
* **Definiciones y Tipos:** La fuente de verdad tipada de las tablas de base de datos se encuentra en `types/index.ts`.
* **Consultas de referencia:** Analiza las operaciones de carga de datos en vistas equivalentes antes de escribir un query.

### Reglas obligatorias para base de datos:
1. **No inventar tablas o columnas:** No asumas nombres de atributos. Contrasta siempre el esquema contra las definiciones en `types/index.ts` y las migraciones SQL en `supabase/migrations/`.
2. **No inferir relaciones por el nombre:** Comprueba las claves foráneas (FK) en el directorio de migraciones reales.
3. **No modificar base de datos manualmente:** No ejecutes sentencias de modificación de base de datos directamente en el motor de producción.
4. **Migraciones versionadas:** Cualquier cambio en el esquema debe definirse mediante un script SQL cronológicamente nombrado dentro de `supabase/migrations/`.
5. **No crear ni alterar migraciones aplicadas:** No crees scripts de migración sin autorización funcional explícita, y **nunca** alteres un archivo de migración que ya haya sido aplicado e incorporado a la historia del repositorio.
6. **Políticas RLS:** Row Level Security está activado en las tablas críticas. Si experimentas arrays vacíos o accesos denegados sin error sintáctico, revisa las políticas RLS.
7. **Bypass Prohibido:** RLS es una barrera de seguridad mandatoria. No utilices el `service_role` en cliente para eludir las políticas RLS.
8. **Funciones SQL de Seguridad a Consultar:**
   * `public.usuario_puede_acceder_proyecto(proyecto_uuid uuid)`: Determina quién puede leer el proyecto. Los productores solo ven si son los titulares.
   * `public.usuario_puede_operar_proyecto(proyecto_uuid uuid)`: Determina quién puede escribir/editar. Los productores solo editan si son los titulares. Bloquea el acceso de escritura de comerciales o administradores.

## 9. Reglas de dominio
Aplica estrictamente las reglas funcionales centralizadas en `lib/core/business-rules/` y `lib/core/lifecycle/`. No dupliques la lógica en componentes de vista.

### Proyectos
* **Estados del Ciclo de Vida:** `pendiente_aprobacion`, `aprobado_produccion`, `aprobado_gerencia`, `aprobado_cliente`, `en_curso`, `terminado`, `liquidado`, `pendiente_facturacion`, `facturado`, `cerrado_financiero`, `rechazado`, `cancelado`.
* **Estados Finales:** `cerrado_financiero`, `cancelado` y `rechazado`. Una vez que el proyecto entra en uno de estos estados, no se le puede aplicar ninguna transición de estado posterior ni edición operativa.
* **Pre-condiciones de Cierre Financiero (cambio a `cerrado_financiero`):**
  * El estado debe ser `facturado`.
  * La factura final del proyecto debe estar cobrada (`facturaFinalCobrada === true`).
  * La liquidación del proyecto debe estar cerrada (`liquidacionCerrada === true`).
  * Debe contar con la aprobación explícita del Controller (`aprobadoController === true`).

### Requerimientos de Pago (RQ)
* **Estados del Ciclo de Vida:** `pendiente_aprobacion`, `aprobado_produccion`, `aprobado`, `programado`, `pagado`, `cancelado`, `rechazado`.
* **Restricciones de Edición por Estado:**
  * Estados finales (`pagado`, `cancelado`, `rechazado`) no pueden editarse.
  * Si está en `aprobado_produccion`, no puede ser editado por el `productor`.
  * Si está en `aprobado`, solo lo editan `gerente_general`, `controller` y `superadmin`.
  * Si está en `programado`, solo lo editan `controller` y `superadmin`.
* **Degradación de Aprobaciones (Re-aprobación):** Si se edita un RQ, su estado retrocede en el ciclo de vida para forzar una nueva validación:
  * Si está en `aprobado_produccion`, retrocede a `pendiente_aprobacion`.
  * Si está en `aprobado`, retrocede a `aprobado_produccion`.
  * Si está en `programado`, retrocede a `aprobado`.

### CRM
* **Lead Requerido:** Todo lead comercial debe registrar obligatoriamente Razón Social o Empresa (`razon_social` o `empresa`).
* **Conversión a Cliente:** Al cambiar un lead a estado `ganado`, este debe convertirse de forma mandatoria en un registro en la tabla `clientes`.

## 10. Roles, permisos y alcance
### Roles oficiales detectados:
`superadmin`, `gerente_general`, `controller`, `gerente_produccion`, `productor`, `comercial`, `logistica`, `audiovisual`, `administrador`, `practicante`.

### Mecanismo de permisos dual en Frontend:
Existe una duplicidad en el flujo de autorización que debe respetarse para evitar inconsistencias de navegación:
1. **`lib/permisos/rutas.ts` (`puedeVerRuta`)**: Mapea accesos a rutas dinámicas basado en la base de datos (`MATRIZ_MODULOS`). Utilizado por el sidebar para mostrar/ocultar links del menú.
2. **`lib/permissions.ts` (`puedeAccederRuta`)**: Objeto estático `ACCESO` que define qué rutas puede cargar cada rol. Utilizado en los archivos de página (`page.tsx`) para la validación interna.

* **Regla obligatoria:** Al otorgar, modificar o revocar permisos de ruta para un rol, debes editar **ambos** archivos simultáneamente. No unifiques los sistemas de autorización sin autorización expresa.
* La visibilidad en el menú no garantiza el acceso a la ruta, y la autorización en frontend no reemplaza los controles RLS de la base de datos.
* El alcance de visibilidad de los datos para el rol `productor` se encuentra limitado por RLS a aquellos proyectos en los cuales figure como el `productor_id` del registro.

## 11. Procedimiento obligatorio para cada tarea
El agente debe estructurar su ciclo de trabajo bajo las siguientes fases estrictas:
1. **Diagnóstico:** Inspeccionar el repositorio con comandos PowerShell y realizar búsquedas de referencias utilizando las herramientas de búsqueda disponibles del agente o PowerShell mediante `Get-ChildItem` y `Select-String`. Ejemplo:
   ```powershell
   Get-ChildItem -Path app,components,lib -Recurse -File | Select-String -Pattern "termino"
   ```
2. **Identificación de archivos:** Enumerar qué archivos se verán afectados.
3. **Lectura completa:** Leer la totalidad de los archivos seleccionados para el cambio.
4. **Plan:** Documentar y acordar los cambios a proponer en un plan de implementación.
5. **Autorización:** Obtener confirmación en caso de que existan riesgos críticos (e.g. cambios de esquemas).
6. **Implementación mínima:** Codificar únicamente lo necesario, respetando las convenciones del codebase.
7. **Revisión de diff:** Validar los cambios locales.
8. **Lint:** Validar consistencia de código estático.
9. **Build:** Ejecutar la compilación local para comprobar la corrección de tipos TypeScript.
10. **Reporte final:** Entregar el informe formalizado.

*Se prohíbe realizar modificaciones masivas sin diagnóstico previo, correcciones colaterales o refactors oportunistas no solicitados.*

## 12. Git y trabajo entre agentes
* Ejecuta `git status` antes de modificar y después de tus tareas.
* Utiliza `git diff` y `git diff --stat` para corroborar que no se hayan introducido líneas o archivos fuera del alcance definido.
* **No sobrescribas cambios de otros agentes.** En caso de tareas concurrentes, Codex y Antigravity no deben trabajar simultáneamente sobre las mismas carpetas o archivos.
* Deja siempre el repositorio en un estado limpio.
* **Prohibido:** Hacer commit automático, ejecutar push automático, utilizar `git push --force`, `git reset --hard`, borrar ramas, descartar archivos modificados sin control, o reescribir el historial publicado.

## 13. Validaciones obligatorias
El agente debe ejecutar localmente las validaciones según el tipo de cambio realizado:

### A. Para cambios de código, configuración, dependencias, migraciones o comportamiento:
Ejecutar obligatoriamente:
```powershell
npm run lint
npm run build
git diff --check
git diff --stat
git status
```
* Si `npm run lint` o `npm run build` fallan debido a un error en el código añadido, la tarea **no** se considera terminada.
* Informa con precisión cualquier error de compilación o tipado y corrígelo antes de enviar tu reporte. No ocultes fallas.

### B. Para modificaciones exclusivamente documentales (archivos Markdown u otros textos sin código ejecutable):
Ejecutar únicamente:
```powershell
git diff --check
git diff --stat
git status
```
* Los comandos `npm run lint` y `npm run build` se ejecutarán en documentación únicamente si existe una razón técnica concreta (por ejemplo, validación de referencias tipadas internas).

## 14. Acciones prohibidas
* Inventar tablas o nombres de columnas no sustentadas en `types/index.ts` o las migraciones SQL.
* Inventar roles o estados fuera del ciclo de vida oficial del ERP.
* Alterar las transiciones del ciclo de vida sin autorización del usuario.
* Eludir las políticas de Row Level Security (RLS).
* Desactivar o deshabilitar mecanismos de autenticación y middleware.
* Modificar componentes compartidos sin un análisis detallado de su impacto transversal.
* Reemplazar o reescribir el Design System.
* Ejecutar commits, pushes, force pushes o resets destructivos.
* Modificar de forma manual bases de datos productivas.
* Almacenar o exponer secretos, tokens, credenciales o contraseñas en archivos del repositorio.
* Declarar el éxito de una implementación sin haber completado de manera satisfactoria el build de la aplicación (`npm run build`).

## 15. Formato obligatorio del reporte final
Todo agente debe cerrar su respuesta con la siguiente estructura de informe:
1. **Objetivo ejecutado:** Qué se resolvió.
2. **Archivos modificados:** Lista de archivos tocados (links markdown a los archivos).
3. **Comportamiento anterior:** Estado previo del sistema.
4. **Comportamiento nuevo:** Lógica o flujo tras los cambios.
5. **Reglas de negocio afectadas:** Módulos o flujos impactados.
6. **Riesgos:** Identificación de posibles impactos secundarios.
7. **Pruebas realizadas:** Detalle de los testeos.
8. **Resultado de lint:** Estado del análisis estático.
9. **Resultado de build:** Estado de compilación de Next.js.
10. **Estado de Git:** Status de la rama tras las ediciones.
11. **Pendientes:** Tareas secundarias o pasos a seguir.
12. **Migración:** Si requiere la ejecución de scripts SQL en Supabase.

## 16. Documentación y referencias
El agente debe utilizar como guías técnicas los siguientes archivos del repositorio:
* **Roadmap de dominio:** `docs/IZANGO_360_DOMAIN_MODEL_V2.md`
* **Auditoría de seguridad:** `docs/security/`
* **Dashboard Financiero:** `docs/finanzas/`
* **Migraciones de base de datos:** `supabase/migrations/`
* **Lógica de negocio:** `lib/core/`
* **Matrices de permisos:** `lib/permisos/`
* **Tipos globales:** `types/index.ts`
* **Dependencias y scripts:** `package.json`
* **Middleware de autorización:** `middleware.ts`

## Filosofía de desarrollo
El desarrollo en Izango ERP 360 se rige por un conjunto de principios pragmáticos que garantizan la mantenibilidad, estabilidad y calidad del software a largo plazo:

- **Priorizar simplicidad sobre complejidad:** Escribir código fácil de entender y de mantener. Evitar la sobre-ingeniería y el código excesivamente rebuscado.
- **No romper funcionalidades existentes:** El principio de regresión cero. Todo cambio debe ser validado transversalmente para asegurar que no se alteren flujos operativos paralelos o previos.
- **Mantener coherencia visual y funcional:** Alinear todo nuevo desarrollo visual con el Design System existente y reutilizar comportamientos comunes ya implementados en el ERP.
- **Reutilizar antes de crear:** Buscar soluciones existentes en la arquitectura de dominio antes de programar utilidades ad-hoc o duplicar componentes equivalentes.
- **Minimizar deuda técnica:** Mantener el código limpio, bien tipado con TypeScript y documentar únicamente las decisiones no obvias para futuros desarrolladores o agentes.
- **Cambios pequeños y verificables:** Realizar modificaciones incrementales y probar paso a paso. Compilar de manera consistente antes de dar por completado un cambio.
- **Toda decisión debe estar sustentada por el código existente o una autorización explícita:** No asumir ni inventar requerimientos. Contrasta siempre el diseño de datos e implementaciones con la fuente de verdad.
- **Si existe duda, detenerse y consultar antes de asumir:** La comunicación clara con el equipo o el usuario previene errores funcionales críticos y ahorra tiempo.

---
*Fin del Manual Operativo.*
<!-- END:nextjs-agent-rules -->
