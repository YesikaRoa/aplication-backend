import { z } from 'zod'

const userSchema = z.object({
  first_name: z
    .string({ required_error: 'First name is required' })
    .min(1, 'First name must have at least 1 character')
    .max(30, 'First name must not exceed 30 characters'),
  last_name: z
    .string({ required_error: 'Last name is required' })
    .min(1, 'Last name must have at least 1 character')
    .max(30, 'Last name must not exceed 30 characters'),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must have at least 6 characters'),
  address: z.string().max(50, 'Address must not exceed 50 characters').optional(),
  phone: z
    .string()
    .regex(/^\d{11}$/, 'Phone must be a valid 11-digit number (04127690000)')
    .optional(),
  birth_date: z.string({ required_error: 'Birth date is required' }).or(z.date()).optional(),
  gender: z.enum(['F', 'M'], { required_error: 'Gender is required' }).optional(),
  role_id: z.number({ required_error: 'Role ID is required' }),
  status: z.enum(['Active', 'Inactive'], { required_error: 'Status is required' }),
  avatar: z
    .string()
    .regex(/^data:image\/[a-zA-Z]+;base64,/, 'Avatar must be a valid Base64 string')
    .optional(),
})

const professionalSchema = z.object({
  professional_type_id: z.number({ required_error: 'Professional type ID is required' }),
  biography: z.string().optional(),
  years_of_experience: z.number().min(0, 'Years of experience must be at least 0').optional(),
})

export const createProfessionalWithUserSchema = z.object({
  user: userSchema,
  professional: professionalSchema,
  specialties: z
    .array(z.number({ required_error: 'Specialty ID is required' }))
    .min(1, 'At least one specialty is required'),
})

export const updateProfessionalSchema = z
  .object({
    professional: professionalSchema.partial().optional(),
    specialties: z.array(z.number()).optional(),
    first_name: z.string().max(30, 'First name must not exceed 30 characters').optional(),
    last_name: z.string().max(30, 'Last name must not exceed 30 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    address: z.string().max(50, 'Address must not exceed 50 characters').optional(),
    phone: z
      .string()
      .regex(/^\d{11}$/, 'Phone must be a valid 11-digit number')
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
