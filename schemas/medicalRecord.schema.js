import { z } from 'zod'

export const createMedicalRecordSchema = z.object({
  patient_id: z.number().int().positive(),
  professional_id: z.number().int().positive(),
  appointment_id: z.number().int().positive(),
  general_notes: z.string().max(1000, 'General notes should not exceed 1000 characters.'),
  image: z.string().url('Avatar must be a valid URL y debe venir en base64').optional().nullable(),
})
export const updateMedicalRecordSchema = z.object({
  patient_id: z.number().int().positive().optional(),
  professional_id: z.number().int().positive().optional(),
  appointment_id: z.number().int().positive().optional(),
  general_notes: z
    .string()
    .max(1000, 'General notes should not exceed 1000 characters.')
    .optional(),
  image: z.string().url('Avatar must be a valid URL and must be in base64').optional(),
})
