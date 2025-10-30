import { Router } from 'express'
import { AppointmentsController } from '../controllers/appointments.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { validateUserId } from '../middlewares/validateParams.js'

import { authenticateToken } from '../middlewares/auth.js'
import {
  updateAppointmentSchema,
  changeStatusSchema,
  createAppointmentSchema,
} from '../schemas/appointments.schema.js'

const router = Router()

router.post(
  '/',
  authenticateToken,
  validateSchema(createAppointmentSchema),

  AppointmentsController.createAppointment,
)

router.get('/', authenticateToken, AppointmentsController.getAllAppointments)
router.get('/cities', AppointmentsController.getCities)
router.get('/patients', authenticateToken, AppointmentsController.getPatients)
router.get('/professionals', AppointmentsController.getProfessionals)

router.get('/:id', authenticateToken, validateUserId, AppointmentsController.getAppointmentById)

// Actualizar una cita
router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updateAppointmentSchema),
  AppointmentsController.updateAppointment,
)

// Eliminar una cita
router.delete('/:id', authenticateToken, validateUserId, AppointmentsController.deleteAppointment)

// Cambiar el estado de una cita
router.put(
  '/status/:id',
  authenticateToken,
  validateUserId,
  validateSchema(changeStatusSchema),
  AppointmentsController.changeStatus,
)

export default router
