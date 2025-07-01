import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.route.js'
import userRoutes from './routes/users.route.js'
import profileRoutes from './routes/profile.route.js'
import appointmentsRoutes from './routes/appointments.route.js'
import patientsRoutes from './routes/patients.route.js'
import professionalRoutes from './routes/professionals.route.js'
import notificationsRoutes from './routes/notifications.route.js'
import dashboardRoutes from './routes/dashboard.route.js'
import medicalRecord from './routes/medicalRecord.route.js'
import medicalRecordPdf from './routes/pdf.route.js'

import { errorHandler } from './middlewares/errorHandler.js'
const app = express()
// Configuración de CORS
app.use(cors({ origin: 'http://localhost:3002' }))

app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)

app.use('/api/users', userRoutes)

app.use('/api/profile', profileRoutes)

app.use('/api/appointments', appointmentsRoutes)

app.use('/api/patients', patientsRoutes)

app.use('/api/professionals', professionalRoutes)

app.use('/api/notifications', notificationsRoutes)

app.use('/api/dashboard', dashboardRoutes)

app.use('/api/medical_record', medicalRecord)

app.use('/api/pdf', medicalRecordPdf)

app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
