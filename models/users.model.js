import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import cloudinary from '../config/cloudinary.js'

const validStatuses = ['Active', 'Inactive']
// Crear usuario
const createUser = async ({
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
  avatar, // Avatar en Base64
  additional_data,
  specialties = [], // Ahora specialties es el único arreglo con todo
}) => {
  // Validar email
  const emailQuery = {
    text: `SELECT id FROM users WHERE email = $1`,
    values: [email],
  }
  const { rows: existing } = await db.query(emailQuery)
  if (existing[0]) throw createError('EMAIL_IN_USE')

  if (!validStatuses.includes(status)) throw createError('INVALID_STATUS')

  // Hashear contraseña
  const hashedPassword = await hashPassword(password)

  // Subir avatar a Cloudinary si existe
  let avatarUrl = null
  if (avatar) {
    const uploadResponse = await cloudinary.uploader.upload(avatar, {
      folder: 'dsuocyzih',
    })
    avatarUrl = uploadResponse.secure_url // URL pública de la imagen
  }

  // Insertar usuario
  const userQuery = {
    text: `INSERT INTO users (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status, avatar) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           RETURNING id, email, first_name, last_name`,
    values: [
      first_name,
      last_name,
      email,
      hashedPassword,
      address,
      phone,
      birth_date,
      gender,
      role_id,
      status,
      avatarUrl, // Guardar la URL subida a Cloudinary
    ],
  }
  const { rows: userRows } = await db.query(userQuery)
  const userId = userRows[0].id

  if (role_id === 2) {
    // Patient
    const patientQuery = {
      text: `INSERT INTO patient (user_id, medical_data, created_at, updated_at) 
             VALUES ($1, $2, NOW(), NOW())`,
      values: [userId, additional_data?.medical_data || null],
    }
    await db.query(patientQuery)
  } else if (role_id === 3) {
    // Professional
    const professionalQuery = {
      text: `INSERT INTO professional (user_id, professional_type_id, biography, years_of_experience) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
      values: [
        userId,
        additional_data?.professional_type_id || null,
        additional_data?.biography || null,
        additional_data?.years_of_experience || 0,
      ],
    }
    const { rows: professionalRows } = await db.query(professionalQuery)
    const professionalId = professionalRows[0].id

    // Separar specialties y subspecialties
    const specialtyIds = specialties.filter((id) => id >= 1 && id <= 15)
    const subspecialtyIds = specialties.filter((id) => id >= 16 && id <= 60)

    // Insertar specialties
    for (const specialtyId of specialtyIds) {
      const specialtyQuery = {
        text: `INSERT INTO professional_specialty (professional_id, specialty_id) VALUES ($1, $2)`,
        values: [professionalId, specialtyId],
      }
      await db.query(specialtyQuery)
    }

    // Insertar subspecialties validando parent_id
    for (const subspecialtyId of subspecialtyIds) {
      const validateSubspecialtyQuery = {
        text: `SELECT id FROM specialty WHERE id = $1 AND parent_id IS NOT NULL`,
        values: [subspecialtyId],
      }
      const { rows: valid } = await db.query(validateSubspecialtyQuery)
      if (!valid[0]) throw createError(`Invalid subspecialty ID: ${subspecialtyId}`)

      const subspecialtyQuery = {
        text: `INSERT INTO professional_specialty (professional_id, specialty_id) VALUES ($1, $2)`,
        values: [professionalId, subspecialtyId],
      }
      await db.query(subspecialtyQuery)
    }
  }

  return userRows[0]
}

// Obtener todos los usuarios
const getAllUsers = async () => {
  const query = {
    text: `SELECT * FROM users ORDER BY created_at DESC`,
  }
  const { rows } = await db.query(query)
  return rows
}

// Obtener un usuario por ID
const getUserById = async (id) => {
  const query = {
    text: `SELECT * FROM users WHERE id = $1`,
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('USER_NOT_FOUND')
  return rows[0]
}

// Actualizar usuario
const updateUser = async (id, updates) => {
  const fields = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ')
  const query = {
    text: `UPDATE users SET ${fields}${fields ? ', ' : ''}updated_at = NOW() WHERE id = $1 RETURNING *`,
    values: [id, ...Object.values(updates)],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('USER_NOT_FOUND')
  return rows[0]
}

// Eliminar usuario
const deleteUser = async (id) => {
  // Consultar usuario por ID antes de eliminar
  const userQuery = {
    text: `SELECT avatar FROM users WHERE id = $1`,
    values: [id],
  }
  const { rows } = await db.query(userQuery)

  if (!rows[0]) throw createError('USER_NOT_FOUND')

  const { avatar } = rows[0] // Obtener URL del avatar

  // Eliminar imagen de Cloudinary si existe
  if (avatar) {
    const publicId = avatar.split('/').slice(-2).join('/').split('.')[0] // Extraer public_id
    await cloudinary.uploader.destroy(publicId) // Eliminar imagen
  }

  // Eliminar usuario de la base de datos
  const deleteQuery = {
    text: `DELETE FROM users WHERE id = $1 RETURNING id`,
    values: [id],
  }
  const { rows: deletedRows } = await db.query(deleteQuery)

  if (!deletedRows[0]) throw createError('USER_NOT_FOUND')

  return deletedRows[0]
}

// Cambiar contraseña
const changePassword = async (id, currentPassword, newPassword) => {
  const userQuery = {
    text: `SELECT * FROM users WHERE id = $1`,
    values: [id],
  }
  const { rows } = await db.query(userQuery)
  if (!rows[0]) throw createError('USER_NOT_FOUND')

  const user = rows[0]

  const isMatch = await comparePassword(currentPassword, user.password)
  if (!isMatch) throw createError('INVALID_PASSWORD')

  const hashedPassword = await hashPassword(newPassword)
  const query = {
    text: `UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email`,
    values: [id, hashedPassword],
  }
  const { rows: updatedRows } = await db.query(query)
  return updatedRows[0]
}
// Cambiar status con validación
const changeStatus = async (id, newStatus) => {
  if (!validStatuses.includes(newStatus)) throw createError('INVALID_STATUS')

  const updateQuery = {
    text: `UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id, first_name, last_name, email, status`,
    values: [id, newStatus],
  }
  const { rows } = await db.query(updateQuery)
  if (!rows[0]) throw createError('USER_NOT_FOUND')
  return rows[0]
}

// Obtener todos los tipos profesionales
const getAllProfessionalTypes = async () => {
  const query = `
    SELECT id, name FROM professional_type
  `
  const { rows } = await db.query(query)

  // Traducción de los nombres al español
  const translatedRows = rows.map((row) => {
    let translatedName
    switch (row.name) {
      case 'Doctor':
        translatedName = 'Médico'
        break
      case 'Nurse':
        translatedName = 'Enfermero'
        break
      case 'Therapist':
        translatedName = 'Terapeuta'
        break
      default:
        translatedName = row.name // Devuelve el original si no coincide
    }
    return { ...row, name: translatedName }
  })

  return translatedRows
}

// Obtener todos los roles
const getAllRoles = async () => {
  const query = {
    text: `SELECT * FROM role ORDER BY id`,
  }
  const { rows } = await db.query(query)

  // Mapeo de traducciones
  const roleTranslations = {
    Admin: 'Administrador',
    Patient: 'Paciente',
    Professional: 'Profesional',
  }

  // Retornar roles traducidos
  return rows.map((role) => ({
    ...role,
    name: roleTranslations[role.name] || role.name,
  }))
}

const getSpecialtiesByType = async () => {
  const query = `
    SELECT id, name, 
           CASE 
             WHEN id BETWEEN 1 AND 15 THEN 'specialty' 
             WHEN id BETWEEN 16 AND 60 THEN 'subspecialty' 
             ELSE 'other' 
           END AS type
    FROM specialty
  `
  const { rows } = await db.query(query)
  return rows
}

export const UserModel = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  changeStatus,
  getAllProfessionalTypes,
  getAllRoles,
  getSpecialtiesByType,
}
