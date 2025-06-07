import { validateEmailExists, validatePassword } from '../utils/auth.validations.js'
import { UserModel } from '../models/auth.model.js'
import { hashPassword } from '../utils/password.js'
import jwt from 'jsonwebtoken'
import { createError } from '../utils/errors.js'

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
    const existingUser = await UserModel.findUserByEmail(email)
    if (existingUser) {
      return next(createError('EMAIL_IN_USE'))
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
    let user
    try {
      user = await validateEmailExists(email)
    } catch (error) {
      return next(createError('INVALID_CREDENTIALS'))
    }

    // Validar contraseña
    try {
      await validatePassword(password, user.password)
    } catch (error) {
      return next(createError('INVALID_CREDENTIALS'))
    }

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
