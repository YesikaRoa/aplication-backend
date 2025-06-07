import { ProfileModel } from '../models/profile.model.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { createError } from '../utils/errors.js'

const getProfile = async (req, res, next) => {
  try {
    const id = req.user.id

    // Solo puede ver su propio perfil
    if (req.user.id !== Number(id)) {
      return next(createError('UNAUTHORIZED'))
    }

    const profile = await ProfileModel.getProfile(id)

    if (!profile) {
      return next(createError('PROFILE_NOT_FOUND'))
    }

    return res.status(200).json(profile)
  } catch (error) {
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const id = req.user.id
    const updates = req.body

    if (Number(req.user.id) !== Number(id)) {
      return next(createError('UNAUTHORIZED'))
    }

    const success = await ProfileModel.updateProfile(id, updates)

    if (!success) throw createError('USER_NOT_FOUND')

    return res.status(200).json({ message: 'Perfil actualizado con éxito' })
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const id = req.user.id
    const { currentPassword, newPassword, confirmPassword } = req.body

    // Solo puede cambiar su propia contraseña
    if (req.user.id !== Number(id)) {
      return next(createError('UNAUTHORIZED'))
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw createError('FIELDS_REQUIRED')
    }

    if (newPassword !== confirmPassword) {
      throw createError('PASSWORD_CONFIRMATION_MISMATCH')
    }

    const user = await ProfileModel.getUserByIdWithPassword(id)
    if (!user) {
      throw createError('USER_NOT_FOUND')
    }

    const isMatch = await comparePassword(currentPassword, user.password)
    if (!isMatch) {
      throw createError('INVALID_PASSWORD')
    }

    const hashedPassword = await hashPassword(newPassword)
    const updatedUser = await ProfileModel.changePassword(id, hashedPassword)
    if (!updatedUser) throw createError('INTERNAL_SERVER_ERROR')

    return res.status(200).json({ message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    next(error)
  }
}
export const ProfileController = {
  getProfile,
  updateProfile,
  changePassword,
}
