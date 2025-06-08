import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

const PATIENT_FIELDS = `
  id,
  user_id,
  medical_data,
  created_at,
  updated_at
`

const USER_FIELDS = `
  id,
  first_name,
  last_name,
  email,
  password,
  address,
  phone,
  birth_date,
  gender,
  role_id,
  status,
  created_at,
  updated_at
`

export const PatientModel = {
  async createPatientWithUser({ user, medical_data }) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const userValues = [
        user.first_name,
        user.last_name,
        user.email,
        user.password,
        user.address,
        user.phone,
        user.birth_date,
        user.gender,
        user.role_id,
        user.status,
      ]
      const userInsert = `
        INSERT INTO "users" 
        (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
        RETURNING ${USER_FIELDS}
      `
      const { rows: userRows } = await client.query(userInsert, userValues)
      const newUser = userRows[0]

      const patientInsert = `
        INSERT INTO patient (user_id, medical_data, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING ${PATIENT_FIELDS}
      `
      const { rows: patientRows } = await client.query(patientInsert, [newUser.id, medical_data])
      const newPatient = patientRows[0]

      await client.query('COMMIT')
      return { user: newUser, patient: newPatient }
    } catch (error) {
      await client.query('ROLLBACK')
      if (error.code === '23505') {
        throw createError('EMAIL_IN_USE')
      }
      throw createError('INTERNAL_SERVER_ERROR')
    } finally {
      client.release()
    }
  },

  async getAllPatients() {
    try {
      const { rows } = await db.query(`SELECT ${PATIENT_FIELDS} FROM patient`)
      return rows
    } catch (error) {
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async getPatientById(id) {
    try {
      const { rows } = await db.query(`SELECT ${PATIENT_FIELDS} FROM patient WHERE id = $1`, [id])
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      return rows[0]
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async updatePatientAndUser(patientId, patientUpdates, userUpdates) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Actualizar tabla patient si hay datos
      let updatedPatient = null
      if (Object.keys(patientUpdates).length > 0) {
        const fields = []
        const values = []
        let idx = 1
        for (const key in patientUpdates) {
          fields.push(`${key} = $${idx}`)
          values.push(patientUpdates[key])
          idx++
        }
        values.push(patientId)
        const { rows } = await client.query(
          `UPDATE patient SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING ${PATIENT_FIELDS}`,
          values,
        )
        updatedPatient = rows[0]
      }

      // Actualizar tabla users si hay datos
      let updatedUser = null
      if (Object.keys(userUpdates).length > 0) {
        // Obtener user_id desde patient
        const { rows } = await client.query('SELECT user_id FROM patient WHERE id = $1', [
          patientId,
        ])
        if (!rows[0]) throw createError('RECORD_NOT_FOUND')
        const userId = rows[0].user_id

        const userFields = []
        const userValues = []
        let idx = 1
        for (const key in userUpdates) {
          userFields.push(`${key} = $${idx}`)
          userValues.push(userUpdates[key])
          idx++
        }
        userValues.push(userId)
        const { rows: userRows } = await client.query(
          `UPDATE users SET ${userFields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, first_name, last_name, email, status`,
          userValues,
        )
        updatedUser = userRows[0]

        // Si no hubo cambios, obtener el usuario igualmente
        if (!updatedUser) {
          const { rows: userRows2 } = await client.query(
            'SELECT id, first_name, last_name, email, status FROM users WHERE id = $1',
            [userId],
          )
          updatedUser = userRows2[0]
        }
      }

      await client.query('COMMIT')
      if (!updatedPatient && !updatedUser) throw createError('NO_UPDATES_PROVIDED')
      return { patient: updatedPatient, user: updatedUser }
    } catch (error) {
      await client.query('ROLLBACK')
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    } finally {
      client.release()
    }
  },

  async deletePatientAndUser(patientId) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      // Obtener user_id
      const { rows } = await client.query('SELECT user_id FROM patient WHERE id = $1', [patientId])
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      const userId = rows[0].user_id

      // Eliminar patient
      await client.query('DELETE FROM patient WHERE id = $1', [patientId])
      // Eliminar user
      await client.query('DELETE FROM users WHERE id = $1', [userId])

      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    } finally {
      client.release()
    }
  },
}
