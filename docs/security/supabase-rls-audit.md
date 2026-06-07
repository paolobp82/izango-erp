# Auditoria RLS Supabase - Izango ERP

Fecha: 2026-06-07

## Decision ejecutiva

No es seguro aplicar migraciones RLS directamente a produccion desde este repositorio en su estado actual.

Motivos:

- No existe carpeta `supabase/`, `supabase.toml` ni migraciones SQL versionadas.
- No se encontraron politicas `CREATE POLICY`, `ALTER POLICY` ni `ENABLE ROW LEVEL SECURITY` versionadas.
- El esquema real de Supabase no esta versionado en el repo.
- La app realiza muchas lecturas/escrituras directas desde el cliente con anon key, por lo que activar RLS sin una matriz probada de politicas puede romper flujos criticos.
- No hay fixture/staging ni suite automatizada por rol que permita verificar politicas antes de produccion.

Recomendacion: aplicar primero en staging. No aplicar todavia en produccion.

## Evidencia revisada

Archivos de esquema/migracion encontrados:

- `setup-izango.ps1`
- `fix-izango.ps1`

Observacion: ambos son scripts historicos de escritura de archivos de aplicacion, no migraciones Supabase confiables. No contienen politicas RLS versionadas.

No se encontro:

- `supabase/migrations/*.sql`
- `supabase/config.toml` o `supabase.toml`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY`
- `auth.uid()`

## Tablas criticas revisadas

| Tabla | Uso observado | Sensibilidad | Riesgo actual si RLS no existe |
|---|---|---:|---|
| `perfiles` | Login, layout, admin usuarios, permisos, asignaciones | Alta | Exposicion/edicion de roles, entidad y estado activo |
| `clientes` | CRM, proyectos, busqueda global, reporteria | Alta | Exposicion comercial, RUC, contactos y facturacion |
| `proyectos` | Dashboard, proyectos, reportes, tareas, RQ, facturas | Alta | Exposicion por ID directo y acceso entre entidades |
| `cotizaciones` | Proformas, proyectos, reportes, margenes | Alta | Exposicion de costos, precios, margen y versiones |
| `requerimientos_pago` | RQ, flujo caja, caja chica, reportes, cancelacion | Critica | Exposicion financiera y cambios de estado no autorizados |
| `facturas` | Facturacion, conciliacion, dashboard, reporteria | Critica | Exposicion financiera y cambios de cobranza |
| `liquidaciones` | Liquidaciones, dashboard, reportes | Critica | Exposicion de margen real, costos y cierre |
| `tareas` | Gestion de tareas y comentarios | Media | Exposicion de trabajo interno y asignaciones |
| `rrhh_trabajadores` | RRHH, planilla, prestamos, reportes trabajador | Critica | Exposicion de DNI, sueldo, banco, salud y ficha personal |
| `alertas` | Modulo alertas/notificaciones, configuracion | Media | Exposicion de preferencias y notificaciones internas |
| `trazabilidad` | Auditoria de acciones | Alta | Manipulacion o lectura indebida del historial |

## Estrategia RLS deny-by-default

La estrategia recomendada es:

1. Versionar el esquema actual desde staging o produccion en una carpeta `supabase/`.
2. Crear helpers SQL estables para roles y entidad.
3. Activar RLS tabla por tabla en staging.
4. Agregar politicas `SELECT` primero.
5. Agregar politicas `INSERT`, `UPDATE`, `DELETE` por flujo y rol.
6. Validar la app con usuarios reales por rol.
7. Solo despues promover a produccion.

Principios:

- Todo acceso anonimo debe quedar denegado salvo endpoints publicos explicitamente tokenizados.
- `service_role` solo debe usarse en rutas server-side ya autorizadas.
- Las politicas deben filtrar por `auth.uid()` y por `entidad` cuando aplique.
- Los usuarios solo deben leer su propio `perfil` completo; vistas amplias de perfiles deben limitar columnas o requerir rol admin/operativo.
- Finanzas y RRHH requieren politicas separadas por sensibilidad.
- `trazabilidad` debe ser append-only para usuarios normales; solo lectura para roles autorizados.

## Helpers SQL sugeridos

No aplicar directamente en produccion sin probar en staging.

```sql
create or replace function public.current_profile()
returns public.perfiles
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.perfiles
  where id = auth.uid()
    and activo is distinct from false
  limit 1
$$;

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select perfil
  from public.perfiles
  where id = auth.uid()
    and activo is distinct from false
  limit 1
$$;

create or replace function public.current_entity()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select entidad
  from public.perfiles
  where id = auth.uid()
    and activo is distinct from false
  limit 1
$$;

create or replace function public.has_role(roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_role() = any(roles), false)
$$;
```

Roles administrativos recomendados para politicas:

```sql
array['superadmin', 'gerente_general', 'administrador', 'controller']
```

Roles financieros:

```sql
array['superadmin', 'gerente_general', 'controller', 'gerente_finanzas']
```

Roles RRHH:

```sql
array['superadmin', 'gerente_general', 'administrador', 'controller']
```

## Politicas sugeridas por tabla

### `perfiles`

Objetivo:

- Usuario puede leer/actualizar datos basicos propios.
- Admin/GG puede administrar perfiles.
- Nadie no autenticado accede.

Politicas sugeridas:

- `SELECT`: propio perfil o roles administrativos.
- `UPDATE`: propio perfil solo columnas no sensibles mediante RPC o endpoint server-side; roles administrativos para cambios de rol/activo.
- `INSERT`: solo service role desde endpoint admin autorizado.
- `DELETE`: no permitir; usar `activo = false`.

Riesgo: hoy varias pantallas consultan listas de perfiles para asignaciones. Puede requerir una vista segura `perfiles_publicos` con `id`, `nombre`, `apellido`, `perfil`, `entidad`.

### `clientes`

Objetivo:

- Acceso por entidad.
- Escritura para roles comerciales/admin.

Politicas sugeridas:

- `SELECT`: usuario autenticado cuya `current_entity()` coincide con `clientes.entidad`, o rol admin.
- `INSERT`: roles `superadmin`, `gerente_general`, `administrador`, `comercial`, `practicante`.
- `UPDATE`: mismos roles, misma entidad.
- `DELETE`: evitar; usar `activo=false` o soft delete.

Riesgo: busqueda global y reporteria asumen lectura amplia.

### `proyectos`

Objetivo:

- Admin/GG/control pueden ver todo.
- Productor/comercial pueden ver proyectos asignados.
- Usuarios operativos pueden ver por entidad segun modulo.

Politicas sugeridas:

- `SELECT`: admin roles, misma entidad, `productor_id = auth.uid()`, `comercial_id = auth.uid()`.
- `INSERT`: comercial/admin/GG.
- `UPDATE`: segun estado y rol; idealmente mover transiciones a RPC server-side.
- `DELETE`: no permitir delete fisico; soft delete para admin/GG.

Riesgo: muchas transiciones de estado se hacen desde cliente; RLS granular podria romper flujos si no se migran a RPC/server actions.

### `cotizaciones`

Objetivo:

- Acceso heredado del proyecto.
- Bloqueo de cambios cuando cotizacion esta bloqueada/aprobada.

Politicas sugeridas:

- `SELECT`: existe proyecto accesible para usuario.
- `INSERT/UPDATE`: roles comercial, productor, gerente_produccion, admin segun acceso al proyecto.
- `DELETE`: no permitir; usar `deleted_at`.

Riesgo: cotizacion_items debe tener politicas equivalentes aunque no este en lista critica.

### `requerimientos_pago`

Objetivo:

- Lectura por proyecto accesible y roles financieros.
- Cambios de estado solo roles permitidos por fase.

Politicas sugeridas:

- `SELECT`: roles financieros, produccion, productor del proyecto.
- `INSERT`: gerente_produccion, controller, GG, superadmin, productor del proyecto si flujo lo permite.
- `UPDATE`: separar por estado con RPC. RLS pura por columna/estado puede volverse fragil.
- `DELETE`: solo superadmin/controller o no permitir; preferir estado `rechazado`.

Riesgo: el flujo actual actualiza estados desde cliente; alto riesgo de regresion.

### `facturas`

Objetivo:

- Acceso restringido a finanzas/GG/admin.
- Proyectos relacionados no deben exponer factura a productor si no corresponde.

Politicas sugeridas:

- `SELECT`: `superadmin`, `gerente_general`, `controller`, `gerente_finanzas`.
- `INSERT/UPDATE`: controller/gerente_finanzas/superadmin.
- `DELETE`: no permitir; usar estado/anulacion.

Riesgo: dashboard y busqueda global consumen facturas; habra que adaptar UI por rol.

### `liquidaciones`

Objetivo:

- Acceso financiero y produccion segun etapa.
- Margenes reales solo roles autorizados.

Politicas sugeridas:

- `SELECT`: admin/GG/controller/gerente_finanzas/gerente_produccion; productor solo si se acepta mostrar margen.
- `INSERT/UPDATE`: gerente_produccion para etapa produccion; GG/controller para cierre.
- `DELETE`: no permitir.

Riesgo: expone margen/costo; requiere definicion de producto sobre visibilidad de productor.

### `tareas`

Objetivo:

- Usuario ve tareas creadas por el, asignadas a el, o vinculadas a proyecto accesible.

Politicas sugeridas:

- `SELECT`: `asignado_a = auth.uid()`, `creado_por = auth.uid()`, o proyecto accesible.
- `INSERT`: autenticado.
- `UPDATE`: asignado, creador o admin.
- `DELETE`: creador/admin; considerar soft delete.

Riesgo: comentarios/subtablas deben tener politicas coherentes.

### `rrhh_trabajadores`

Objetivo:

- Usuario ve su ficha propia.
- RRHH/admin ve todas.
- Datos sensibles no deben exponerse ampliamente.

Politicas sugeridas:

- `SELECT`: `user_id = auth.uid()` o rol RRHH/admin.
- `INSERT/UPDATE`: solo RRHH/admin.
- `DELETE`: no permitir; usar `activo=false`.

Riesgo: planilla, prestamos y reporteria usan datos de sueldo/banco; deben validarse con usuarios reales.

### `alertas`

Objetivo:

- Usuario gestiona sus propias alertas/configuracion.
- Admin puede ver configuracion global si existe.

Politicas sugeridas:

- `SELECT/INSERT/UPDATE`: `usuario_id = auth.uid()`.
- `DELETE`: `usuario_id = auth.uid()` o admin.

Riesgo: en el repo tambien aparece `alertas_config`; debe incluirse en la implementacion aunque el objetivo mencione `alertas`.

### `trazabilidad`

Objetivo:

- Auditoria append-only.
- Lectura solo admin/GG/controller.

Politicas sugeridas:

- `SELECT`: admin/GG/controller.
- `INSERT`: autenticado, con `usuario_id = auth.uid()` idealmente via helper/RPC.
- `UPDATE/DELETE`: denegar.

Riesgo: si la app inserta desde cliente, RLS debe permitir solo inserts estrictos; mejor mover a endpoint/RPC.

## Orden recomendado de implementacion

### Fase 0 - Inventario

1. Exportar esquema real de Supabase desde staging/produccion.
2. Versionar `supabase/migrations`.
3. Confirmar PK/FK y columnas reales: `entidad`, `created_by`, `productor_id`, `comercial_id`, `user_id`, `deleted_at`, `activo`.
4. Crear usuarios fixture por rol: superadmin, gerente_general, administrador, controller, gerente_finanzas, gerente_produccion, productor, comercial, logistica, practicante.

### Fase 1 - Helpers y perfiles

1. Crear helpers SQL.
2. Habilitar RLS en `perfiles`.
3. Crear `perfiles_publicos` o ajustar consultas para asignaciones.
4. Validar login/layout/admin usuarios/perfil propio.

### Fase 2 - Lecturas por entidad

1. `clientes`.
2. `proyectos`.
3. `cotizaciones` y tablas hijas.
4. Validar dashboard, busqueda global, proyectos, proformas.

### Fase 3 - Finanzas

1. `requerimientos_pago`.
2. `facturas`.
3. `liquidaciones`.
4. Convertir transiciones criticas a RPC o endpoints server-side si RLS por estado se vuelve compleja.

### Fase 4 - RRHH

1. `rrhh_trabajadores`.
2. Tablas hijas: vacaciones, horas extras, permisos, faltas medicas, planilla, contratos, prestamos.
3. Validar ficha propia vs vista admin.

### Fase 5 - Auditoria y notificaciones

1. `tareas`.
2. `alertas` / `alertas_config`.
3. `trazabilidad`.
4. Denegar update/delete en trazabilidad.

## Migracion inicial segura

No se agrega migracion aplicable en esta PR.

La unica migracion segura sin romper produccion seria una migracion de comentarios/documentacion o una migracion no ejecutada. Habilitar RLS cambia comportamiento inmediatamente y puede bloquear lecturas/escrituras actuales.

Cuando exista staging, se recomienda crear una migracion inicial con esta forma, aplicada tabla por tabla:

```sql
-- STAGING ONLY - no aplicar directo en produccion.
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.requerimientos_pago enable row level security;
alter table public.facturas enable row level security;
alter table public.liquidaciones enable row level security;
alter table public.tareas enable row level security;
alter table public.rrhh_trabajadores enable row level security;
alter table public.alertas enable row level security;
alter table public.trazabilidad enable row level security;
```

Despues de cada `enable row level security`, crear politicas `SELECT` minimas y ejecutar regresion por rol antes de pasar a la siguiente tabla.

## Riesgos pendientes

- No se puede saber desde el repo si produccion ya tiene RLS activo.
- No hay snapshot del esquema real ni relaciones completas.
- Existen tablas hijas fuera del listado critico que deben protegerse junto con las tablas padre: `cotizacion_items`, `liquidacion_items`, `tarea_comentarios`, `rrhh_*`, `cliente_contactos`, entre otras.
- Muchas operaciones financieras y de proyecto se ejecutan desde cliente; RLS estricta puede requerir RPC/endpoints server-side.
- Busqueda global y reporteria pueden romperse al restringir `clientes`, `proyectos`, `facturas` y `rrhh_trabajadores`.
- `service_role` debe permanecer limitado a rutas server-side ya autorizadas.

## Matriz PASS/FAIL

| Objetivo | Resultado | Observacion |
|---|---:|---|
| Revisar politicas/migraciones existentes | PASS | No se encontraron migraciones Supabase ni politicas RLS versionadas. |
| Identificar tablas criticas | PASS | Se revisaron las 11 tablas solicitadas y su uso en app/API. |
| Proponer estrategia deny-by-default | PASS | Incluida por fases y por tabla. |
| Crear migraciones iniciales si es seguro | PASS | No se crearon porque no es seguro sin staging/esquema real. |
| Entregar reporte tecnico si no es seguro | PASS | Este documento es el entregable versionado. |
| No modificar datos productivos | PASS | No se ejecutaron comandos contra Supabase. |
| No aplicar cambios destructivos | PASS | No se agrego SQL ejecutable destructivo. |
| Ejecutar build/lint si toca codigo | N/A | Solo se agrego documentacion Markdown. |
| Entregar PR separado o reporte | PASS | Reporte versionado en branch separado. |

## Recomendacion final

Aplicar en staging.

No aplicar todavia en produccion.

La secuencia correcta es versionar primero el esquema real, levantar staging con datos representativos, crear politicas por fases y recien despues promover a produccion con rollback plan.
