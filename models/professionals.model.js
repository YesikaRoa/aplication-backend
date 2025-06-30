import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import { hashPassword } from '../utils/password.js'
import cloudinary from '../config/cloudinary.js'

export const ProfessionalModel = {
  async createProfessionalWithUser({ user, professional, specialties }) {
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

      // Hashear el password del usuario

      const hashedPassword = await hashPassword(user.password)

      const userValues = [
        user.first_name,
        user.last_name,
        user.email,
        hashedPassword,
        user.address,
        user.phone,
        user.birth_date,
        user.gender,
        user.role_id,
        user.status,
        avatarUrl,
      ]

      // Insertar usuario
      const userInsert = `
      INSERT INTO "users" 
      (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status, avatar, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11,NOW(),NOW())
      RETURNING id, first_name, last_name, email, status
    `
      const { rows: userRows } = await client.query(userInsert, userValues)
      const newUser = userRows[0]

      // Insertar professional
      const professionalInsert = `
      INSERT INTO professional (user_id, professional_type_id, biography, years_of_experience, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, user_id, professional_type_id, biography, years_of_experience, created_at
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
      const PROFESSIONAL_FIELDS = `
      professional.id AS professional_id,
      professional.user_id,
      professional.professional_type_id,
      professional.biography,
      professional.years_of_experience,
      professional.created_at,
      users.first_name,
      users.last_name,
      users.avatar,
      users.email,
      users.status,
      users.address,
      users.birth_date,
      users.phone
    `

      const query = `
      SELECT ${PROFESSIONAL_FIELDS}
      FROM professional
      INNER JOIN users ON professional.user_id = users.id
    `

      const { rows } = await db.query(query)
      return rows
    } catch (error) {
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async getProfessionalById(id) {
    try {
      const query = `
        SELECT 
          p.id,
          p.user_id,
          p.professional_type_id,
          p.biography,
          p.years_of_experience,
          p.created_at,
          p.updated_at,
          u.first_name,
          u.last_name,
          u.email,
          u.address,
          u.phone,
          u.birth_date,
          u.gender,
          u.status,
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

  async changeStatus(professionalId, newStatus) {
    // Validar si el nuevo estado es permitido
    const validStatuses = ['Active', 'Inactive']
    if (!validStatuses.includes(newStatus)) {
      throw createError('INVALID_STATUS')
    }

    // Paso 1: Buscar el user_id usando el professionalId
    const findProfessionalQuery = {
      text: `
      SELECT user_id 
      FROM professional 
      WHERE id = $1
    `,
      values: [professionalId],
    }

    const professionalResult = await db.query(findProfessionalQuery)

    // Verificar si se encontró el profesional
    if (professionalResult.rows.length === 0) {
      throw createError('USER_NOT_FOUND')
    }

    const userId = professionalResult.rows[0].user_id

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
