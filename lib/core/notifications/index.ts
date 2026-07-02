import type { CoreContext, CoreResult } from "../types"

export type NotificationChannel = "in_app" | "email" | "system"

export interface NotificationRequest {
  recipientIds: string[]
  title: string
  message: string
  channels: NotificationChannel[]
  context?: CoreContext
}

export interface NotificationEngine {
  send(request: NotificationRequest): Promise<CoreResult<{ delivered: number }>>
}

