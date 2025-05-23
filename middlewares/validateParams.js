import { userIdSchema } from '../schemas/users.schema.js'

export const validateUserId = (req, res, next) => {
  try {
    const params = userIdSchema.parse(req.params)
    req.params = params // Actualiza los parámetros si son válidos
    next()
  } catch (error) {
    return res.status(400).json({ status: 400, message: error.errors[0].message })
  }
}
