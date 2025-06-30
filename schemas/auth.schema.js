import { z } from 'zod'

export const registerUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  address: z.string().optional(),
  phone: z.string().regex(/^\d{11}$/, 'Phone must be a valid 11 digit (04127690000)'),
  birth_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
      return new Date(arg)
    }
    return arg
  }, z.date()),
  gender: z.enum(['F', 'M'], 'Gender must be either F or M'),
  role_id: z.number(),
  status: z.enum(['Active', 'Inactive']),
  avatar: z
    .string()
    .regex(/^data:image\/[a-zA-Z]+;base64,/, 'Avatar must be a valid Base64 string')
    .optional(),
  professional_type_id: z.number(),
  biography: z.string(),
  years_of_experience: z.number().min(0, 'Years of experience must be a positive number'),
  specialty_ids: z.array(z.number()),
})

export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})
