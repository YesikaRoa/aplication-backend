import { validateEmailExists, validatePassword } from '../utils/validations/auth.validations.js'
import { UserModel } from '../models/auth.model.js'

import { hashPassword } from '../utils/password.js'
import jwt from 'jsonwebtoken'

const registerUser = async (req, res, next) => {
  try {
    const { email, password, ...otherDetails } = req.body
    try {
      await validateEmailExists(email)
      return res.status(400).json({ message: 'User already exists' })
    } catch (error) {
      if (error.message !== 'Invalid email') throw error
    }

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password)

    // Crear nuevo usuario
    const newUser = await UserModel.createUser({ email, password: hashedPassword, ...otherDetails })

    return res.status(201).json({ message: 'Usuario creado con éxito' })
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
