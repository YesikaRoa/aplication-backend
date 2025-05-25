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
  return rows[0]
}

const createProfessionalSpecialty = async ({ professional_id, specialty_ids }) => {
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
  return rows[0]
}

export const UserModel = {
  createUser,
  findUserByEmail,
  createProfessional,
  createProfessionalSpecialty,
}
