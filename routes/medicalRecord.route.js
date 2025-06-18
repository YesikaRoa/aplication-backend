import { Router } from 'express'
import { MedicalRecordController } from '../controllers/medicalRecord.controller.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { validateUserId } from '../middlewares/validateParams.js'
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
} from '../schemas/medicalRecord.schema.js'

const router = Router()

router.get('/', authenticateToken, MedicalRecordController.getAllMedicalRecords)
router.get('/:id', authenticateToken, validateUserId, MedicalRecordController.getMedicalRecordById)
router.post(
  '/',
  authenticateToken,
  validateSchema(createMedicalRecordSchema),
  MedicalRecordController.createMedicalRecord,
)
router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updateMedicalRecordSchema),
  MedicalRecordController.updateMedicalRecord,
)
router.delete(
  '/:id',
  authenticateToken,
  validateUserId,
  MedicalRecordController.deleteMedicalRecord,
)

export default router
