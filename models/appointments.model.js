import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

const createAppointmentModel = async ({
  scheduled_at,
  status,
  notes,
  patient_id,
  professional_id,
  city_id,
  reason_for_visit,
  has_medical_record,
  user,
}) => {
  let professionalIdToUse = professional_id

  if (user?.role === 3) {
    const result = await db.query('SELECT id FROM professional WHERE user_id = $1', [user.id])
    if (!result.rows.length) {
      throw createError('PROFESSIONAL_NOT_FOUND_FOR_USER')
    }
    professionalIdToUse = result.rows[0].id
  }

  // Validar que el profesional exista (según el id final)
  const professionalExists = await db.query(
    `SELECT p.id, u.role_id 
   FROM professional p
   JOIN "users" u ON u.id = p.user_id
   WHERE p.id = $1`,
    [professionalIdToUse],
  )

  if (!professionalExists.rows.length) {
    throw createError('INVALID_PROFESSIONAL_ID')
  }

  if (professionalExists.rows[0].role_id === 1) {
    throw createError('INVALID_PROFESSIONAL_ROLE')
  }

  // Verificar si el patient existe antes de intentar la inserción
  const patientExists = await db.query('SELECT id FROM patient WHERE id = $1', [patient_id])

  if (!patientExists.rows.length) {
    throw createError('INVALID_PATIENT_ID')
  }
  // Verificar si la city existe antes de intentar la inserción
  const cityExists = await db.query('SELECT id FROM city WHERE id = $1', [city_id])

  if (!cityExists.rows.length) {
    throw createError('INVALID_CITY_ID')
  }
  // Proceder con la inserción después de validar
  const query = {
    text: `INSERT INTO appointment 
           (scheduled_at, status, notes, patient_id, professional_id, city_id, reason_for_visit, has_medical_record) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING *, (
            SELECT user_id 
            FROM professional 
            WHERE id = professional_id
          ) AS professional_user_id `,
    values: [
      scheduled_at,
      status,
      notes,
      patient_id,
      professionalIdToUse,
      city_id,
      reason_for_visit,
      has_medical_record || false,
    ],
  }

  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('INTERNAL_SERVER_ERROR')

  return rows[0]
}

const getAllAppointments = async (userId, roleId) => {
  let query = {
    text: `
      SELECT 
        a.id,
        a.scheduled_at,
        a.status,
        a.notes,
        a.patient_id,
        (u1.first_name || ' ' || u1.last_name) AS patient_full_name,
        a.professional_id,
        (u2.first_name || ' ' || u2.last_name) AS professional_full_name,
        a.has_medical_record,
        a.city_id,
        c.name,
        a.reason_for_visit,
        a.created_at,
        a.updated_at
      FROM appointment a
      LEFT JOIN patient p ON a.patient_id = p.id
      LEFT JOIN users u1 ON p.user_id = u1.id
      LEFT JOIN professional pr ON a.professional_id = pr.id
      LEFT JOIN users u2 ON pr.user_id = u2.id
      LEFT JOIN city c ON c.id = a.city_id
    `,
    values: [],
  }

  // Si el usuario es profesional (rol 3), filtra por su user_id
  if (roleId === 3) {
    query.text += ' WHERE pr.user_id = $1'
    query.values.push(userId)
  }

  query.text += ' ORDER BY a.created_at DESC'

  const { rows } = await db.query(query)
  return rows
}

const getAppointmentById = async (id) => {
  const query = {
    text: `
      SELECT 
        a.id,
        a.scheduled_at,
        a.status,
        a.notes,
        a.reason_for_visit,
        a.has_medical_record,
        a.created_at,
        a.updated_at,
        c.name AS city_name,
        c.id AS city_id,
        pu.first_name || ' ' || pu.last_name AS patient_full_name,
        pru.first_name || ' ' || pru.last_name AS professional_full_name
      FROM appointment a
      INNER JOIN city c ON a.city_id = c.id
      INNER JOIN patient p ON a.patient_id = p.id
      INNER JOIN users pu ON p.user_id = pu.id
      INNER JOIN professional pr ON a.professional_id = pr.id
      INNER JOIN users pru ON pr.user_id = pru.id
      WHERE a.id = $1
    `,
    values: [id],
  }

  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('RECORD_NOT_FOUND')
  return rows[0]
}

const updateAppointment = async (id, updates) => {
  if (!Object.keys(updates).length) {
    throw createError('NO_UPDATES_PROVIDED')
  }

  const fields = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ')

  const query = {
    text: `
    UPDATE appointment a
    SET ${fields}${fields ? ', ' : ''}updated_at = NOW()
    WHERE a.id = $1
    RETURNING
      a.*,
      (
        SELECT p.user_id
        FROM professional p
        WHERE p.id = a.professional_id
      ) AS professional_user_id
  `,
    values: [id, ...Object.values(updates)],
  }

  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('RECORD_NOT_FOUND')
  return rows[0]
}

const deleteAppointment = async (id) => {
  try {
    // Primero, elimina el registro relacionado en medical_record
    const deleteMedicalRecordQuery = {
      text: 'DELETE FROM medical_record WHERE appointment_id = $1',
      values: [id],
    }
    await db.query(deleteMedicalRecordQuery)

    // Luego, elimina el registro de appointment
    const deleteAppointmentQuery = {
      text: 'DELETE FROM appointment WHERE id = $1 RETURNING *',
      values: [id],
    }
    const { rows } = await db.query(deleteAppointmentQuery)

    if (!rows[0]) throw createError('RECORD_NOT_FOUND')

    return rows[0]
  } catch (error) {
    throw createError(`Error deleting appointment: ${error.message}`)
  }
}

const getCities = async (search = '', limit = 5) => {
  const query = `
    SELECT 
      city.id,
      city.name,
      state.name AS state_name
    FROM 
      city
    LEFT JOIN 
      state ON city.state_id = state.id
    WHERE 
      city.name ILIKE $1
    LIMIT $2
  `
  const { rows } = await db.query(query, [`%${search}%`, parseInt(limit)])
  return rows
}

const getPatients = async (search = '', limit = 5, userId, roleId) => {
  let params = []
  let where = []

  let query = `
    SELECT DISTINCT 
      p.id,
      u.first_name,
      u.last_name
    FROM patient p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN appointment a ON a.patient_id = p.id
    LEFT JOIN professional pr ON pr.id = a.professional_id
  `

  if (roleId === 3) {
    // PROFESSIONAL
    where.push(`
      (
        p.created_by = $1         -- creados por el profesional
        OR pr.user_id = $1        -- citas asociadas al profesional
      )
    `)
    params.push(userId)

    // filtro de búsqueda
    where.push(`(u.first_name ILIKE $2 OR u.last_name ILIKE $2)`)
    params.push(`%${search}%`)

    query += ` WHERE ${where.join(' AND ')} LIMIT $3`
    params.push(parseInt(limit))
  } else if (roleId === 1) {
    // ADMIN ve todos los pacientes
    where.push(`(u.first_name ILIKE $1 OR u.last_name ILIKE $1)`)
    query += ` WHERE ${where.join(' AND ')} LIMIT $2`
    params.push(`%${search}%`, parseInt(limit))
  }

  const { rows } = await db.query(query, params)
  return rows
}

const getProfessionals = async (search = '', limit = 5) => {
  const query = `
    SELECT 
      professional.id,
      users.first_name,
      users.last_name,
      professional_type.name AS professional_type
    FROM 
      professional
    JOIN 
      users ON professional.user_id = users.id
    LEFT JOIN 
      professional_type ON professional.professional_type_id = professional_type.id
    WHERE 
      users.first_name ILIKE $1 OR users.last_name ILIKE $1
    LIMIT $2
  `
  const { rows } = await db.query(query, [`%${search}%`, parseInt(limit)])
  return rows
}

export const AppointmentsModel = {
  createAppointmentModel,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getCities,
  getPatients,
  getProfessionals,
}
