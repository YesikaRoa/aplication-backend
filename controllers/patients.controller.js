import { PatientModel } from '../models/patients.model.js'
import { hashPassword } from '../utils/password.js'

const createPatientWithUser = async (req, res, next) => {
  try {
    const { user, medical_data } = req.body
    const hashedPassword = await hashPassword(user.password)
    const result = await PatientModel.createPatientWithUser({ user, medical_data, hashedPassword })
    res.status(201).json({
      message: 'Paciente y usuario creados con éxito',
      user: result.user,
      patient: result.patient,
    })
  } catch (error) {
    next(error)
  }
}

const getAllPatients = async (req, res, next) => {
  try {
    const patients = await PatientModel.getAllPatients()
    res.status(200).json(patients)
  } catch (error) {
    next(error)
  }
}

const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params
    const patient = await PatientModel.getPatientById(id)
    res.status(200).json(patient)
  } catch (error) {
    next(error)
  }
}

const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body
    const result = await PatientModel.updatePatientAndUser(id, updates)
    res.status(200).json({
      message: 'Paciente y usuario actualizados con éxito',
      patient: result.patient,
      user: result.user,
    })
  } catch (error) {
    next(error)
  }
}

const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params
    await PatientModel.deletePatientAndUser(id)
    res.status(200).json({ message: 'Paciente y usuario eliminados con éxito' })
  } catch (error) {
    next(error)
  }
}

export const PatientsController = {
  createPatientWithUser,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
}
