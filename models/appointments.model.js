import { db } from '../database/connection.js'

const createAppointment = async ({
  scheduled_at,
  status,
  notes,
  patient_id,
  professional_id,
  city_id,
  reason_for_visit,
  has_medical_record,
}) => {
  const query = {
    text: `INSERT INTO appointment 
           (scheduled_at, status, notes, patient_id, professional_id, city_id, reason_for_visit, has_medical_record) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING *`,
    values: [
      scheduled_at,
      status,
      notes,
      patient_id,
      professional_id,
      city_id,
      reason_for_visit,
      has_medical_record || false,
    ],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

const getAllAppointments = async () => {
  const query = {
    text: 'SELECT * FROM appointment ORDER BY scheduled_at DESC',
  }
  const { rows } = await db.query(query)
  return rows
}

const getAppointmentById = async (id) => {
  const query = {
    text: 'SELECT * FROM appointment WHERE id = $1',
    values: [id],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

const updateAppointment = async (updates) => {
  if (!Object.keys(updates).length) {
    throw new Error('No updates provided')
  }

  const fields = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ')

  const query = {
    text: `UPDATE appointment SET ${fields} WHERE id = $1 RETURNING *`,
    values: [id, ...Object.values(updates)],
  }

  const { rows } = await db.query(query)
  return rows[0]
}

const deleteAppointment = async (id) => {
  const query = {
    text: 'DELETE FROM appointment WHERE id = $1 RETURNING id',
    values: [id],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

export const AppointmentsModel = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmen,
  deleteAppointment,
}
