import { Router } from 'express'
import { UsersController } from '../controllers/users.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  changeStatusSchema,
} from '../schemas/users.schema.js'

const router = Router()

// Crear un usuario
router.post('/', validateSchema(createUserSchema), UsersController.createUser)

// Obtener todos los usuarios
router.get('/', authenticateToken, UsersController.getAllUsers)

// Obtener un usuario por ID
router.get('/', authenticateToken, validateUserId, UsersController.getUserById)

// Actualizar un usuario
router.put(
  '/:id',
  authenticateToken,
  validateUserId,
  validateSchema(updateUserSchema),
  UsersController.updateUser,
)

// Eliminar un usuario
router.get('/:id', authenticateToken, validateUserId, UsersController.deleteUser)

// Cambiar la contraseña
router.put(
  '/password/:id',
  authenticateToken,
  validateUserId,
  validateSchema(changePasswordSchema),
  UsersController.changePassword,
)

// Cambiar el estado (status)
router.put(
  '/status/:id',
  authenticateToken,
  validateUserId,
  validateSchema(changeStatusSchema),
  UsersController.changeStatus,
)

export default router
