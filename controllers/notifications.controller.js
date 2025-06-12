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

export const NotificationsController = {
  getAllNotifications,
  deleteNotification,
  createNotification,
}
