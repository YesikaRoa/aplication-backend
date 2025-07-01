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
    // Asegúrate que tu middleware de autenticación agregue user al request
    const userId = req.user?.id
    const roleId = req.user?.role

    const appointments = await AppointmentsModel.getAllAppointments(userId, roleId)
    return res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const appointment = await AppointmentsModel.getAppointmentById(id)
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

    res.status(200).json({ message: 'Cita eliminada con éxito', appointment: deleted })
  } catch (error) {
    next(error)
  }
}

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updatedAppointment = await AppointmentsModel.updateAppointment(id, { status })

    res.status(200).json({
      message: 'Estado de la cita actualizado con éxito',
      appointment: updatedAppointment,
    })
  } catch (error) {
    next(error)
  }
}

const getCities = async (req, res, next) => {
  try {
    const { search, limit } = req.query
    const cities = await AppointmentsModel.getCities(search, limit)
    res.json({ cities })
  } catch (error) {
    next(error)
  }
}
const getPatients = async (req, res, next) => {
  try {
    const { search, limit } = req.query
    const patients = await AppointmentsModel.getPatients(
      search,
      limit,
      req.user.id, // <-- del token
      req.user.role, // <-- del token
    )
    res.json({ patients })
  } catch (error) {
    next(error)
  }
}

const getProfessionals = async (req, res, next) => {
  try {
    const { search, limit } = req.query
    const professionals = await AppointmentsModel.getProfessionals(search, limit)
    res.json({ professionals })
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
  getCities,
  getPatients,
  getProfessionals,
}
