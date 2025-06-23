import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import cloudinary from '../config/cloudinary.js'

const getAllMedicalRecords = async () => {
  const query = {
    text: `
      SELECT 
        mr.id, 
        u_patient.first_name AS patient_first_name, 
        u_patient.last_name AS patient_last_name, 
        u_professional.first_name AS professional_first_name, 
        u_professional.last_name AS professional_last_name, 
        a.scheduled_at, 
        mr.general_notes, 
        mr.image,
        mr.created_at 
      FROM medical_record mr
      INNER JOIN patient p ON mr.patient_id = p.id
      INNER JOIN "users" u_patient ON p.user_id = u_patient.id
      INNER JOIN professional prof ON mr.professional_id = prof.id
      INNER JOIN "users" u_professional ON prof.user_id = u_professional.id
      INNER JOIN appointment a ON mr.appointment_id = a.id
      ORDER BY mr.created_at DESC
    `,
  }
  const { rows } = await db.query(query)
  return rows
}

const getMedicalRecordById = async (id) => {
  const query = {
    text: `
      SELECT 
        mr.id,
        mr.general_notes,
        mr.image,
        mr.created_at,
        mr.updated_at,
        u_patient.first_name AS patient_first_name, 
        u_patient.last_name AS patient_last_name, 
        u_professional.first_name AS professional_first_name, 
        u_professional.last_name AS professional_last_name, 
        a.scheduled_at 
      FROM medical_record mr
      INNER JOIN patient p ON mr.patient_id = p.id
      INNER JOIN "users" u_patient ON p.user_id = u_patient.id
      INNER JOIN professional prof ON mr.professional_id = prof.id
      INNER JOIN "users" u_professional ON prof.user_id = u_professional.id
      INNER JOIN appointment a ON mr.appointment_id = a.id
      WHERE mr.id = $1
    `,
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('MEDICAL_RECORD_NOT_FOUND')
  return rows[0]
}

// Verificar si un ID existe en la tabla correspondiente
const checkExists = async (table, id) => {
  const query = {
    text: `SELECT COUNT(*) AS count FROM ${table} WHERE id = $1`,
    values: [id],
  }
  const { rows } = await db.query(query)
  return rows[0].count > 0
}

const createMedicalRecord = async ({
  patient_id,
  professional_id,
  appointment_id,
  general_notes,
  image, // Imagen en formato Base64 o URL
}) => {
  // Verificar si el paciente existe
  const patientExists = await checkExists('patient', patient_id)
  if (!patientExists) {
    throw createError('PATIENT_NOT_FOUND')
  }

  // Verificar si el profesional existe
  const professionalExists = await checkExists('professional', professional_id)
  if (!professionalExists) {
    throw createError('PROFESSIONAL_NOT_FOUND')
  }

  // Subir imagen a Cloudinary si existe
  let imageUrl = null
  if (image) {
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'dsuocyzih',
    })
    imageUrl = uploadResponse.secure_url // URL pública de la imagen
  }
  // Crear el registro médico si las verificaciones pasaron
  const query = {
    text: `
      INSERT INTO medical_record (patient_id, professional_id, appointment_id, general_notes, image, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `,
    values: [patient_id, professional_id, appointment_id, general_notes, imageUrl],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

const updateMedicalRecord = async (id, updates) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Verificar si el registro médico existe
    const existingRecordQuery = {
      text: `SELECT image FROM medical_record WHERE id = $1`,
      values: [id],
    }
    const { rows: existingRecords } = await client.query(existingRecordQuery)
    if (!existingRecords[0]) throw createError('MEDICAL_RECORD_NOT_FOUND')
    const currentImageUrl = existingRecords[0].image

    // Procesar la actualización de la imagen
    let newImageUrl = currentImageUrl
    if (updates.image) {
      if (updates.image.startsWith('data:image')) {
        // Subir la nueva imagen a Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(updates.image, {
          folder: 'medical_records',
        })
        newImageUrl = uploadResponse.secure_url

        // Eliminar la imagen anterior de Cloudinary si existe
        if (currentImageUrl) {
          const publicId = currentImageUrl.split('/').slice(-2).join('/').split('.')[0]
          await cloudinary.uploader.destroy(publicId)
        }
      } else {
        throw createError('INVALID_IMAGE_FORMAT')
      }
    }

    // Preparar campos para actualizar
    const fields = Object.keys(updates)
      .filter((key) => key !== 'image') // Excluir 'image', ya que se maneja por separado
      .map((key, index) => `${key} = $${index + 3}`) // Ajustar índice para incluir el ID y la nueva URL
      .join(', ')

    const updateQuery = {
      text: `
        UPDATE medical_record 
        SET ${fields ? `${fields}, ` : ''}image = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      values: [
        id,
        newImageUrl,
        ...Object.values(updates).filter((_, i) => Object.keys(updates)[i] !== 'image'),
      ],
    }

    const { rows } = await client.query(updateQuery)
    await client.query('COMMIT')
    return rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al actualizar el registro médico:', error)
    throw error
  } finally {
    client.release()
  }
}

const deleteMedicalRecord = async (id) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Verificar si el registro médico existe y obtener la URL de la imagen
    const fetchRecordQuery = {
      text: `SELECT image FROM medical_record WHERE id = $1`,
      values: [id],
    }
    const { rows: existingRecords } = await client.query(fetchRecordQuery)
    if (!existingRecords[0]) throw createError('MEDICAL_RECORD_NOT_FOUND')
    const currentImageUrl = existingRecords[0].image

    // Eliminar la imagen de Cloudinary si existe
    if (currentImageUrl) {
      const publicId = currentImageUrl.split('/').slice(-2).join('/').split('.')[0]
      await cloudinary.uploader.destroy(publicId)
    }

    // Eliminar el registro médico de la base de datos
    const deleteRecordQuery = {
      text: `DELETE FROM medical_record WHERE id = $1 RETURNING id`,
      values: [id],
    }
    const { rows } = await client.query(deleteRecordQuery)
    await client.query('COMMIT')
    return rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al eliminar el registro médico:', error)
    throw error
  } finally {
    client.release()
  }
}

export const MedicalRecordModel = {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
}
