// auth.validations.js
import { UserModel } from '../../models/auth.model.js'
import { comparePassword } from '../password.js'

export const validateEmailExists = async (email) => {
  const user = await UserModel.findUserByEmail(email)
  if (!user) {
    throw new Error('Invalid email')
  }
  return user // Retorna el usuario si existe
}

export const validatePassword = async (inputPassword, userPassword) => {
  const isPasswordValid = await comparePassword(inputPassword, userPassword)
  if (!isPasswordValid) {
    throw new Error('Invalid password')
  }
}
