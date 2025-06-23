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

export const UserModel = {
  createUser,
  findUserByEmail,
  validateLogin,
  registerUser,
}
