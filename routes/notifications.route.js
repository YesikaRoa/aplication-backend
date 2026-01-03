import { Router } from 'express'
import { NotificationsController } from '../controllers/notifications.controller.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import { createNotificationSchema } from '../schemas/notifications.schema.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateInternal } from '../middlewares/authInternal.js'
import {
  getAppointmentsForReminders,
  markReminderSent,
} from '../controllers/appointmentsNotifications.controller.js'
const router = Router()

// Eliminar todas las notificaciones del usuario
router.delete('/all', authenticateToken, NotificationsController.deleteAllNotifications)

// Eliminar una notificación (DELETE /notifications/:id)
router.delete('/:id', authenticateToken, validateUserId, NotificationsController.deleteNotification)

//Actualizar status de una notificación (PUT /notifications/:id/status)
router.put('/:id/status', authenticateToken, validateUserId, NotificationsController.updateStatus)

// Crear una nueva notificación (POST /notifications)
router.post(
  '/',
  authenticateToken,
  validateSchema(createNotificationSchema),
  NotificationsController.createNotification,
)
router.post('/internal', authenticateInternal, NotificationsController.createNotificationInternal)

// Obtener todas las notificaciones del usuario (GET /notifications)
router.get('/', authenticateToken, NotificationsController.getAllNotifications)

router.get('/internal/reminders', authenticateInternal, getAppointmentsForReminders)
router.post('/internal/:id/mark-reminder', authenticateInternal, markReminderSent)

export default router
