import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import cloudinary from '../config/cloudinary.js'

const PATIENT_FIELDS = `id, user_id, medical_data, created_at, updated_at`

export const PatientModel = {
  async createPatientWithUser({ user, medical_data, hashedPassword }) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      let avatarUrl = null
      if (user.avatar) {
        // Verifica que el avatar exista

        const uploadResponse = await cloudinary.uploader.upload(user.avatar, {
          folder: 'dsuocyzih',
        })
        avatarUrl = uploadResponse.secure_url
      }
      // Validaciones
      if (!user.first_name || !user.last_name || !user.email) {
        throw createError('MISSING_REQUIRED_FIELDS')
      }

      const userValues = [
        user.first_name,
        user.last_name,
        user.email,
        hashedPassword,
        user.address || null,
        user.phone || null,
        user.birth_date || null,
        user.gender || null,
        user.role_id || null,
        user.status || 'active',
        avatarUrl,
      ]
      const userInsert = `
      INSERT INTO "users" (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status, avatar, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11, NOW(), NOW())
      RETURNING id, first_name, last_name, email, status
    `
      const { rows: userRows } = await client.query(userInsert, userValues)
      const newUser = userRows[0]

      const patientInsert = `
      INSERT INTO patient (user_id, medical_data, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, user_id, medical_data
    `
      const { rows: patientRows } = await client.query(patientInsert, [
        newUser.id,
        medical_data || null,
      ])
      const newPatient = patientRows[0]

      await client.query('COMMIT')

      // Retornar solo los datos necesarios
      return {
        user: {
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          status: newUser.status,
          avatar: newUser.avatarUrl,
        },
        patient: {
          id: newPatient.id,
          user_id: newPatient.user_id,
          medical_data: newPatient.medical_data,
        },
      }
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
      const PATIENTS_FIELDS = `
      a.id,
      a.medical_data,
      a.created_at,
      a.updated_at,
      b.first_name,
      b.last_name,
      b.avatar,
      b.email,
      b.status,
      b.address,
      b.birth_date,
      b.phone
    `
      const query = `
      SELECT ${PATIENTS_FIELDS}
      FROM patient a
      INNER JOIN users b ON a.user_id = b.id
    `

      const { rows } = await db.query(query)
      return rows
    } catch (error) {
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },
  async getPatientById(id) {
    try {
      if (!id) throw createError('INVALID_ID')
      const { rows } = await db.query(
        `
      SELECT 
        b.first_name, 
        b.last_name, 
        b.email, 
        b.phone, 
        b.status, 
        b.birth_date, 
        b.address,
        b.gender,
        a.id,
        a.user_id, 
        a.medical_data, 
        a.created_at, 
        a.updated_at 
      FROM 
        patient a 
      INNER JOIN 
        users b 
      ON 
        b.id = a.user_id 
      WHERE 
        a.id = $1
      `,
        [id],
      )
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      return rows[0]
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async updatePatientAndUser(patientId, updates) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const { medical_data, ...userUpdates } = updates
      let updatedPatient = null,
        updatedUser = null

      if (medical_data) {
        const { rows } = await client.query(
          `UPDATE patient SET medical_data = $1, updated_at = NOW() WHERE id = $2 RETURNING ${PATIENT_FIELDS}`,
          [medical_data, patientId],
        )
        updatedPatient = rows[0]
      }

      if (Object.keys(userUpdates).length > 0) {
        const { rows } = await client.query('SELECT user_id FROM patient WHERE id = $1', [
          patientId,
        ])
        if (!rows[0]) throw createError('RECORD_NOT_FOUND')
        const userId = rows[0].user_id

        const fields = Object.keys(userUpdates)
          .map((key, idx) => `${key} = $${idx + 1}`)
          .join(', ')
        const values = [...Object.values(userUpdates), userId]
        const { rows: userRows } = await client.query(
          `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${Object.keys(userUpdates).length + 1} RETURNING id, first_name, last_name, email, status`,
          values,
        )
        updatedUser = userRows[0]
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

      const { rows } = await client.query('SELECT user_id FROM patient WHERE id = $1', [patientId])
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      const userId = rows[0].user_id

      await client.query('DELETE FROM patient WHERE id = $1', [patientId])
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

  async changeStatus(patientId, newStatus) {
    // Validar si el nuevo estado es permitido
    const validStatuses = ['Active', 'Inactive']
    if (!validStatuses.includes(newStatus)) {
      throw createError('INVALID_STATUS')
    }

    // Paso 1: Buscar el user_id usando el professionalId
    const findPatientQuery = {
      text: `
      SELECT user_id 
      FROM patient 
      WHERE id = $1
    `,
      values: [patientId],
    }

    const patientResult = await db.query(findPatientQuery)

    // Verificar si se encontró el profesional
    if (patientResult.rows.length === 0) {
      throw createError('USER_NOT_FOUND')
    }

    const userId = patientResult.rows[0].user_id

    // Paso 2: Actualizar el estado en la tabla users usando el user_id
    const updateUserQuery = {
      text: `
      UPDATE users 
      SET status = $2, updated_at = NOW() 
      WHERE id = $1 
      RETURNING id, status
    `,
      values: [userId, newStatus],
    }

    const userResult = await db.query(updateUserQuery)

    // Verificar si se actualizó el usuario
    if (userResult.rows.length === 0) {
      throw createError('USER_NOT_FOUND')
    }

    // Retornar el resultado de la actualización
    return userResult.rows[0]
  },
}
