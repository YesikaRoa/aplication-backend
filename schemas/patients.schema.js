import { z } from 'zod'

// Esquema para el usuario (puedes ajustar los mensajes y validaciones según tu necesidad)
const userSchema = z.object({
  first_name: z.string().min(1, 'first_name is required').max(30),
  last_name: z.string().min(1, 'last_name is required').max(30),
  email: z.string().email('Invalid email'),
  address: z.string().max(50).optional(),
  phone: z
    .string()
    .regex(/^\d{11}$/, 'Phone must be a valid 11-digit number')
    .optional(),
  birth_date: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true // Permitir opcional
        // Parsear solo la parte de la fecha para evitar problemas de zona horaria
        const [year, month, day] = value.split('-').map(Number)
        const date = new Date(Date.UTC(year, month - 1, day))
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        return date <= today
      },
      {
        message: 'La fecha de nacimiento no puede ser mayor al día de hoy',
      },
    ),
  gender: z.enum(['F', 'M']).optional(),
  role_id: z.number(),
  status: z.enum(['Active', 'Inactive']),
  avatar: z
    .string()
    .regex(/^data:image\/[a-zA-Z]+;base64,/, 'Avatar must be a valid Base64 string')
    .optional(),
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
      .regex(/^\d{11}$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const changeStatusSchema = z.object({
  newStatus: z.enum(['Active', 'Inactive'], {
    required_error: 'New status must be either Active or Inactive',
  }),
})
