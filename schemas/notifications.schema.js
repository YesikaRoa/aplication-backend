import { z } from 'zod'

export const createNotificationSchema = z.object({
  user_id: z.number().int().positive().optional(),
  content: z.string().min(1, 'El contenido es requerido'),
  type: z.enum(['appointment', 'reminder', 'evaluation']),
})
