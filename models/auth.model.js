import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import { validateEmailExists, validatePassword } from '../utils/auth.validations.js'
import { hashPassword } from '../utils/password.js'

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
  avatar,
}) => {
  const query = {
    text: `INSERT INTO users (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status,avatar) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           RETURNING id, email, first_name, last_name`,
    values: [
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
      avatar,
    ],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('INTERNAL_SERVER_ERROR')
  return rows[0]
}

const createProfessional = async ({
  user_id,
  professional_type_id,
  biography,
  years_of_experience,
}) => {
  const query = {
    text: `INSERT INTO professional (user_id, professional_type_id, biography, years_of_experience, created_at)
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
    values: [user_id, professional_type_id, biography, years_of_experience],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('INTERNAL_SERVER_ERROR')
  return rows[0]
}

const createProfessionalSpecialty = async ({ professional_id, specialty_ids }) => {
  if (!Array.isArray(specialty_ids) || specialty_ids.length === 0) {
    throw createError('FIELDS_REQUIRED')
  }
  const query = {
    text: `INSERT INTO professional_specialty (professional_id, specialty_id)
           VALUES ${specialty_ids.map((_, index) => `($1, $${index + 2})`).join(',')}`,
    values: [professional_id, ...specialty_ids],
  }
  await db.query(query)
}

const findUserByEmail = async (email) => {
  const query = {
    text: `SELECT * FROM users WHERE email = $1`,
    values: [email],
  }
  const { rows } = await db.query(query)
  return rows[0] || null
}

const validateLogin = async (email, inputPassword) => {
  // Validar existencia del email
  const user = await validateEmailExists(email)

  // Validar contraseña
  await validatePassword(inputPassword, user.password)

  return user // Retorna el usuario validado
}

const registerUser = async (
  {
    email,
    password,
    avatar: avatarUrl,
    professional_type_id,
    biography,
    years_of_experience,
    specialty_ids,
  },
  userDetails,
) => {
  // Validar existencia del email
  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    throw createError('EMAIL_IN_USE')
  }

  // Hashear la contraseña
  const hashedPassword = await hashPassword(password)

  // Crear usuario
  const newUser = await createUser({
    email,
    password: hashedPassword,
    avatar: avatarUrl,
    ...userDetails,
  })

  // Crear profesional
  const newProfessional = await createProfessional({
    user_id: newUser.id,
    professional_type_id,
    biography,
    years_of_experience,
  })

  // Asignar especialidades
  if (specialty_ids && specialty_ids.length > 0) {
    await createProfessionalSpecialty({
      professional_id: newProfessional.id,
      specialty_ids,
    })
  }

  return { user: newUser, professional: newProfessional }
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

const getProfessionalTypes = async () => {
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

const sendTemporaryPassword = async (email) => {
  // Buscar usuario por email
  const queryUser = {
    text: `SELECT id, first_name, last_name, email FROM users WHERE email = $1`,
    values: [email],
  }
  const { rows } = await db.query(queryUser)
  const user = rows[0]

  if (!user) {
    throw createError('USER_NOT_FOUND')
  }

  // Generar contraseña temporal (simple)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let tempPassword = ''
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Hashear la contraseña temporal
  const hashedPassword = await hashPassword(tempPassword) // Usa tempPassword aquí

  // Actualizar la contraseña en la base de datos
  const updateQuery = {
    text: `UPDATE users SET password = $1 WHERE id = $2`,
    values: [hashedPassword, user.id],
  }
  await db.query(updateQuery)

  // Retornar usuario y la contraseña temporal (sin hash) para que frontend la envíe por email
  return { user, tempPassword }
}

export const UserModel = {
  createUser,
  findUserByEmail,
  validateLogin,
  registerUser,
  getSpecialtiesByType,
  getProfessionalTypes,
  sendTemporaryPassword,
}
