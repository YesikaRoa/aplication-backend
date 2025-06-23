import { MedicalRecordModel } from '../models/medicalRecord.model.js'

const getAllMedicalRecords = async (req, res, next) => {
  try {
    const medicalRecords = await MedicalRecordModel.getAllMedicalRecords()
    res.status(200).json(medicalRecords)
  } catch (error) {
    next(error)
  }
}

const getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params
    const medicalRecord = await MedicalRecordModel.getMedicalRecordById(id)
    res.status(200).json(medicalRecord)
  } catch (error) {
    next(error)
  }
}

const createMedicalRecord = async (req, res, next) => {
  try {
    const { patient_id, professional_id, appointment_id, general_notes, image } = req.body

    const newMedicalRecord = await MedicalRecordModel.createMedicalRecord({
      patient_id,
      professional_id,
      appointment_id,
      general_notes,
      image, // Imagen enviada desde el cliente
    })

    res.status(201).json({ message: 'Registro médico creado', medicalRecord: newMedicalRecord })
  } catch (error) {
    next(error)
  }
}

const updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body

    const updatedMedicalRecord = await MedicalRecordModel.updateMedicalRecord(id, updates)
    res
      .status(200)
      .json({ message: 'Registro médico actualizado', medicalRecord: updatedMedicalRecord })
  } catch (error) {
    next(error)
  }
}

const deleteMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params

    await MedicalRecordModel.deleteMedicalRecord(id)
    res.status(200).json({ message: 'Registro médico eliminado' })
  } catch (error) {
    next(error)
  }
}

export const MedicalRecordController = {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
}
