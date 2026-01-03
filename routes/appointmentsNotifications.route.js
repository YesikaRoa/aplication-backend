// routes/appointments.internal.js
import { Router } from 'express'
import { authenticateInternal } from '../middlewares/authInternal.js'
import {
  getAppointmentsForReminders,
  markReminderSent,
} from '../controllers/appointmentsNotifications.controller.js'

const router = Router()

router.get('/internal/reminders', authenticateInternal, getAppointmentsForReminders)
router.post('/internal/:id/mark-reminder', authenticateInternal, markReminderSent)

export default router
