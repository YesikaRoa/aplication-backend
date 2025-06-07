import { Router } from 'express'
import { ProfileController } from '../controllers/profile.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { updateProfileSchema, changePasswordSchema } from '../schemas/profile.schema.js'
import { validateUserId } from '../middlewares/validateParams.js'
const router = Router()

// Obtener perfil
router.get('/', authenticateToken, ProfileController.getProfile)

// Actualizar perfil
router.put(
  '/',
  authenticateToken,
  validateSchema(updateProfileSchema),
  ProfileController.updateProfile,
)
//Actualizar password
router.put(
  '/password',
  authenticateToken,
  validateSchema(changePasswordSchema),
  ProfileController.changePassword,
)
export default router
