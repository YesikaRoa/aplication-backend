import { ProfileModel } from '../models/profile.model.js'
import { comparePassword, hashPassword } from '../utils/password.js'

const getProfile = async (req, res, next) => {
  try {
    const id = req.user.id

    // Solo puede ver su propio perfil
    if (req.user.id !== Number(id)) {
      return next(new Error('UNAUTHORIZED'))
    }

    const profile = await ProfileModel.getProfile(id)

    if (!profile) {
      return next(new Error('PROFILE_NOT_FOUND'))
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
      return next(new Error('UNAUTHORIZED'))
    }

    const success = await ProfileModel.updateProfile(id, updates)

    if (!success) return next(new Error('USER_NOT_FOUND'))

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
      return next(new Error('UNAUTHORIZED'))
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new Error('FIELDS_REQUIRED'))
    }

    if (newPassword !== confirmPassword) {
      return next(new Error('PASSWORD_CONFIRMATION_MISMATCH'))
    }

    const user = await ProfileModel.getUserByIdWithPassword(id)
    if (!user) {
      return next(new Error('USER_NOT_FOUND'))
    }

    const isMatch = await comparePassword(currentPassword, user.password)
    if (!isMatch) {
      return next(new Error('INVALID_PASSWORD'))
    }

    const hashedPassword = await hashPassword(newPassword)
    const updatedUser = await ProfileModel.changePassword(id, hashedPassword)
    if (!updatedUser) return next(new Error('INTERNAL_SERVER_ERROR'))

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
