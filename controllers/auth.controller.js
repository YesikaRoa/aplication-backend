import { UserModel } from '../models/auth.model.js'
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

    // Registrar usuario
    const { user, professional } = await UserModel.registerUser(
      {
        email,
        password,
        professional_type_id,
        biography,
        years_of_experience,
        specialty_ids,
      },
      userDetails,
    )

    return res.status(201).json({
      message: 'Usuario registrado con éxito',
      user,
      professional,
    })
  } catch (error) {
    next(error)
  }
}

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validar login
    const user = await UserModel.validateLogin(email, password)

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
