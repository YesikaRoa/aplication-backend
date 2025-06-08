import { z } from 'zod'

// Esquema para el usuario (puedes ajustar los mensajes y validaciones según tu necesidad)
const userSchema = z.object({
  first_name: z.string().min(1, 'first_name is required').max(30),
  last_name: z.string().min(1, 'last_name is required').max(30),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  address: z.string().max(50).optional(),
  phone: z
    .string()
    .regex(/^\d{12}$/, 'Phone must be a valid 12-digit number')
    .optional(),
  birth_date: z.string().or(z.date()).optional(),
  gender: z.enum(['F', 'M']).optional(),
  role_id: z.number(),
  status: z.enum(['Active', 'Inactive']),
})

// Esquema para crear paciente con usuario
export const createPatientWithUserSchema = z.object({
  user: userSchema,
  medical_data: z.string().min(1, 'medical_data is required'),
})

export const updatePatientSchema = z
  .object({
    medical_data: z.string().optional(),
    first_name: z.string().max(30).optional(),
    last_name: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(50).optional(),
    phone: z
      .string()
      .regex(/^\d{12}$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
