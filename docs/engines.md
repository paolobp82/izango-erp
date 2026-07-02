# SIG Core Engines

Los engines son contratos transversales que permitiran consolidar reglas comunes sin duplicarlas en cada modulo.

## Engines Iniciales

- `ConfigurationEngine`: lectura futura de configuraciones por modulo.
- `BusinessRulesEngine`: evaluacion futura de reglas operativas y financieras.
- `LifecycleEngine`: control futuro de transiciones de estado.
- `CalculationEngine`: calculos reutilizables para finanzas, rentabilidad y operaciones.
- `EventEngine`: publicacion futura de eventos de dominio.
- `NotificationEngine`: envio futuro de notificaciones internas y correos.
- `SearchEngine`: busqueda transversal futura.

## Regla de Esta Fase

Solo se crean interfaces y tipos. Ningun modulo consume estos engines todavia.

