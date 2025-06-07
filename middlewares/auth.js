import jwt from 'jsonwebtoken'
import { createError } from '../utils/errors.js'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return next(createError('NO_TOKEN_PROVIDED'))
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return next(createError('TOKEN_EXPIRED'))
      }
      return next(createError('INVALID_TOKEN'))
    }

    req.user = user // Información del usuario decodificada

    next()
  })
}
