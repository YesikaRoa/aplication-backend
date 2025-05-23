export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const message = err.message || 'Error interno del servidor'
  const error = err.name || 'InternalServerError'

  res.status(status).json({ status, message, error })
}
