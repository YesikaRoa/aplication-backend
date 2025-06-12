import { Router } from 'express'
import { NotificationsController } from '../controllers/notifications.controller.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import { createNotificationSchema } from '../schemas/notifications.schema.js'
import { validateSchema } from '../middlewares/validateSchema.js'
const router = Router()

// Crear una nueva notificación (POST /notifications)
router.post(
  '/',
  authenticateToken,
  validateSchema(createNotificationSchema),
  NotificationsController.createNotification,
)

// Obtener todas las notificaciones del usuario (GET /notifications)
router.get('/', authenticateToken, NotificationsController.getAllNotifications)

// Eliminar una notificación (DELETE /notifications/:id)
router.delete('/:id', authenticateToken, validateUserId, NotificationsController.deleteNotification)

export default router
