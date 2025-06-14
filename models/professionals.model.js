import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import { hashPassword } from '../utils/password.js'
const PROFESSIONAL_FIELDS = `
  id,
  user_id,
  professional_type_id,
  biography,
  years_of_experience,
  created_at
`

export const ProfessionalModel = {
  async createProfessionalWithUser({ user, professional, specialties }) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Hashear el password del usuario
      const hashedPassword = await hashPassword(user.password)
      const userValues = [
        user.first_name,
        user.last_name,
        user.email,
        hashedPassword, // Usar el password hasheado
        user.address,
        user.phone,
        user.birth_date,
        user.gender,
        user.role_id,
        user.status,
      ]

      // Insertar usuario
      const userInsert = `
      INSERT INTO "users" 
      (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      RETURNING id, first_name, last_name, email, status
    `
      const { rows: userRows } = await client.query(userInsert, userValues)
      const newUser = userRows[0]

      // Insertar professional
      const professionalInsert = `
      INSERT INTO professional (user_id, professional_type_id, biography, years_of_experience, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING ${PROFESSIONAL_FIELDS}
    `
      const { rows: professionalRows } = await client.query(professionalInsert, [
        newUser.id,
        professional.professional_type_id,
        professional.biography,
        professional.years_of_experience,
      ])
      const newProfessional = professionalRows[0]

      // Insertar specialties
      let specialtiesResult = []
      if (Array.isArray(specialties) && specialties.length > 0) {
        const insertSpecialty = `
        INSERT INTO professional_specialty (specialty_id, professional_id)
        VALUES ($1, $2)
        RETURNING id, specialty_id, professional_id
      `
        for (const specialty_id of specialties) {
          const { rows } = await client.query(insertSpecialty, [specialty_id, newProfessional.id])
          specialtiesResult.push(rows[0])
        }
      }

      // Separar specialties y subspecialties por rango de ID
      const specialtiesIds = specialties.filter((id) => id >= 1 && id <= 15)
      const subspecialtiesIds = specialties.filter((id) => id >= 16 && id <= 60)

      await client.query('COMMIT')
      return {
        user: newUser,
        professional: newProfessional,
        specialties: specialtiesIds,
        subspecialties: subspecialtiesIds,
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

  async getAllProfessionals() {
    try {
      const { rows } = await db.query(`SELECT ${PROFESSIONAL_FIELDS} FROM professional`)
      return rows
    } catch (error) {
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async getProfessionalById(id) {
    try {
      const query = `
        SELECT 
          p.id AS professional_id,
          p.user_id,
          p.professional_type_id,
          p.biography,
          p.years_of_experience,
          u.first_name,
          u.last_name,
          u.email,
          u.address,
          u.phone,
          u.birth_date,
          u.gender,
          pt.name AS professional_type,
          COALESCE(
            ARRAY_AGG(DISTINCT CASE WHEN s.id BETWEEN 1 AND 15 THEN s.name END) FILTER (WHERE s.id BETWEEN 1 AND 15),
            '{}'
          ) AS specialties,
          COALESCE(
            ARRAY_AGG(DISTINCT CASE WHEN s.id BETWEEN 16 AND 60 THEN s.name END) FILTER (WHERE s.id BETWEEN 16 AND 60),
            '{}'
          ) AS subspecialties
        FROM professional p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN professional_type pt ON pt.id = p.professional_type_id
        LEFT JOIN professional_specialty ps ON ps.professional_id = p.id
        LEFT JOIN specialty s ON s.id = ps.specialty_id
        WHERE p.id = $1
        GROUP BY p.id, u.id, pt.name
      `
      const { rows } = await db.query(query, [id])
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      return rows[0]
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async updateProfessionalAndUser(
    professionalId,
    professionalUpdates = {},
    userUpdates = {},
    specialties = [],
  ) {
    // Validaciones iniciales
    if (!professionalId) throw createError('INVALID_PROFESSIONAL_ID')
    if (typeof professionalUpdates !== 'object' || Array.isArray(professionalUpdates)) {
      throw createError('FIELDS_REQUIRED')
    }
    if (typeof userUpdates !== 'object' || Array.isArray(userUpdates)) {
      throw createError('FIELDS_REQUIRED')
    }
    if (!Array.isArray(specialties)) {
      throw createError('FIELDS_REQUIRED')
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Actualizar tabla professional si hay datos
      let updatedProfessional = null
      if (Object.keys(professionalUpdates).length > 0) {
        const fields = []
        const values = []
        let idx = 1
        for (const key in professionalUpdates) {
          fields.push(`${key} = $${idx}`)
          values.push(professionalUpdates[key])
          idx++
        }
        values.push(professionalId)
        const { rows } = await client.query(
          `UPDATE professional SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, biography, created_at`,
          values,
        )
        updatedProfessional = rows[0]
      }

      // Validar existencia del professional antes de actualizar user
      let updatedUser = null
      if (Object.keys(userUpdates).length > 0) {
        const { rows } = await client.query('SELECT user_id FROM professional WHERE id = $1', [
          professionalId,
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
      }

      // Actualizar specialties si se envía el array
      let specialtiesResult = []
      if (specialties.length > 0) {
        await client.query('DELETE FROM professional_specialty WHERE professional_id = $1', [
          professionalId,
        ])
        const insertSpecialty = `
        INSERT INTO professional_specialty (specialty_id, professional_id)
        VALUES ($1, $2)
        RETURNING id, specialty_id, professional_id
      `
        for (const specialty_id of specialties) {
          const { rows } = await client.query(insertSpecialty, [specialty_id, professionalId])
          specialtiesResult.push(rows[0])
        }
      }

      await client.query('COMMIT')

      // Obtener datos actuales si no hubo actualizaciones
      if (!updatedProfessional) {
        const { rows } = await client.query(
          'SELECT id, biography, created_at FROM professional WHERE id = $1',
          [professionalId],
        )
        updatedProfessional = rows[0]
      }

      if (specialties.length === 0) {
        const { rows } = await client.query(
          'SELECT specialty_id FROM professional_specialty WHERE professional_id = $1',
          [professionalId],
        )
        specialtiesResult = rows.map((row) => row.specialty_id)
      }

      return {
        professional: updatedProfessional,
        user: updatedUser,
        specialties: specialtiesResult,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      // Si el error ya tiene un status y un nombre, propáralo directamente
      if (error.status && error.name) throw error

      throw createError('INTERNAL_SERVER_ERROR')
    } finally {
      client.release()
    }
  },

  async deleteProfessionalAndUser(professionalId) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      // Obtener user_id
      const { rows } = await client.query('SELECT user_id FROM professional WHERE id = $1', [
        professionalId,
      ])
      if (!rows[0]) throw createError('RECORD_NOT_FOUND')
      const userId = rows[0].user_id

      // Eliminar specialties
      await client.query('DELETE FROM professional_specialty WHERE professional_id = $1', [
        professionalId,
      ])
      // Eliminar professional
      await client.query('DELETE FROM professional WHERE id = $1', [professionalId])
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
