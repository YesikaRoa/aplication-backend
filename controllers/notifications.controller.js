import { NotificationModel } from '../models/notifications.model.js'

const getAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id // Asumiendo que el middleware auth pone el user en req.user
    const notifications = await NotificationModel.getAllByUserId(userId)
    res.status(200).json(notifications)
  } catch (error) {
    next(error)
  }
}

const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    await NotificationModel.deleteByIdAndUserId(id, userId)
    res.status(200).json({ message: 'Notificación eliminada con éxito' })
  } catch (error) {
    next(error)
  }
}
const createNotification = async (req, res, next) => {
  try {
    const { content, type } = req.body
    const user_id = req.user.id // viene del token

    const notification = await NotificationModel.createNotification({
      user_id,
      content,
      type,
    })

    res.status(201).json({
      message: 'Notificación creada con éxito',
      notification,
    })
  } catch (error) {
    next(error)
  }
}
const createNotificationInternal = async (req, res, next) => {
  try {
    const { user_id, content, type } = req.body

    const notification = await NotificationModel.createNotification({
      user_id,
      content,
      type,
    })

    res.status(201).json(notification)
  } catch (error) {
    next(error)
  }
}

const updateStatus = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { status } = req.body

    // Validar que el status sea válido
    if (!['read', 'unread'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' })
    }

    await NotificationModel.updateStatus(id, userId, status)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id
    await NotificationModel.deleteAllByUserId(userId)
    res.status(200).json({ success: true, message: 'Todas las notificaciones eliminadas' })
  } catch (error) {
    next(error)
  }
}
export const NotificationsController = {
  getAllNotifications,
  createNotificationInternal,
  deleteNotification,
  createNotification,
  updateStatus,
  deleteAllNotifications,
}
