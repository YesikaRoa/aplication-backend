import { Router } from 'express'
import { PdfController } from '../controllers/pdf.controller.js'
import { authenticateToken } from '../middlewares/auth.js'

const router = Router()

// Ruta para descargar historial médico en PDF
router.get('/', authenticateToken, PdfController.downloadMedicalHistory)
// Ruta para obtener pacientes del usuario logueado
router.get('/my-patients', authenticateToken, PdfController.getMyPatients)

export default router
