# Izango ERP 360

Sistema Integrado de Gestión (SIG) de Grupo Izango para administrar procesos comerciales, operativos, financieros, logísticos y de talento humano.

## Stack Tecnológico
* **Frontend:** Next.js `16.2.4` (App Router), React `19.2.4` y TailwindCSS `3.4.1`.
* **Backend y Base de Datos:** Supabase (con RLS activo en tablas críticas y esquemas versionados).
* **Despliegue:** Vercel integrado con GitHub.

## Requisitos Previos
* Node.js (versión compatible con Next.js 16/React 19).
* Consola oficial del proyecto: PowerShell en Windows.
* Acceso a las variables de entorno de Supabase configuradas localmente en un archivo `.env.local`.

## Instalación y Configuración
1. Clonar el repositorio.
2. Crear un archivo `.env.local` en la raíz del proyecto y configurar las claves de Supabase:
   ```text
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   ```
3. Instalar las dependencias del proyecto:
   ```powershell
   npm install
   ```

## Ejecución Local
Para iniciar el servidor de desarrollo local con soporte de recarga en caliente:
```powershell
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Scripts Disponibles
* `npm run dev`: Ejecuta el servidor de desarrollo local.
* `npm run build`: Compila el proyecto optimizado para producción.
* `npm run start`: Inicia el servidor compilado de producción.
* `npm run lint`: Ejecuta el análisis estático de código mediante ESLint.

## Estructura del Repositorio
* `app/`: Directorio de rutas de Next.js App Router (vistas y lógica de UI por módulos).
* `components/`: Componentes reutilizables, incluyendo subcarpetas `design-system` y `ui`.
* `lib/`: Lógica central, mappers de dominio, motores de reglas de negocio (`lib/core`) y permisos.
* `supabase/`: Migraciones y scripts SQL versionados de la base de datos.
* `types/`: Definiciones de tipos TypeScript globales (`types/index.ts`).
* `docs/`: Documentación del proyecto (modelos de dominio, guías y auditorías).

## Reglas de Contribución y Desarrollo
* **Manual Operativo Mandatorio:** Todo agente autónomo o desarrollador que trabaje en el repositorio debe leer y cumplir obligatoriamente las directrices y prohibiciones detalladas en el archivo [AGENTS.md](AGENTS.md) antes de comenzar cualquier tarea.
* **Modelo de Dominio:** Consulta [IZANGO_360_DOMAIN_MODEL_V2.md](docs/IZANGO_360_DOMAIN_MODEL_V2.md) para comprender la organización del flujo operativo y financiero (como RQs, liquidaciones y conciliaciones).
* **Compilación Requerida:** Todo cambio debe compilarse localmente con `npm run build` para asegurar la corrección de tipos antes de confirmar cualquier avance.
