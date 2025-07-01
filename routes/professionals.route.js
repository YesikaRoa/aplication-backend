import { Router } from 'express'
import { ProfessionalsController } from '../controllers/professionals.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import { authorizeAdmin } from '../middlewares/authorizeAdmin.js'

import {
  createProfessionalWithUserSchema,
  updateProfessionalSchema,
  changeStatusSchema,
} from '../schemas/professionals.schema.js'

const router = Router()

router.post(
  '/',
  authenticateToken,
  authorizeAdmin,
  validateSchema(createProfessionalWithUserSchema),
  ProfessionalsController.createProfessionalWithUser,
)

router.get('/', authenticateToken, authorizeAdmin, ProfessionalsController.getAllProfessionals)

router.get(
  '/:id',
  authenticateToken,
  authorizeAdmin,
  validateUserId,
  ProfessionalsController.getProfessionalById,
)

router.put(
  '/:id',
  authenticateToken,
  authorizeAdmin,
  validateUserId,
  validateSchema(updateProfessionalSchema),
  ProfessionalsController.updateProfessional,
)
router.put(
  '/status/:id',
  authenticateToken,
  authorizeAdmin,
  validateUserId,
  validateSchema(changeStatusSchema),
  ProfessionalsController.changeStatus,
)
router.delete(
  '/:id',
  authenticateToken,
  authorizeAdmin,
  validateUserId,
  ProfessionalsController.deleteProfessional,
)

export default router
