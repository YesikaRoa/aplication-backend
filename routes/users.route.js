import { Router } from 'express'
import { UsersController } from '../controllers/users.controller.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { authenticateToken } from '../middlewares/auth.js'
import { validateUserId } from '../middlewares/validateParams.js'
import { authorizeAdmin } from '../middlewares/authorizeAdmin.js'

import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  changeStatusSchema,
} from '../schemas/users.schema.js'

const router = Router()

// Nueva ruta para obtener tipos profesionales
router.get('/professional-types', UsersController.getAllProfessionalTypes)

// Nueva ruta para obtener roles
router.get('/roles', UsersController.getAllRoles)

//specialties
router.get('/specialties', UsersController.getSpecialties)

// Crear un usuario
router.post('/', authenticateToken, validateSchema(createUserSchema), UsersController.createUser)

// Obtener todos los usuarios
router.get('/', authenticateToken, UsersController.getAllUser)

// Obtener un usuario por ID
router.get('/:id', authenticateToken, validateUserId, UsersController.getUserById)

// Actualizar un usuario
router.put(
  '/:id',
  authenticateToken,

  validateUserId,
  validateSchema(updateUserSchema),
  UsersController.updateUser,
)

// Eliminar un usuario
router.delete('/:id', authenticateToken, validateUserId, UsersController.deleteUser)

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
