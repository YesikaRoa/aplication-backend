import { Router } from 'express'
import { PatientsController } from '../controllers/patients.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import { createPatientWithUserSchema, updatePatientSchema } from '../schemas/patients.schema.js'

const router = Router()

// Crear paciente con usuario (POST /patients)
router.post(
  '/',
  authenticateToken,
  validateSchema(createPatientWithUserSchema),
  PatientsController.createPatientWithUser,
)

router.get('/', authenticateToken, PatientsController.getAllPatients)

router.get('/:id', authenticateToken, validateUserId, PatientsController.getPatientById)

router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updatePatientSchema),
  PatientsController.updatePatient,
)

router.delete('/:id', authenticateToken, validateUserId, PatientsController.deletePatient)

export default router
