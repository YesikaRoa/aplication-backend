import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

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
}) => {
  // Validar si el email ya existe
  const emailQuery = {
    text: `SELECT id FROM users WHERE email = $1`,
    values: [email],
  }
  const { rows: existing } = await db.query(emailQuery)
  if (existing[0]) throw createError('EMAIL_IN_USE')

  const query = {
    text: `INSERT INTO users (first_name, last_name, email, password, address, phone, birth_date, gender, role_id, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
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
    ],
  }
  const { rows } = await db.query(query)
  return rows[0]
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
  const query = {
    text: `DELETE  from users WHERE id = $1 RETURNING id`,
    values: [id],
  }
  const { rows } = await db.query(query)
  if (!rows[0]) throw createError('USER_NOT_FOUND')
  return rows[0]
}

// Cambiar contraseña
const changePassword = async (id, newPassword) => {
  const query = {
    text: `UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1 RETURNING id, email`,
    values: [id, newPassword],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

export const UserModel = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
}
