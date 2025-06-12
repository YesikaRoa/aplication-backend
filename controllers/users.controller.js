import { UserModel } from '../models/users.model.js'

const createUser = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      address,
      phone,
      birth_date,
      gender,
      role_id,
      status,
      professional_data,
      patient_data,
    } = req.body

    // Si profesional, extraer specialties desde professional_data
    const specialties = professional_data?.specialties || []

    // Crear usuario y profesional (como en tu modelo)
    const newUser = await UserModel.createUser({
      first_name,
      last_name,
      email,
      password,
      address,
      phone,
      birth_date,
      gender,
      role_id,
      status,
      additional_data: role_id === 2 ? patient_data : professional_data,
      specialties, // ahora sí viene correcto
    })
    res.status(201).json({ message: 'Usuario creado', user: newUser })
  } catch (error) {
    next(error)
  }
}

const getAllUser = async (req, res, next) => {
  try {
    const users = await UserModel.getAllUsers()
    // Ocultar password antes de enviar
    res.status(200).json(users.map(({ password, ...user }) => user))
  } catch (error) {
    next(error)
  }
}

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = await UserModel.getUserById(id)
    const { password, ...userWithoutPassword } = user
    res.status(200).json(userWithoutPassword)
  } catch (error) {
    next(error)
  }
}

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body
    const updatedUser = await UserModel.updateUser(id, updates)
    // Mostrar solo datos limitados
    const limitedUserData = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      status: updatedUser.status,
    }
    res.status(200).json({ message: 'Usuario actualizado con éxito', user: limitedUserData })
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params
    await UserModel.deleteUser(id)
    res.status(200).json({ message: 'Usuario eliminado con éxito' })
  } catch (error) {
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body
    await UserModel.changePassword(id, currentPassword, newPassword)
    res.status(200).json({ message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    next(error)
  }
}

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { newStatus } = req.body
    const updatedUser = await UserModel.changeStatus(id, newStatus)
    res.status(200).json({
      message: 'Estado actualizado con éxito',
      user: updatedUser,
    })
  } catch (error) {
    next(error)
  }
}

export const UsersController = {
  createUser,
  getAllUser,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  changeStatus,
}
