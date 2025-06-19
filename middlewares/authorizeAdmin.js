import { createError } from '../utils/errors.js'

export const authorizeAdmin = (req, res, next) => {
  const user = req.user // Usuario autenticado, decodificado del token

  if (!user || user.role !== 1) {
    // Cambia role_id por role
    return next(createError('ACCESS_DENIED'))
  }

  next() // Permitir acceso si es Admin
}
