import { z } from 'zod'

export const createMedicalRecordSchema = z.object({
  patient_id: z.number().int().positive(),
  professional_id: z.number().int().positive(),
  appointment_id: z.number().int().positive(),
  reason_for_visit: z.string().optional().nullable(),
  current_illness_history: z.string().optional().nullable(),
  symptoms: z.string().optional().nullable(),
  physical_exam: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  body_mass_index: z.number().optional().nullable(),
  blood_pressure: z.string().max(20).optional().nullable(),
  heart_rate: z.number().int().optional().nullable(),
  respiratory_rate: z.number().int().optional().nullable(),
  temperature: z.number().optional().nullable(),
  oxygen_saturation: z.number().int().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  differential_diagnosis: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  treatment_plan: z.string().optional().nullable(),
  medications_prescribed: z.string().optional().nullable(),
  laboratory_tests_requested: z.string().optional().nullable(),
  imaging_tests_requested: z.string().optional().nullable(),
  test_instructions: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(), // Se espera ISO string o similar
  evolution_notes: z.string().optional().nullable(),
  general_notes: z
    .string()
    .max(1000, 'General notes should not exceed 1000 characters.')
    .optional()
    .nullable(),
  image: z.string().optional().nullable(),
})

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial()
