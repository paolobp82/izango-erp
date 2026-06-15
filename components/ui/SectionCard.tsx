export default function SectionCard({
  children,
  title,
  action,
}: {
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "#1E293B",
            }}
          >
            {title}
          </h3>

          {action}
        </div>
      )}

      <div
        style={{
          padding: "20px",
        }}
      >
        {children}
      </div>
    </div>
  )
}