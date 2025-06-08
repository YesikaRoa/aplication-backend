import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

// Obtener el perfil completo (personal y profesional)
const getProfile = async (id) => {
  const query = `
    SELECT 
    u.id AS user_id, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.address, 
    u.phone, 
    u.birth_date, 
    u.gender, 
    p.id AS professional_id, 
    p.biography, 
    p.years_of_experience, 
    pt.name AS professional_type,
    COALESCE(
      ARRAY_AGG(DISTINCT CASE WHEN s.parent_id IS NULL THEN s.name END) FILTER (WHERE s.parent_id IS NULL),
      '{}'
    ) AS main_specialties,
    COALESCE(
      ARRAY_AGG(DISTINCT CASE WHEN s.parent_id IS NOT NULL THEN s.name END) FILTER (WHERE s.parent_id IS NOT NULL),
      '{}'
    ) AS sub_specialties
  FROM users u
  LEFT JOIN professional p ON p.user_id = u.id
  LEFT JOIN professional_specialty ps ON ps.professional_id = p.id
  LEFT JOIN specialty s ON s.id = ps.specialty_id
  LEFT JOIN professional_type pt ON pt.id = p.professional_type_id
  WHERE u.id = $1
  GROUP BY u.id, p.id, pt.name;
  `
  const { rows } = await db.query(query, [id])
  if (!rows[0]) throw createError('PROFILE_NOT_FOUND')
  return rows[0]
}

// Actualizar información personal y profesional
const updateProfile = async (id, updates) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    let userRowsAffected = 0
    let professionalRowsAffected = 0

    // Actualizar información personal
    if (updates.userData) {
      const personalFields = Object.keys(updates.userData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ')

      const personalQuery = {
        text: `UPDATE users SET ${personalFields}${personalFields ? ', ' : ''}updated_at = NOW() WHERE id = $1`,
        values: [id, ...Object.values(updates.userData)],
      }

      const resultUser = await client.query(personalQuery)
      userRowsAffected = resultUser.rowCount
    }

    // Actualizar información profesional
    if (updates.professionalData) {
      const professionalFields = Object.keys(updates.professionalData)
        .filter((key) => key !== 'specialties')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(',')

      if (professionalFields) {
        const professionalQuery = {
          text: `UPDATE professional SET ${professionalFields}${professionalFields ? ', ' : ''}updated_at = NOW() WHERE user_id = $1`,
          values: [
            id,
            ...Object.values(updates.professionalData).filter((value) => typeof value !== 'object'),
          ],
        }

        const resultProfessional = await client.query(professionalQuery)
        professionalRowsAffected = resultProfessional.rowCount
      }

      // Manejo de especialidades (specialties)
      if (updates.professionalData && Array.isArray(updates.professionalData.specialties)) {
        const specialties = updates.professionalData.specialties

        const currentSpecialtiesQuery = {
          text: `SELECT specialty_id FROM professional_specialty WHERE professional_id = (SELECT id FROM professional WHERE user_id = $1)`,
          values: [id],
        }
        const { rows: currentSpecialties } = await client.query(currentSpecialtiesQuery)
        const currentIds = currentSpecialties.map((row) => row.specialty_id)

        const newSpecialties = specialties.filter((s) => !currentIds.includes(s))
        const removedSpecialties = currentIds.filter((s) => !specialties.includes(s))

        if (newSpecialties.length > 0) {
          const insertSpecialtiesQuery = {
            text: `
              INSERT INTO professional_specialty (professional_id, specialty_id)
              SELECT id, unnest($2::int[]) FROM professional WHERE user_id = $1
            `,
            values: [id, newSpecialties],
          }
          await client.query(insertSpecialtiesQuery)
        }

        if (removedSpecialties.length > 0) {
          const deleteSpecialtiesQuery = {
            text: `
              DELETE FROM professional_specialty
              WHERE professional_id = (SELECT id FROM professional WHERE user_id = $1)
                AND specialty_id = ANY($2::int[])
            `,
            values: [id, removedSpecialties],
          }
          await client.query(deleteSpecialtiesQuery)
        }
      }
    }

    await client.query('COMMIT')

    // Devuelve verdadero solo si al menos una tabla fue afectada
    if (userRowsAffected === 0 && professionalRowsAffected === 0) {
      throw createError('USER_NOT_FOUND')
    }
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const getUserByIdWithPassword = async (id) => {
  const query = {
    text: 'SELECT id, email, password FROM users WHERE id = $1',
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('USER_NOT_FOUND')
  return rows[0]
}

// Actualizar password
const changePassword = async (id, newPassword) => {
  const query = {
    text: `UPDATE users SET password = $2 WHERE id = $1 RETURNING id, email`,
    values: [id, newPassword],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('INTERNAL_SERVER_ERROR')
  return rows[0]
}

export const ProfileModel = {
  getProfile,
  updateProfile,
  changePassword,
  getUserByIdWithPassword,
}
