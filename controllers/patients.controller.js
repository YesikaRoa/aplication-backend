import { PatientModel } from '../models/patients.model.js'
import { hashPassword } from '../utils/password.js'

const createPatientWithUser = async (req, res, next) => {
  try {
    const { user, medical_data } = req.body
    const hashedPassword = await hashPassword(user.password)
    const userData = { ...user, password: hashedPassword }
    const result = await PatientModel.createPatientWithUser({ user: userData, medical_data })
    const { id, first_name, last_name, email, status } = result.user
    const { id: patient_id, user_id, medical_data: patient_medical_data } = result.patient

    res.status(201).json({
      message: 'Paciente y usuario creados con éxito',
      user: { id, first_name, last_name, email, status },
      patient: {
        id: patient_id,
        user_id,
        medical_data: patient_medical_data,
      },
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
    const { medical_data, ...userFields } = req.body

    const patientUpdates = {}
    if (medical_data !== undefined) patientUpdates.medical_data = medical_data

    const allowedUserFields = ['first_name', 'last_name', 'email', 'address', 'phone']
    const userUpdates = {}
    for (const key of allowedUserFields) {
      if (userFields[key] !== undefined) userUpdates[key] = userFields[key]
    }

    const result = await PatientModel.updatePatientAndUser(id, patientUpdates, userUpdates)

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
