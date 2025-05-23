import { z } from 'zod'

export const registerUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  address: z.string().optional(),
  phone: z.string().regex(/^\d{12}$/, 'Phone must be a valid 12-digit number'),
  birth_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
      return new Date(arg)
    }
    return arg
  }, z.date()),
  gender: z.enum(['F', 'M'], 'Gender must be either F or M'),
  role_id: z.number(),
  status: z.enum(['Active', 'Inactive']),
})

export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})
