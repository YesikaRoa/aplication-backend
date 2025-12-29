export const authenticateInternal = (req, res, next) => {
  const token = req.headers['x-internal-token']
  if (!token || token !== process.env.INTERNAL_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized internal request' })
  }
  next()
}
