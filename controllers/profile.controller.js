import { ProfileModel } from '../models/profile.model.js'

const getProfile = async (req, res, next) => {
  try {
    const id = req.user.id
    const profile = await ProfileModel.getProfile(id)
    return res.status(200).json(profile)
  } catch (error) {
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const id = req.user.id
    const updates = req.body
    const success = await ProfileModel.updateProfile(id, updates)
    return res.status(200).json({ message: 'Perfil actualizado con éxito' })
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const id = req.user.id
    const { currentPassword, newPassword, confirmPassword } = req.body
    const updatedUser = await ProfileModel.changePassword(id, {
      currentPassword,
      newPassword,
      confirmPassword,
    })
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
