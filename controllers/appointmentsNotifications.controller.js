// controllers/appointments.internal.controller.js
import { AppointmentsModel } from '../models/appointments.model.js'

export const getAppointmentsForReminders = async (req, res, next) => {
  try {
    const appointments = await AppointmentsModel.getAppointmentsForReminders()
    res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

export const markReminderSent = async (req, res, next) => {
  try {
    const { id } = req.params
    await AppointmentsModel.markReminderSent(id)
    res.status(200).json({ success: true })
  } catch (error) {
    next(error)
  }
}
