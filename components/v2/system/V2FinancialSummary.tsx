"use client"

import styles from "./V2System.module.css"

export type V2FinancialSummaryItem = {
  label: string
  value: string | number
  percentage: number
  type: "inflows" | "receivables" | "total"
}

export type V2FinancialSummaryProps = {
  items: V2FinancialSummaryItem[]
}

export function V2FinancialSummary({ items }: V2FinancialSummaryProps) {
  return (
    <div className={styles.financialSummaryCard}>
      <div className={styles.financialBars}>
        {items.map((item) => {
          const barClass =
            item.type === "inflows"
              ? styles.financialInflows
              : item.type === "receivables"
              ? styles.financialReceivables
              : styles.financialTotal

          return (
            <div className={styles.financialBarRow} key={item.label}>
              <span className={styles.financialLabel}>{item.label}</span>
              <span className={styles.financialValue}>{item.value}</span>
              <div className={styles.financialTrack}>
                <div
                  className={`${styles.financialBar} ${barClass}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
