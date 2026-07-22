# Auditoría del Módulo Perfil V1 y Plan de Migración V2

Este documento contiene la auditoría detallada de la arquitectura funcional y visual del módulo Perfil, junto con el plan para su migración piloto al SIG Design Language V2.

---

## 1. Detalles Técnicos Encontrados

### 1.1. Ruta real del módulo
* **Ruta de la vista**: `app/perfil/page.tsx`
* **Ruta de la API**: `app/api/perfil/cambiar-password/route.ts`

### 1.2. Archivos que lo componen
* `app/perfil/page.tsx`: Componente de cliente Next.js (`"use client"`) que maneja la vista y el estado.
* `app/api/perfil/cambiar-password/route.ts`: API Route para actualizar la contraseña del usuario.

### 1.3. Componentes reutilizados
Actualmente es un archivo autocontenido que no importa componentes compartidos más allá de `createClient` desde `@/lib/supabase`. Utiliza clases locales de CSS (como `card` y `btn-primary`) y estilos inline para el resto del layout.

### 1.4. Consultas a Supabase
* **Lectura**: `supabase.from("perfiles").select("*").eq("id", user.id).single()`
* **Escritura**: `supabase.from("perfiles").update({ nombre, apellido, cargo }).eq("id", perfil.id)`

### 1.5. Tablas y columnas reales
* **Tabla**: `perfiles`
* **Columnas consultadas/modificadas**:
  - `id` (uuid, FK a auth.users)
  - `nombre` (text)
  - `apellido` (text)
  - `cargo` (text)
  - `perfil` (text)

### 1.6. Lógica de carga
Se ejecuta un `useEffect` que obtiene el usuario actual de Supabase Auth mediante `supabase.auth.getUser()`. Si el usuario existe, consulta su perfil correspondiente en la tabla pública `perfiles` y actualiza los estados locales. Al terminar la consulta, establece `loading` en `false`.

### 1.7. Lógica de actualización
* **Perfil**: Llama a `guardarPerfil` que realiza un `.update` en Supabase sobre el registro del usuario.
* **Contraseña**: Llama a `cambiarPassword` que realiza un `POST` al endpoint local `/api/perfil/cambiar-password`.

### 1.8. Manejo de avatar o imagen
No cuenta con almacenamiento físico de imágenes en buckets de Supabase. El avatar se genera de manera dinámica en el cliente extrayendo la primera letra del nombre y apellido (`{nombre?.[0]}{apellido?.[0]}`) y mostrándolas en un círculo verde.

### 1.9. Validaciones
* Contraseñas vacías o que no coinciden (`passNueva !== passConfirmar`).
* Longitud mínima de la contraseña (`passNueva.length < 6`).

### 1.10. Roles y permisos
Cualquier usuario autenticado puede acceder a su propio perfil. Se mapea el rol del perfil a un tag de color específico utilizando un diccionario de estilos:
- `superadmin`, `gerente_general`, `administrador`, `controller`, `productor`, `logistica`, `practicante`, `comercial`, `gerente_produccion`, `gerente_finanzas`.

### 1.11. Estados de la interfaz
* `loading`: Muestra un texto simple `Cargando...`.
* `saving` / `savingPass`: Bloquea los botones de envío durante la operación.
* `msg` / `msgPass` / `error` / `errorPass`: Muestra bloques de alerta con el resultado.

### 1.12. Dependencias con AppLayout
Hereda el contexto del layout global de la aplicación (no tiene layouts internos propios).

### 1.13. Riesgos de regresión
* **Muy bajo**. Es un componente cliente auto-contenido con llamadas directas al cliente Supabase y una API Route específica para la contraseña.

### 1.14. Template V2 más adecuado
* **`V2SettingsPageTemplate`**: Permite maquetar el perfil con un encabezado ejecutivo, pestañas de navegación (ej. Perfil y Seguridad) y envolver los datos en formularios limpios de V2.

---

## 2. Decisión de Continuidad

El módulo Perfil es **altamente apto para la migración piloto**. Es simple, no maneja cargas de archivos a Buckets de Supabase ni políticas complejas de RLS (solo se consulta el perfil propio del usuario logueado), no interactúa con lógica comercial externa y posee un bajísimo riesgo de regresión. Se aprueba avanzar directamente con la **Fase 4 - Migración Visual**.
