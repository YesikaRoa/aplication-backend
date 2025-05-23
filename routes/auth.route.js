import { Router } from 'express'
import { registerUserSchema, loginUserSchema } from '../schemas/auth.schema.js'
import { validateSchema } from '../middlewares/validateSchema.js'
import { UserController } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', validateSchema(registerUserSchema), UserController.registerUser)
router.post('/login', validateSchema(loginUserSchema), UserController.loginUser)

export default router
