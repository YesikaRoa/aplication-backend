import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard.controller.js'
import { authenticateToken } from '../middlewares/auth.js'

const router = Router()

router.get('/', authenticateToken, DashboardController.getDashboardData)

export default router
