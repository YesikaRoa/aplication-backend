export function validateSchema(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        issues: error.errors.map((e) => e.message),
      })
    }
  }
}
