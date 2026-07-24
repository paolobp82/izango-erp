# Diseño Correctivo y Campos Reales de Datos — CRM V2

Este documento recopila la auditoría de los campos reales de datos en la tabla `public.crm_leads` que se utilizan para filtros y ordenamiento en el módulo CRM V2.

---

## Campos de la tabla `public.crm_leads`

### 1. `updated_at`
* **Tabla**: `public.crm_leads`
* **Tipo**: `timestamp with time zone`
* **Acepta NULL**: Sí (pero por defecto es completado automáticamente por Supabase al modificar el registro).
* **Dónde se carga**: Se obtiene en la consulta general `select(*)` y se mapea en frontend en el campo `.updated_at`.
* **Cómo se presenta**: Se muestra en la tarjeta del lead formateado localmente o se utiliza para ordenar de forma descendente (última actualización primero).
* **Comportamiento si no existe**: Si el valor es nulo, se asume un valor de tiempo de `0` (fecha época 1970) para colocar el lead al final del ordenamiento.

### 2. `presupuesto_estimado`
* **Tabla**: `public.crm_leads`
* **Tipo**: `numeric` o `double precision`
* **Acepta NULL**: Sí.
* **Dónde se carga**: Se obtiene de la consulta Supabase.
* **Cómo se presenta**: Formateado en soles como `S/ 15,000` en las tarjetas y acumulado en los resúmenes financieros de las cabeceras de columnas y KPIs.
* **Comportamiento si no existe**: Si es nulo, se asume un valor de `0` para sumas y ordenamientos.

### 3. `probabilidad_cierre`
* **Tabla**: `public.crm_leads`
* **Tipo**: `integer` o `numeric`
* **Acepta NULL**: Sí (por defecto es 0).
* **Dónde se carga**: Obtenido de Supabase.
* **Cómo se presenta**: En el formulario de edición y en el cálculo ponderado del Cierre Esperado.
* **Comportamiento si no existe**: Se asume `0` si es nulo o indefinido.

### 4. `periodo_pipeline`
* **Tabla**: `public.crm_leads`
* **Tipo**: `text` (formato `YYYY-MM`).
* **Acepta NULL**: Sí (pero es completado por defecto en la migración `202607010001_improve_crm_pipeline.sql` al mes de creación).
* **Dónde se carga**: Obtenido de Supabase y utilizado en el filtro de período rápido.
* **Cómo se presenta**: Filtro dropdown con etiquetas legibles como "2026-07".
* **Comportamiento si no existe**: Si el valor es nulo, se asume el período actual de la sesión.

### 5. `responsable_id`
* **Tabla**: `public.crm_leads`
* **Tipo**: `uuid` (clave foránea de `public.perfiles(id)`).
* **Acepta NULL**: Sí.
* **Dónde se carga**: Obtenido de Supabase.
* **Cómo se presenta**: Se cruza con el dataset de perfiles para mostrar las iniciales (ej: "DG") y nombre (ej: "Dario G.") del comercial.
* **Comportamiento si no existe**: Se muestra como "Sin asignación" y se omite el círculo de iniciales.

### 6. `cliente_id`
* **Tabla**: `public.crm_leads`
* **Tipo**: `uuid` (clave foránea de `public.clientes(id)`).
* **Acepta NULL**: Sí.
* **Dónde se carga**: Obtenido de Supabase.
* **Cómo se presenta**: Si existe, se muestra un indicador visual verde de "Cliente vinculado" en la tarjeta.
* **Comportamiento si no existe**: Se omite el indicador visual.

### 7. `origen`
* **Tabla**: `public.crm_leads`
* **Tipo**: `text`
* **Acepta NULL**: Sí.
* **Dónde se carga**: Obtenido de Supabase.
* **Cómo se presenta**: Se muestra en los detalles del lead y se filtra mediante el dropdown de "Fuente u origen".
* **Comportamiento si no existe**: Se trata como una cadena vacía y se presenta como "Sin especificar" o "Otro".
* *Nota de Consistencia*: El modelo e interfaz del ERP utilizan internamente el campo `origen` (con etiquetas de visualización tituladas "Fuente"). Se mantendrá esta correspondencia de forma consistente.

### 8. `temperatura`
* **Tabla**: `public.crm_leads`
* **Tipo**: `text` (`frio`, `tibio`, `caliente`).
* **Acepta NULL**: Sí.
* **Dónde se carga**: Obtenido de Supabase.
* **Cómo se presenta**: Mapeado en la interfaz de usuario a prioridades legibles:
  - `caliente` -> "Alta" (rojo)
  - `tibio` -> "Media" (naranja)
  - `frio` -> "Baja" (azul)
* **Comportamiento si no existe**: Se asume `frio` (prioridad "Baja") por defecto.
