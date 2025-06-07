export const validateSchema = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (error) {
    if (error.errors) {
      // Mapear errores para mostrar campo y mensaje
      const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      return res.status(400).json({
        error: 'Datos inválidos',
        issues,
      })
    }
    next(error)
  }
}
