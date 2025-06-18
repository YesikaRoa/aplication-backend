import { z } from 'zod'

export const createMedicalRecordSchema = z.object({
  patient_id: z.number().int().positive(),
  professional_id: z.number().int().positive(),
  appointment_id: z.number().int().positive(),
  general_notes: z.string().max(1000, 'Las notas generales no deben superar los 1000 caracteres.'),
})
export const updateMedicalRecordSchema = z.object({
  patient_id: z.number().int().positive().optional(),
  professional_id: z.number().int().positive().optional(),
  appointment_id: z.number().int().positive().optional(),
  general_notes: z
    .string()
    .max(1000, 'Las notas generales no deben superar los 1000 caracteres.')
    .optional(),
})
