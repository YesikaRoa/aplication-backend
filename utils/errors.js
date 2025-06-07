const errorList = {
  INVALID_ID: {
    status: 400,
    message: 'El ID proporcionado no es válido',
    error: 'BadRequest',
  },
  RECORD_NOT_FOUND: {
    status: 404,
    message: 'Registro no encontrado',
    error: 'NotFound',
  },
  NO_UPDATES_PROVIDED: {
    status: 400,
    message: 'No se proporcionaron campos para actualizar',
    error: 'BadRequest',
  },
  INVALID_STATUS: {
    status: 400,
    message: 'Estado no válido',
    error: 'BadRequest',
  },
  NO_TOKEN_PROVIDED: {
    status: 401,
    message: 'Token no proporcionado',
    error: 'Unauthorized',
  },
  TOKEN_EXPIRED: {
    status: 401,
    message: 'Token expirado',
    error: 'Unauthorized',
  },
  INVALID_TOKEN: {
    status: 403,
    message: 'Token inválido',
    error: 'Forbidden',
  },
  EMAIL_IN_USE: {
    status: 400,
    message: 'El correo electrónico ya está registrado.',
    error: 'BadRequest',
  },
  USER_NOT_FOUND: {
    status: 404,
    message: 'Usuario no encontrado',
    error: 'NotFound',
  },
  INVALID_PASSWORD: {
    status: 400,
    message: 'Contraseña actual incorrecta',
    error: 'BadRequest',
  },
  PROFILE_NOT_FOUND: {
    status: 404,
    message: 'Perfil no encontrado',
    error: 'NotFound',
  },
  FIELDS_REQUIRED: {
    status: 400,
    message: 'Todos los campos son obligatorios',
    error: 'BadRequest',
  },
  PASSWORD_CONFIRMATION_MISMATCH: {
    status: 400,
    message: 'La confirmación de la contraseña no coincide',
    error: 'BadRequest',
  },
  INVALID_CREDENTIALS: {
    status: 400,
    message: 'Credenciales inválidas',
    error: 'BadRequest',
  },
  UNAUTHORIZED: {
    status: 401,
    message: 'No autorizado para realizar esta acción',
    error: 'Unauthorized',
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: 'Error interno del servidor',
    error: 'InternalServerError',
  },
}

export function createError(code) {
  const {
    status = 500,
    message = 'Error interno',
    error = 'InternalServerError',
  } = errorList[code] || {}
  const err = new Error(message)
  err.status = status
  err.name = error
  return err
}

export { errorList }
