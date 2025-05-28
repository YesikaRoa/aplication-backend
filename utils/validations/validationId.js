export const validateId = (id) => {
  // Verifica si el ID es un número entero positivo
  if (!/^\d+$/.test(id)) {
    return {
      valid: false,
      message: 'El ID debe ser un número entero positivo.',
    }
  }

  const numericId = Number(id)
  if (numericId <= 0) {
    return {
      valid: false,
      message: 'El ID debe ser mayor a cero.',
    }
  }

  return { valid: true }
}
