import { z } from 'zod'

const userSchema = z.object({
  first_name: z.string().min(1).max(30),
  last_name: z.string().min(1).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  address: z.string().max(50).optional(),
  phone: z
    .string()
    .regex(/^\d{12}$/)
    .optional(),
  birth_date: z.string().or(z.date()).optional(),
  gender: z.enum(['F', 'M']).optional(),
  role_id: z.number(),
  status: z.enum(['Active', 'Inactive']),
})

const professionalSchema = z.object({
  professional_type_id: z.number(),
  biography: z.string().optional(),
  years_of_experience: z.number().optional(),
})

export const createProfessionalWithUserSchema = z.object({
  user: userSchema,
  professional: professionalSchema,
  specialties: z.array(z.number()).min(1, 'At least one specialty is required'),
})

export const updateProfessionalSchema = z
  .object({
    professional: professionalSchema.partial().optional(),
    specialties: z.array(z.number()).optional(),
    first_name: z.string().max(30).optional(),
    last_name: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(50).optional(),
    phone: z
      .string()
      .regex(/^\d{11}$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
