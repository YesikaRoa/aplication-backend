import { z } from 'zod'

export const createNotificationSchema = z.object({
  user_id: z.number().int().positive().optional(),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['appointment', 'reminder', 'evaluation']),
})
