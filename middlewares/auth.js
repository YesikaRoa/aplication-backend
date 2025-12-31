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

    if (!user || !user.id) {
      return next(createError('INVALID_TOKEN'))
    }

    req.user = user // Información del usuario decodificada
    next()
  })
}
// Endpoint para renovar el token
export const renewToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return next(createError('NO_TOKEN_PROVIDED'))
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(createError('INVALID_TOKEN'))
    }

    if (!user || !user.id) {
      return next(createError('INVALID_TOKEN'))
    }

    // Generar un nuevo token
    const newToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })

    res.json({ token: newToken })
  })
}
