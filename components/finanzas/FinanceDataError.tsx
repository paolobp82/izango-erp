type FinanceDataErrorProps = {
  detail: string
}

export default function FinanceDataError({ detail }: FinanceDataErrorProps) {
  if (!detail) return null

  return (
    <div
      role="alert"
      style={{
        padding: 12,
        marginBottom: 16,
        background: "#FEF2F2",
        color: "#991B1B",
        border: "1px solid #FECACA",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <strong>No se pudieron cargar todos los datos financieros:</strong> {detail}
    </div>
  )
}
