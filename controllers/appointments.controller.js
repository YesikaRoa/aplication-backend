import { AppointmentsModel } from '../models/appointments.model.js'

const createAppointment = async (req, res, next) => {
  try {
    const newAppointment = await AppointmentsModel.createAppointment(req.body)
    res.status(201).json({ message: 'Cita creada con éxito', appointment: newAppointment })
  } catch (error) {
    next(error)
  }
}

const getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await AppointmentsModel.getAllAppointments()
    return res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const appointment = await AppointmentsModel.getAppointmentById(id)
    if (!appointment) return next(new Error('RECORD_NOT_FOUND'))
    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body
    const updatedAppointment = await AppointmentsModel.updateAppointment(id, updates)
    if (!updatedAppointment) return next(new Error('RECORD_NOT_FOUND'))
    res.status(200).json({
      message: 'Cita actualizada con éxito',
      appointment: updatedAppointment,
    })
  } catch (error) {
    next(error)
  }
}

const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params
    const deleted = await AppointmentsModel.deleteAppointment(id)
    if (!deleted) return next(new Error('RECORD_NOT_FOUND'))
    res.status(200).json({ message: 'Cita eliminada con éxito' })
  } catch (error) {
    next(error)
  }
}

const changeStatus = async (req, res, next) => {
  const validStatuses = ['pending', 'confirmed', 'completed', 'canceled']
  try {
    const { id } = req.params
    const { status } = req.body
    if (!validStatuses.includes(status)) return next(new Error('INVALID_STATUS'))
    const updatedAppointment = await AppointmentsModel.updateAppointment(id, { status })
    if (!updatedAppointment) return next(new Error('RECORD_NOT_FOUND'))
    res.status(200).json({
      message: 'Estado de la cita actualizado con éxito',
      appointment: updatedAppointment,
    })
  } catch (error) {
    next(error)
  }
}

export const AppointmentsController = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  changeStatus,
}
