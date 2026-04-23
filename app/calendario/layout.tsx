import { ReactNode } from 'react'
import AppLayout from '@/components/layout/AppLayout'
export default function CalendarioLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}