import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

const NOTIFICATION_FIELDS = `id, user_id, content, type, status, created_at, updated_at`

export const NotificationModel = {
  async getAllByUserId(userId) {
    try {
      if (!userId) throw createError('INVALID_ID')
      const { rows } = await db.query(
        `SELECT ${NOTIFICATION_FIELDS} FROM notification WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      )
      return rows
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },

  async deleteByIdAndUserId(id, userId) {
    try {
      if (!id || !userId) throw createError('INVALID_ID')
      // Asegura que solo elimine notificaciones propias
      const { rowCount } = await db.query(
        `DELETE FROM notification WHERE id = $1 AND user_id = $2`,
        [id, userId],
      )
      if (rowCount === 0) throw createError('RECORD_NOT_FOUND')
      return true
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },
  async createNotification({ user_id, content, type }) {
    try {
      if (!user_id || !content || !type) {
        throw createError('MISSING_REQUIRED_FIELDS')
      }
      const query = `
        INSERT INTO notification (user_id, content, type, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'unread', NOW(), NOW())
        RETURNING ${NOTIFICATION_FIELDS}
      `
      const { rows } = await db.query(query, [user_id, content, type])
      return rows[0]
    } catch (error) {
      if (error.status && error.message) throw error
      throw createError('INTERNAL_SERVER_ERROR')
    }
  },
}
