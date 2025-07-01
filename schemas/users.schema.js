import { z } from 'zod'

// Esquema para datos adicionales de Patient
const patientDataSchema = z.object({
  medical_data: z.string().min(1, 'medical_data is required'),
})

// Esquema para datos adicionales de Professional
const professionalDataSchema = z.object({
  professional_type_id: z.number().int().positive(),
  biography: z.string().max(500).optional(),
  years_of_experience: z.number().int().nonnegative().optional(),
  specialties: z.array(z.number().int().min(1).max(60)).optional(), // Incluye specialty (1-15) y subspecialty (16-60)
})

// Esquema base para crear un usuario
export const createUserSchema = z
  .object({
    first_name: z
      .string()
      .min(1, 'First name is required')
      .max(30, 'First name cannot exceed 30 characters'),
    last_name: z
      .string()
      .min(1, 'Last name is required')
      .max(30, 'Last name cannot exceed 30 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    address: z.string().max(50, 'Address cannot exceed 50 characters').optional(),
    phone: z
      .string()
      .regex(/^\d{11}$/, 'Phone must be a valid 11-digit number (04127690000)')
      .optional(),
    birth_date: z
      .preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) {
          return new Date(arg)
        }
        return arg
      }, z.date())
      .optional()
      .refine((date) => !date || date <= new Date(), {
        message: 'La fecha de nacimiento no puede ser mayor al día de hoy',
      }),
    gender: z.enum(['F', 'M'], 'Gender must be either F or M').optional(),
    role_id: z.number({ required_error: 'Role ID is required' }),
    status: z.enum(['Active', 'Inactive'], 'Status must be either Active or Inactive'),

    avatar: z.string().url('Avatar must be a valid URL'),
    // Los datos adicionales son opcionales y dependerán del role_id
    patient_data: patientDataSchema.optional(),
    professional_data: professionalDataSchema.optional(),
  })
  .superRefine(({ role_id, patient_data, professional_data }, ctx) => {
    // Validación condicional según role_id
    if (role_id === 2) {
      // Paciente: debe enviar patient_data
      if (!patient_data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Patient data is required when role_id is 2 (patient)',
          path: ['patient_data'],
        })
      }
    } else if (role_id === 3) {
      // Profesional: debe enviar professional_data
      if (!professional_data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Professional data is required when role_id is 3 (professional)',
          path: ['professional_data'],
        })
      }
    } else if (role_id === 1) {
      // Administrador: no debe enviar datos adicionales
      if (patient_data || professional_data) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No additional data allowed for admin role',
          path: ['patient_data', 'professional_data'],
        })
      }
    }
  })

// Esquema para actualizar un usuario
export const updateUserSchema = z
  .object({
    first_name: z.string().max(30, 'First name cannot exceed 30 characters').optional(),
    last_name: z.string().max(30, 'Last name cannot exceed 30 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    address: z.string().max(50, 'Address cannot exceed 50 characters').optional(),
    phone: z
      .string()
      .regex(/^\d{11}$/, 'Phone must be a valid 11-digit number')
      .optional(),
    birth_date: z.preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) {
        return new Date(arg)
      }
      return arg
    }, z.date().optional()),
    gender: z.enum(['F', 'M'], 'Gender must be either F or M').optional(),
    role_id: z.number().optional(),
    status: z.enum(['Active', 'Inactive'], 'Status must be either Active or Inactive').optional(),
    patient_data: patientDataSchema.optional(),
    professional_data: professionalDataSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// Esquema para cambiar contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password must be at least 6 characters long'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
})

// Esquema para cambiar el estado (status)
export const changeStatusSchema = z.object({
  newStatus: z.enum(['Active', 'Inactive'], 'New status must be either Active or Inactive'),
})
