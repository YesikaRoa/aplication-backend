import { z } from 'zod'

export const updateProfileSchema = z.object({
  userData: z
    .object({
      first_name: z.string().max(30).optional(),
      last_name: z.string().max(30).optional(),
      email: z.string().email().optional(),
      address: z.string().max(50).optional(),
      phone: z
        .string()
        .regex(/^\d{12}$/)
        .optional(),
      birth_date: z.string().optional(),
      gender: z.enum(['F', 'M']).optional(),
      status: z.enum(['Active', 'Inactive']).optional(),
    })
    .optional(),
  professionalData: z
    .object({
      biography: z.string().optional(),
      years_of_experience: z.number().int().optional(),
      specialties: z.array(z.number().int()).optional(),
    })
    .optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password must be at least 6 characters long'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'New password must be at least 6 characters long'),
})
