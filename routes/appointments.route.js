import { Router } from 'express'
import { AppointmentsController } from '../controllers/appointments.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
} from '../schemas/appointments.schema.js'

const router = Router()

router.post('/', validateSchema(createAppointmentSchema), AppointmentsController.createAppointment)

router.get('/', authenticateToken, AppointmentsController.getAllAppointments)

router.get('/:id', authenticateToken, AppointmentsController.getAppointmentById)

// Actualizar una cita
router.put(
  '/:id',
  authenticateToken,
  validateSchema(updateAppointmentSchema),
  AppointmentsController.updateAppointment,
)

// Eliminar una cita
router.delete('/:id', authenticateToken, AppointmentsController.deleteAppointment)

// Cambiar el estado de una cita
router.put(
  '/status/:id',
  authenticateToken,
  validateSchema(changeStatusSchema),
  AppointmentsController.changeStatus,
)

export default router
