import { createError } from '../utils/errors.js'

export const validateUserId = (req, res, next) => {
  const { id } = req.params
  // Verifica que id sea un número entero positivo
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return next(createError('INVALID_ID'))
  }
  req.params.id = parseInt(id)
  next()
}
