import { UserModel } from '../models/users.model.js'
import { hashPassword } from '../utils/password.js'
import { comparePassword } from '../utils/password.js'

const createUser = async (req, res, next) => {
  try {
    const { password, ...otherDetails } = req.body

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password)

    // Crear nuevo usuario
    const newUser = await UserModel.createUser({ ...otherDetails, password: hashedPassword })

    return res.status(201).json({ message: 'Usuario creado con éxito', user: newUser })
  } catch (error) {
    next(error)
  }
}

const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.getAllUsers()

    const usersWithoutPassword = users.map(({ password, ...user }) => user)
    return res.status(200).json(usersWithoutPassword)
  } catch (error) {
    next(error)
  }
}

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = await UserModel.getUserById(id)

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const { password, ...userWithoutPassword } = user

    return res.status(200).json(userWithoutPassword)
  } catch (error) {
    next(error)
  }
}

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body

    const updatedUser = await UserModel.updateUser(id, updates)

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    // Desestructurar para excluir la contraseña
    const { password, ...userWithoutPassword } = updatedUser

    return res
      .status(200)
      .json({ message: 'Usuario actualizado con éxito', user: userWithoutPassword })
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    const deletedUser = await UserModel.deleteUser(id)

    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    return res.status(200).json({ message: 'Usuario eliminado con éxito' })
  } catch (error) {
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body

    const user = await UserModel.getUserById(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    // Verificar que la contraseña actual coincida
    const isMatch = await comparePassword(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' })
    }

    // Hashear la nueva contraseña
    const hashedPassword = await hashPassword(newPassword)

    const wasUpdated = await UserModel.updateUser(id, { password: hashedPassword })
    if (!wasUpdated) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    return res.status(200).json({ message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    next(error)
  }
}

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { newStatus } = req.body

    const wasUpdated = await UserModel.updateUser(id, { status: newStatus })

    if (!wasUpdated) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    return res.status(200).json({ message: 'Estado actualizado con éxito', status: newStatus })
  } catch (error) {
    next(error)
  }
}

export const UsersController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  changeStatus,
}
