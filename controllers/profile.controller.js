import { ProfileModel } from '../models/profile.model.js'
import { comparePassword, hashPassword } from '../utils/password.js'

const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params

    const profile = await ProfileModel.getProfile(id)

    if (!profile) {
      return res.status(404).json({ message: 'Perfil no encontrado' })
    }

    return res.status(200).json(profile)
  } catch (error) {
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body

    const success = await ProfileModel.updateProfile(id, updates)

    if (!success) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    return res.status(200).json({ message: 'Perfil actualizado con éxito' })
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'La confirmación de la contraseña no coincide' })
    }

    const user = await ProfileModel.getUserByIdWithPassword(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const isMatch = await comparePassword(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' })
    }

    const hashedPassword = await hashPassword(newPassword)
    const updatedUser = await ProfileModel.changePassword(id, hashedPassword)
    if (!updatedUser) {
      return res.status(500).json({ message: 'No se pudo actualizar la contraseña' })
    }

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
