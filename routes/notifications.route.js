import { Router } from 'express'
import { NotificationsController } from '../controllers/notifications.controller.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'

const router = Router()

// Obtener todas las notificaciones del usuario (GET /notifications)
router.get('/', authenticateToken, NotificationsController.getAllNotifications)

// Eliminar una notificación (DELETE /notifications/:id)
router.delete('/:id', authenticateToken, validateUserId, NotificationsController.deleteNotification)

export default router
