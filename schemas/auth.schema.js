import { z } from 'zod'

export const registerUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  address: z.string().optional(),
  phone: z.string().regex(/^\d{11}$/, 'Phone must be a valid 11 digit (04127690000)'),
  birth_date: z
    .preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) {
        return new Date(arg)
      }
      return arg
    }, z.date())
    .refine(
      (date) => {
        const today = new Date()
        // No permitir fechas futuras
        return date <= today
      },
      {
        message: 'The date of birth cannot be later than today.',
      },
    )
    .refine(
      (date) => {
        const today = new Date()
        const age = today.getFullYear() - date.getFullYear()
        const m = today.getMonth() - date.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
          return age - 1 >= 20
        }
        return age >= 20
      },
      {
        message: 'You must be at least 20 years old to register',
      },
    ),
  gender: z.enum(['F', 'M'], 'Gender must be either F or M'),
  role_id: z.number().refine((val) => val === 3, {
    message: 'role_id must be equal to 3',
  }),
  // ...existing code...
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
