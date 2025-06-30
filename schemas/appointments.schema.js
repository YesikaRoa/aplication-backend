import { z } from 'zod'

// Esquema para crear una cita
export const createAppointmentSchema = z.object({
  scheduled_at: z.preprocess((arg) => new Date(arg), z.date()),
  status: z.enum(['pending', 'confirmed', 'completed', 'canceled']),
  notes: z.string().optional(),
  patient_id: z.number(),
  professional_id: z.number(),
  city_id: z.number(),
  reason_for_visit: z.string().min(1).max(255),
  has_medical_record: z.boolean().optional(),
})

// Esquema para actualizar una cita
export const updateAppointmentSchema = z
  .object({
    scheduled_at: z.preprocess((arg) => new Date(arg), z.date()).optional(),
    status: z.enum(['pending', 'confirmed', 'completed', 'canceled']).optional(),
    notes: z.string().optional(),
    reason_for_visit: z.string().min(1).max(255).optional(),
    has_medical_record: z.boolean().optional(),
    city_id: z.number().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// Esquema para cambiar el estado de una cita
export const changeStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'canceled']),
})
