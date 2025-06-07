import { UserModel } from '../models/auth.model.js'
import { comparePassword } from './password.js'
import { createError } from './errors.js'

export const validateEmailExists = async (email) => {
  const user = await UserModel.findUserByEmail(email)
  if (!user) {
    throw createError('INVALID_CREDENTIALS')
  }
  return user // Retorna el usuario si existe
}

export const validatePassword = async (inputPassword, userPassword) => {
  const isPasswordValid = await comparePassword(inputPassword, userPassword)
  if (!isPasswordValid) {
    throw createError('INVALID_CREDENTIALS')
  }
}
