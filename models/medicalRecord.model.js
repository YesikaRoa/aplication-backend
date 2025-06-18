import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

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

  // Crear el registro médico si las verificaciones pasaron
  const query = {
    text: `
      INSERT INTO medical_record (patient_id, professional_id, appointment_id, general_notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `,
    values: [patient_id, professional_id, appointment_id, general_notes],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

const updateMedicalRecord = async (id, updates) => {
  const fields = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ')

  const query = {
    text: `
      UPDATE medical_record 
      SET ${fields}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `,
    values: [id, ...Object.values(updates)],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('MEDICAL_RECORD_NOT_FOUND')
  return rows[0]
}

const deleteMedicalRecord = async (id) => {
  const query = {
    text: `
      DELETE FROM medical_record 
      WHERE id = $1 
      RETURNING id
    `,
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('MEDICAL_RECORD_NOT_FOUND')
  return rows[0]
}

export const MedicalRecordModel = {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
}
