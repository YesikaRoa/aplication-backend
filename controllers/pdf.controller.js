import { PdfModel } from '../models/pdf.model.js'
import path from 'path'
import fs from 'fs'

const downloadMedicalHistory = async (req, res, next) => {
  try {
    const { patient_id } = req.query
    const user_id = req.user.id

    if (!patient_id || !user_id) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos.' })
    }

    const outputPath = path.join(process.cwd(), `temp_historial_${patient_id}_${user_id}.pdf`)

    // Esperar a que el PDF esté completamente generado
    await PdfModel.generateMedicalHistoryPDF({
      patient_id,
      user_id,
      outputPath,
    })

    // Descargar el archivo
    res.download(outputPath, `historial_paciente_${patient_id}.pdf`, (err) => {
      fs.unlink(outputPath, () => {})
      if (err) next(err)
    })
  } catch (error) {
    next(error)
  }
}

const getMyPatients = async (req, res, next) => {
  try {
    const user_id = req.user.id // El id del usuario logeado, extraído del token
    const patients = await PdfModel.getPatientsByLoggedUser(user_id)
    res.status(200).json(patients)
  } catch (error) {
    next(error)
  }
}
export const PdfController = {
  downloadMedicalHistory,
  getMyPatients,
}
