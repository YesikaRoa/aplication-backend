import { Router } from 'express'
import { ProfessionalsController } from '../controllers/professionals.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import {
  createProfessionalWithUserSchema,
  updateProfessionalSchema,
} from '../schemas/professionals.schema.js'

const router = Router()

router.post(
  '/',
  authenticateToken,
  validateSchema(createProfessionalWithUserSchema),
  ProfessionalsController.createProfessionalWithUser,
)

router.get('/', authenticateToken, ProfessionalsController.getAllProfessionals)

router.get('/:id', authenticateToken, validateUserId, ProfessionalsController.getProfessionalById)

router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updateProfessionalSchema),
  ProfessionalsController.updateProfessional,
)

router.delete('/:id', authenticateToken, validateUserId, ProfessionalsController.deleteProfessional)

export default router
