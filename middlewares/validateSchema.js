import { ZodError } from 'zod'

export const validateSchema = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors.map((e) => ({
        path: e.path[e.path.length - 1],
        message: e.message,
      }))
      return res.status(400).json({
        error: 'Datos inválidos',
        issues,
      })
    }
    next(error)
  }
}
