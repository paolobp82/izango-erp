import styles from "./V2System.module.css"

type V2SkeletonProps = {
  height?: number
  width?: number | string
}

export function V2Skeleton({ height = 12, width = "100%" }: V2SkeletonProps) {
  return <span aria-hidden="true" className={styles.skeleton} style={{ display: "block", height, width }} />
}
