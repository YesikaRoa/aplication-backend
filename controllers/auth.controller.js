import { validateEmailExists, validatePassword } from '../utils/validations/auth.validations.js'
import { UserModel } from '../models/auth.model.js'

import { hashPassword } from '../utils/password.js'
import jwt from 'jsonwebtoken'

const registerUser = async (req, res, next) => {
  try {
    const {
      email,
      password,
      professional_type_id,
      biography,
      years_of_experience,
      specialty_ids,
      ...userDetails
    } = req.body

    // Validar existencia del email
    try {
      await validateEmailExists(email)
      return res.status(400).json({ message: 'User already exists' })
    } catch (error) {
      if (error.message !== 'Invalid email') throw error
    }

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password)

    // Crear usuario
    const newUser = await UserModel.createUser({ email, password: hashedPassword, ...userDetails })

    // Crear profesional
    const newProfessional = await UserModel.createProfessional({
      user_id: newUser.id,
      professional_type_id,
      biography,
      years_of_experience,
    })

    // Asignar especialidades
    if (specialty_ids && specialty_ids.length > 0) {
      await UserModel.createProfessionalSpecialty({
        professional_id: newProfessional.id,
        specialty_ids,
      })
    }

    return res.status(201).json({ message: 'Usuario registrado con éxito' })
  } catch (error) {
    next(error)
  }
}

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validar email
    const user = await validateEmailExists(email)

    // Validar contraseña
    await validatePassword(password, user.password)

    // Generar token JWT
    const token = jwt.sign({ id: user.id, role: user.role_id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })

    return res.status(200).json({ message: 'Login exitoso', token })
  } catch (error) {
    next(error)
  }
}
export const UserController = {
  registerUser,
  loginUser,
}
