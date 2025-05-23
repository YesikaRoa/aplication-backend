import { z } from 'zod'

// Esquema para crear un usuario
export const createUserSchema = z.object({
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
    .regex(/^\d{12}$/, 'Phone must be a valid 12-digit number')
    .optional(),
  birth_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
      return new Date(arg)
    }
    return arg
  }, z.date().optional()),
  gender: z.enum(['F', 'M'], 'Gender must be either F or M').optional(),
  role_id: z.number({ message: 'Role ID is required' }),
  status: z.enum(['Active', 'Inactive'], 'Status must be either Active or Inactive'),
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
      .regex(/^\d{12}$/, 'Phone must be a valid 12-digit number')
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
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

// Esquema para cambiar la contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password must be at least 6 characters long'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
})

// Esquema para cambiar el estado (status)
export const changeStatusSchema = z.object({
  newStatus: z.enum(['Active', 'Inactive'], 'New status must be either Active or Inactive'),
})

// Validación para un ID válido (entero positivo)
export const userIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid integer'),
})
