import { Router } from 'express'
import { ProfileController } from '../controllers/profile.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { updateProfileSchema, changePasswordSchema } from '../schemas/profile.schema.js'
import { validateUserId } from '../middlewares/validateParams.js'
const router = Router()

// Obtener perfil
router.get('/:id', authenticateToken, validateUserId, ProfileController.getProfile)

// Actualizar perfil
router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updateProfileSchema),
  ProfileController.updateProfile,
)
//Actualizar password
router.put(
  '/password/:id',
  authenticateToken,
  validateUserId,
  validateSchema(changePasswordSchema),
  ProfileController.changePassword,
)
export default router
