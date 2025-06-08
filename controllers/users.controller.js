import { UserModel } from '../models/users.model.js'
import { hashPassword, comparePassword } from '../utils/password.js'

const createUser = async (req, res, next) => {
  try {
    const { password, ...otherDetails } = req.body
    const hashedPassword = await hashPassword(password)
    const newUser = await UserModel.createUser({ ...otherDetails, password: hashedPassword })
    return res.status(201).json({ message: 'Usuario creado con éxito', user: newUser })
  } catch (error) {
    next(error)
  }
}

const getAllUser = async (req, res, next) => {
  try {
    const users = await UserModel.getAllUsers()
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
    const { password, ...filteredUser } = updatedUser
    const limitedUserData = {
      id: filteredUser.id,
      firstName: filteredUser.first_name,
      lastName: filteredUser.last_name,
      email: filteredUser.email,
      status: filteredUser.status,
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
    const user = await UserModel.getUserById(id)
    const isMatch = await comparePassword(currentPassword, user.password)
    if (!isMatch) throw new Error('INVALID_PASSWORD') // Puedes manejar esto en el modelo si prefieres
    const hashedPassword = await hashPassword(newPassword)
    await UserModel.updateUser(id, { password: hashedPassword })
    res.status(200).json({ message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    next(error)
  }
}

const changeStatus = async (req, res, next) => {
  const validStatuses = ['Active', 'Inactive']
  try {
    const { id } = req.params
    const { newStatus } = req.body
    if (!validStatuses.includes(newStatus)) throw new Error('INVALID_STATUS')
    const updatedUser = await UserModel.updateUser(id, { status: newStatus })
    const userToShow = {
      id: updatedUser.id,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      email: updatedUser.email,
      status: updatedUser.status,
    }
    res.status(200).json({
      message: 'Estado actualizado con éxito',
      user: userToShow,
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
