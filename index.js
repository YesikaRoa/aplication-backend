import 'dotenv/config'
import express from 'express'
import authRoutes from './routes/auth.route.js'
import userRoutes from './routes/users.route.js'
import profileRoutes from './routes/profile.route.js'
import appointmentsRoutes from './routes/appointments.route.js'
import patientsRoutes from './routes/patients.route.js'
import professionalRoutes from './routes/professionals.route.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()

app.use(express.json())

app.use('/api/auth', authRoutes)

app.use('/api/users', userRoutes)

app.use('/api/profile', profileRoutes)

app.use('/api/appointments', appointmentsRoutes)

app.use('/api/patients', patientsRoutes)

app.use('/api/professionals', professionalRoutes)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
