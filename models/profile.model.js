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

const updateProfile = async (id, updates) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    let userRowsAffected = 0

    // Actualizar avatar si está presente en userData
    if (updates.userData?.avatar) {
      // Obtener el avatar actual
      const currentAvatarQuery = {
        text: `SELECT avatar FROM users WHERE id = $1`,
        values: [id],
      }
      const { rows: currentAvatarRows } = await client.query(currentAvatarQuery)
      const currentAvatar = currentAvatarRows[0]?.avatar

      // Subir el nuevo avatar a Cloudinary
      if (updates.userData.avatar.startsWith('data:image')) {
        const base64Data = updates.userData.avatar.split(',')[1] // Extraer contenido Base64
        const uploadResponse = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${base64Data}`,
          { folder: 'dsuocyzih' },
        )

        if (!uploadResponse || !uploadResponse.secure_url) {
          throw createError('AVATAR_UPLOAD_FAILED')
        }

        const newAvatarUrl = uploadResponse.secure_url

        // Actualizar avatar en la base de datos
        const avatarUpdateQuery = {
          text: `UPDATE users SET avatar = $2, updated_at = NOW() WHERE id = $1`,
          values: [id, newAvatarUrl], // Guardar solo la URL
        }
        await client.query(avatarUpdateQuery)

        userRowsAffected++

        // Eliminar el avatar anterior de Cloudinary si existe
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
      delete userData.avatar // Remover avatar para evitar conflicto en los campos

      if (Object.keys(userData).length > 0) {
        const personalFields = Object.keys(userData)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ')

        const personalQuery = {
          text: `UPDATE users SET ${personalFields}, updated_at = NOW() WHERE id = $1`,
          values: [id, ...Object.values(userData)],
        }

        const resultUser = await client.query(personalQuery)
        userRowsAffected += resultUser.rowCount
      }
    }

    // Actualizar datos profesionales (si están presentes)
    if (updates.professionalData) {
      const professionalFields = Object.keys(updates.professionalData)
        .filter((key) => key !== 'specialties') // Excluir specialties para manejarlo aparte
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ')

      if (professionalFields) {
        const professionalQuery = {
          text: `UPDATE professional SET ${professionalFields}, updated_at = NOW() WHERE user_id = $1`,
          values: [
            id,
            ...Object.values(updates.professionalData).filter((value) => typeof value !== 'object'),
          ],
        }
        await client.query(professionalQuery)
      }

      // Manejo de specialties (opcional)
      if (Array.isArray(updates.professionalData.specialties)) {
        const specialties = updates.professionalData.specialties

        // Eliminar especialidades existentes
        await client.query({
          text: `DELETE FROM professional_specialty WHERE professional_id = (SELECT id FROM professional WHERE user_id = $1)`,
          values: [id],
        })

        // Insertar nuevas especialidades
        for (const specialtyId of specialties) {
          await client.query({
            text: `INSERT INTO professional_specialty (professional_id, specialty_id) 
                   SELECT id, $2 FROM professional WHERE user_id = $1`,
            values: [id, specialtyId],
          })
        }
      }
    }

    await client.query('COMMIT')

    if (userRowsAffected === 0) {
      throw createError('USER_NOT_FOUND')
    }
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al actualizar el perfil:', error)
    throw error
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
