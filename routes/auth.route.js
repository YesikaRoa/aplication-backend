import { Router } from 'express'
import { registerUserSchema, loginUserSchema } from '../schemas/auth.schema.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { UserController } from '../controllers/auth.controller.js'
import { authenticateToken, renewToken } from '../middlewares/auth.js'

const router = Router()

router.post('/register', validateSchema(registerUserSchema), UserController.registerUser)
router.post('/login', validateSchema(loginUserSchema), UserController.loginUser)
router.get('/specialties', UserController.getSpecialties)
router.get('/professional-types', UserController.getProfessionalTypes)
router.post('/send-temporary-password', UserController.sendTemporaryPassword)

// Nuevo endpoint para renovar token
router.post('/renew-token', authenticateToken, renewToken)
export default router
