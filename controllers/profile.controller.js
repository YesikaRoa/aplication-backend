import { ProfileModel } from '../models/profile.model.js'
import { db } from '../database/connection.js'

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
    await ProfileModel.updateProfile(id, updates)

    // Obtener usuario actualizado (incluyendo avatar)
    const user = await db.query(
      'SELECT id, avatar, first_name, last_name, email FROM users WHERE id = $1',
      [id],
    )
    return res.status(200).json(user.rows[0]) // Aquí devuelves el usuario actualizado
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
