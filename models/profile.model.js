import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import cloudinary from '../config/cloudinary.js'

const getProfile = async (id) => {
  if (!id) throw createError('FIELDS_REQUIRED')

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
      u.avatar,
      p.id AS professional_id, 
      p.biography, 
      p.years_of_experience, 
      pt.name AS professional_type,
     COALESCE(
      JSON_AGG(CASE WHEN s.parent_id IS NULL THEN JSON_BUILD_OBJECT('id', s.id, 'name', s.name) END) FILTER (WHERE s.parent_id IS NULL),
      '[]'
    ) AS specialties,
    COALESCE(
      JSON_AGG(CASE WHEN s.parent_id IS NOT NULL THEN JSON_BUILD_OBJECT('id', s.id, 'name', s.name) END) FILTER (WHERE s.parent_id IS NOT NULL),
      '[]'
    ) AS subspecialties
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

const updateProfile = async (id, updates) => {
  const client = await db.connect()
  let hasChanges = false // Variable para rastrear si se realizó alguna actualización

  try {
    await client.query('BEGIN')

    // Verificar que el usuario exista
    const checkUser = await client.query('SELECT id FROM users WHERE id = $1', [id])
    if (checkUser.rowCount === 0) {
      throw createError('USER_NOT_FOUND')
    }

    // Actualizar avatar si está presente en userData
    if (updates.userData?.avatar) {
      const currentAvatarQuery = {
        text: `SELECT avatar FROM users WHERE id = $1`,
        values: [id],
      }
      const { rows: currentAvatarRows } = await client.query(currentAvatarQuery)
      const currentAvatar = currentAvatarRows[0]?.avatar

      if (updates.userData.avatar.startsWith('data:image')) {
        const base64Data = updates.userData.avatar.split(',')[1]
        const uploadResponse = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${base64Data}`,
          { folder: 'dsuocyzih' },
        )

        if (!uploadResponse || !uploadResponse.secure_url) {
          throw createError('AVATAR_UPLOAD_FAILED')
        }

        const newAvatarUrl = uploadResponse.secure_url

        const avatarUpdateQuery = {
          text: `UPDATE users SET avatar = $2, updated_at = NOW() WHERE id = $1`,
          values: [id, newAvatarUrl],
        }
        const avatarUpdateResult = await client.query(avatarUpdateQuery)
        if (avatarUpdateResult.rowCount > 0) hasChanges = true

        // Eliminar avatar anterior
        if (currentAvatar) {
          const publicId = currentAvatar.split('/').slice(-2).join('/').split('.')[0]
          await cloudinary.uploader.destroy(publicId)
        }
      } else {
        throw createError('INVALID_AVATAR_FORMAT')
      }
    }

    // Actualizar otros datos personales
    if (updates.userData) {
      const userData = { ...updates.userData }
      delete userData.avatar

      if (Object.keys(userData).length > 0) {
        const personalFields = Object.keys(userData)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ')

        const personalQuery = {
          text: `UPDATE users SET ${personalFields}, updated_at = NOW() WHERE id = $1`,
          values: [id, ...Object.values(userData)],
        }

        const resultUser = await client.query(personalQuery)
        if (resultUser.rowCount > 0) hasChanges = true
      }
    }

    // Actualizar datos profesionales (incluyendo specialties)
    if (updates.professionalData) {
      const { rows: professionalRows } = await client.query(
        'SELECT id FROM professional WHERE user_id = $1',
        [id],
      )
      if (professionalRows.length === 0) {
        throw createError('PROFESSIONAL_NOT_FOUND')
      }
      const professionalId = professionalRows[0].id

      // Actualizar datos profesionales (excepto specialties)
      const professionalFields = Object.keys(updates.professionalData)
        .filter((key) => key !== 'specialties')
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ')

      if (professionalFields) {
        const professionalValues = Object.entries(updates.professionalData)
          .filter(([key]) => key !== 'specialties')
          .map(([, value]) => value)

        const professionalQuery = {
          text: `UPDATE professional SET ${professionalFields}, updated_at = NOW() WHERE user_id = $1`,
          values: [id, ...professionalValues],
        }
        const resultProfessional = await client.query(professionalQuery)
        if (resultProfessional.rowCount > 0) hasChanges = true
      }

      // Actualizar specialties
      if (Array.isArray(updates.professionalData.specialties)) {
        const specialties = updates.professionalData.specialties

        // Limpiamos y volvemos a insertar.
        // Esto se considera un cambio, por eso actualizamos `hasChanges`.
        await client.query({
          text: `DELETE FROM professional_specialty WHERE professional_id = $1`,
          values: [professionalId],
        })
        hasChanges = true

        if (specialties.length > 0) {
          for (const specialtyId of specialties) {
            await client.query({
              text: `INSERT INTO professional_specialty (professional_id, specialty_id) VALUES ($1, $2)`,
              values: [professionalId, specialtyId],
            })
          }
        }
      }
    }

    // Si no hubo cambios, hacemos un ROLLBACK y retornamos false.
    if (!hasChanges) {
      await client.query('ROLLBACK')
      return false
    }

    await client.query('COMMIT')
    return true // Si hubo cambios, retornamos true
  } catch (error) {
    await client.query('ROLLBACK')
    throw createError('INTERNAL_SERVER_ERROR')
  } finally {
    client.release()
  }
}

// Función que solo obtiene usuario con password
const getUserByIdWithPassword = async (id) => {
  const query = {
    text: 'SELECT id, email, password FROM users WHERE id = $1',
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError(404, 'USER_NOT_FOUND')
  return rows[0]
}

// Función que actualiza la contraseña en la base de datos (sin lógica extra)
const updatePasswordInDb = async (id, hashedPassword) => {
  const query = {
    text: 'UPDATE users SET password = $2 WHERE id = $1 RETURNING id, email',
    values: [id, hashedPassword],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError(500, 'INTERNAL_SERVER_ERROR')
  return rows[0]
}

// Función principal que valida y actualiza contraseña
const changePassword = async (id, { currentPassword, newPassword, confirmPassword }) => {
  if (newPassword !== confirmPassword) {
    throw createError('PASSWORDS_DO_NOT_MATCH')
  }

  const user = await getUserByIdWithPassword(id)

  const isMatch = await comparePassword(currentPassword, user.password)
  if (!isMatch) {
    throw createError('INVALID_PASSWORD')
  }

  const hashedNewPassword = await hashPassword(newPassword)

  // Aquí llamamos la función que actualiza en DB
  const updatedUser = await updatePasswordInDb(id, hashedNewPassword)

  return updatedUser
}

export const ProfileModel = {
  getProfile,
  updateProfile,
  changePassword,
  getUserByIdWithPassword,
}
