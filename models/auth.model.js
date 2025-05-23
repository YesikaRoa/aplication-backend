import { db } from '../database/connection.js'

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

const findUserByEmail = async (email) => {
  const query = {
    text: `SELECT * FROM users WHERE email = $1`,
    values: [email],
  }
  const { rows } = await db.query(query)
  return rows[0]
}

export const UserModel = {
  createUser,
  findUserByEmail,
}
