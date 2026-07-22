# Gobernanza de Diseño V2 RC-1 (Release Candidate 1)

Este documento establece las directrices operativas y de control arquitectónico para el uso de la infraestructura visual V2 en **IZANGO SIG**.

---

## 1. Congelamiento V2 RC-1
* La infraestructura visual de la V2 queda declarada oficialmente como **Release Candidate 1 (RC-1)**.
* Los archivos base del sistema de diseño no se modificarán ad-hoc ni se alterarán sus estilos genéricos sin un proceso formal de brecha demostrada.
* **Ubicaciones congeladas**:
  - `components/v2/layout/`
  - `components/v2/system/`
  - `components/v2/templates/`

## 2. Estabilidad de APIs Públicas
* Las APIs públicas existentes (props, firmas de funciones y tipos de TypeScript) no se modificarán a menos que se demuestre una brecha funcional crítica.
* Cualquier cambio futuro deberá clasificarse estrictamente en alguna de estas categorías:
  - **Corrección**: Errores lógicos en el renderizado o comportamiento.
  - **Compatibilidad**: Ajustes necesarios para soportar compilación estática.
  - **Accesibilidad**: Etiquetas ARIA, contraste cromático o navegación por teclado.
  - **Responsive**: Ajustes ante resoluciones móviles o de alta densidad (1920px).
  - **Brecha funcional demostrada**: Funcionalidades imposibles de resolver por composición.

## 3. Principio de Composición vs. Nuevos Componentes
* No se crearán nuevos componentes de diseño si el problema visual se puede resolver mediante composición con los componentes ya existentes en `components/v2/system/`.
* Se prohíbe duplicar componentes funcionales o visuales entre la V1 y la V2.

## 4. Estructura de Consumo
* Los nuevos módulos y los módulos migrados deben importar componentes y layouts exclusivamente de las carpetas oficiales V2:
  - `components/v2/layout/`
  - `components/v2/system/`
  - `components/v2/templates/`

## 5. Showcase vivo y Entorno de QA
* Las rutas `/admin/design-system-v2` y `/admin/ui-v2-shell` quedan declaradas como showcase vivo y herramientas principales para pruebas de control de regresión visual (QA).

## 6. Coexistencia V1 y V2
* La infraestructura visual V1 no será eliminada ni reemplazada del codebase principal todavía, ya que los módulos antiguos continúan consumiéndola.
* La migración de Izango SIG se ejecutará de forma progresiva, módulo por módulo.

## 7. Prioridad Funcional
* La lógica de negocio, reglas de alcance, consultas Supabase y seguridad RLS son prioritarios. Ningún ajuste de diseño debe alterar el comportamiento funcional original de la aplicación.
