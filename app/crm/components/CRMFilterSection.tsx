"use client"

import { useState, useMemo } from "react"
import { V2FilterBar, V2FilterDrawer } from "@/components/v2/filters"
import { V2Select, V2Input, V2FormField } from "@/components/v2/system"
import styles from "@/components/v2/filters/V2Filters.module.css"

export interface AppliedFilters {
  responsableId: string
  clienteId: string
  estado: string
  origen: string
  periodo: string
  temperatura: string
  montoMin: string
  montoMax: string
  soloMisLeads: boolean
}

export type CRMFilterSectionProps = {
  appliedFilters: AppliedFilters
  setAppliedFilters: (filters: AppliedFilters) => void
  busqueda: string
  setBusqueda: (val: string) => void
  activeFiltersCount: number
  responsableOptions: Array<{ value: string; label: string }>
  clienteOptions: Array<{ value: string; label: string }>
  estadoOptions: Array<{ value: string; label: string }>
  origenOptions: Array<{ value: string; label: string }>
  temperaturaOptions: Array<{ value: string; label: string }>
}

const emptyFilters: AppliedFilters = {
  responsableId: "",
  clienteId: "",
  estado: "",
  origen: "",
  periodo: "actual",
  temperatura: "",
  montoMin: "",
  montoMax: "",
  soloMisLeads: false,
}

export function CRMFilterSection({
  appliedFilters,
  setAppliedFilters,
  busqueda,
  setBusqueda,
  activeFiltersCount,
  responsableOptions,
  clienteOptions,
  estadoOptions,
  origenOptions,
  temperaturaOptions,
}: CRMFilterSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<AppliedFilters>({ ...appliedFilters })

  // Apply filters drawer values
  function handleApply() {
    setAppliedFilters({ ...tempFilters })
    setIsOpen(false)
  }

  // Clear all filters
  function handleClearAll() {
    if (confirm("¿Estás seguro de que deseas limpiar todos los filtros?")) {
      setTempFilters({ ...emptyFilters })
      setAppliedFilters({ ...emptyFilters })
      setBusqueda("")
    }
  }

  // Handle individual chip removal
  function handleRemoveChip(chipId: string) {
    const updated = { ...appliedFilters }
    if (chipId === "busqueda") setBusqueda("")
    else if (chipId === "responsable") updated.responsableId = ""
    else if (chipId === "cliente") updated.clienteId = ""
    else if (chipId === "estado") updated.estado = ""
    else if (chipId === "origen") updated.origen = ""
    else if (chipId === "periodo") updated.periodo = "actual"
    else if (chipId === "temperatura") updated.temperatura = ""
    else if (chipId === "montoMin" || chipId === "montoMax") {
      updated.montoMin = ""
      updated.montoMax = ""
    } else if (chipId === "soloMisLeads") updated.soloMisLeads = false

    setAppliedFilters(updated)
  }

  // Generate chips from appliedFilters
  const activeChips = useMemo(() => {
    const chips = []
    if (busqueda) {
      chips.push({ id: "busqueda", label: "Búsqueda", valueLabel: `"${busqueda}"` })
    }
    if (appliedFilters.responsableId) {
      const option = responsableOptions.find((o) => o.value === appliedFilters.responsableId)
      chips.push({ id: "responsable", label: "Comercial", valueLabel: option ? option.label : "Asignado" })
    }
    if (appliedFilters.clienteId) {
      const option = clienteOptions.find((o) => o.value === appliedFilters.clienteId)
      chips.push({ id: "cliente", label: "Cliente", valueLabel: option ? option.label : "Vinculado" })
    }
    if (appliedFilters.estado) {
      const option = estadoOptions.find((o) => o.value === appliedFilters.estado)
      chips.push({ id: "estado", label: "Estado", valueLabel: option ? option.label : "Filtro" })
    }
    if (appliedFilters.origen) {
      chips.push({ id: "origen", label: "Fuente", valueLabel: appliedFilters.origen })
    }
    if (appliedFilters.periodo !== "actual") {
      chips.push({ id: "periodo", label: "Periodo", valueLabel: appliedFilters.periodo })
    }
    if (appliedFilters.temperatura) {
      // Map temperatura label friendly: caliente -> Alta, tibio -> Media, frio -> Baja
      let term = "Baja"
      if (appliedFilters.temperatura === "caliente") term = "Alta"
      else if (appliedFilters.temperatura === "tibio") term = "Media"
      chips.push({ id: "temperatura", label: "Temperatura", valueLabel: term })
    }
    if (appliedFilters.montoMin || appliedFilters.montoMax) {
      const minText = appliedFilters.montoMin ? `S/ ${appliedFilters.montoMin}` : "S/ 0"
      const maxText = appliedFilters.montoMax ? `S/ ${appliedFilters.montoMax}` : "Máx"
      chips.push({ id: "montoRange", label: "Presupuesto", valueLabel: `${minText} - ${maxText}` })
    }
    if (appliedFilters.soloMisLeads) {
      chips.push({ id: "soloMisLeads", label: "Filtro", valueLabel: "Solo mis leads" })
    }
    return chips
  }, [appliedFilters, busqueda, responsableOptions, clienteOptions, estadoOptions])

  // Quick filters on the toolbar main bar (they apply instantly)
  const quickFilters = (
    <>
      {responsableOptions.length > 2 && (
        <div className={styles.responsableWrapper}>
          <V2Select
            options={responsableOptions}
            value={appliedFilters.responsableId}
            onChange={(e) => setAppliedFilters({ ...appliedFilters, responsableId: e.target.value })}
            compact
          />
        </div>
      )}
      <div className={styles.clienteWrapper}>
        <V2Select
          options={clienteOptions}
          value={appliedFilters.clienteId}
          onChange={(e) => setAppliedFilters({ ...appliedFilters, clienteId: e.target.value })}
          compact
        />
      </div>
      <div className={styles.estadoWrapper}>
        <V2Select
          options={estadoOptions}
          value={appliedFilters.estado}
          onChange={(e) => setAppliedFilters({ ...appliedFilters, estado: e.target.value })}
          compact
        />
      </div>
      <div className={styles.origenWrapper}>
        <V2Select
          options={origenOptions}
          value={appliedFilters.origen}
          onChange={(e) => setAppliedFilters({ ...appliedFilters, origen: e.target.value })}
          compact
        />
      </div>
    </>
  )

  return (
    <>
      <V2FilterBar
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        activeFiltersCount={activeFiltersCount}
        onToggleDrawer={() => {
          setTempFilters({ ...appliedFilters })
          setIsOpen(true)
        }}
        quickFilters={quickFilters}
        onClearFilters={() => {
          setAppliedFilters({ ...emptyFilters })
          setBusqueda("")
        }}
        showClearButton={activeFiltersCount > 0}
        hideDrawerButton
      />

      <V2FilterDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        activeChips={activeChips}
        onRemoveChip={handleRemoveChip}
        onApply={handleApply}
        onClearAll={handleClearAll}
        showSaveView
      >
        <div style={{ display: "grid", gap: "16px" }}>
          {responsableOptions.length > 2 && (
            <V2FormField label="Responsable">
              <V2Select
                options={responsableOptions}
                value={tempFilters.responsableId}
                onChange={(e) => setTempFilters({ ...tempFilters, responsableId: e.target.value })}
              />
            </V2FormField>
          )}

          <V2FormField label="Cliente">
            <V2Select
              options={clienteOptions}
              value={tempFilters.clienteId}
              onChange={(e) => setTempFilters({ ...tempFilters, clienteId: e.target.value })}
            />
          </V2FormField>

          <V2FormField label="Estado">
            <V2Select
              options={estadoOptions}
              value={tempFilters.estado}
              onChange={(e) => setTempFilters({ ...tempFilters, estado: e.target.value })}
            />
          </V2FormField>

          <V2FormField label="Fuente (Origen)">
            <V2Select
              options={origenOptions}
              value={tempFilters.origen}
              onChange={(e) => setTempFilters({ ...tempFilters, origen: e.target.value })}
            />
          </V2FormField>

          <V2FormField label="Temperatura">
            <V2Select
              options={temperaturaOptions}
              value={tempFilters.temperatura}
              onChange={(e) => setTempFilters({ ...tempFilters, temperatura: e.target.value })}
            />
          </V2FormField>

          <V2FormField label="Rango de Presupuesto (Monto)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <V2Input
                placeholder="Mínimo"
                type="number"
                value={tempFilters.montoMin}
                onChange={(e) => setTempFilters({ ...tempFilters, montoMin: e.target.value })}
              />
              <V2Input
                placeholder="Máximo"
                type="number"
                value={tempFilters.montoMax}
                onChange={(e) => setTempFilters({ ...tempFilters, montoMax: e.target.value })}
              />
            </div>
          </V2FormField>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
            <input
              id="soloMisLeadsDrawer"
              type="checkbox"
              checked={tempFilters.soloMisLeads}
              onChange={(e) => setTempFilters({ ...tempFilters, soloMisLeads: e.target.checked })}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <label htmlFor="soloMisLeadsDrawer" style={{ fontSize: "12px", color: "var(--v2-text)", fontWeight: 700, cursor: "pointer" }}>
              Solo mis leads (Responsable de cuenta)
            </label>
          </div>
        </div>
      </V2FilterDrawer>
    </>
  )
}
