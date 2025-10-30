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
  INVALID_PROFESSIONAL_ID: {
    status: 400,
    message: 'El ID del profesional no está registrado',
    error: 'BadRequest',
  },
  INVALID_PATIENT_ID: {
    status: 400,
    message: 'El ID del paciente no está registrado',
    error: 'BadRequest',
  },
  INVALID_CITY_ID: {
    status: 400,
    message: 'El ID de la ciudad no está registrado',
    error: 'BadRequest',
  },
  PASSWORDS_DO_NOT_MATCH: {
    status: 400,
    message: 'Las contraseñas no coinciden',
    error: 'BadRequest',
  },
  MISSING_REQUIRED_FIELDS: {
    status: 400,
    message: 'Faltan campos obligatorios',
    error: 'BadRequest',
  },
  MEDICAL_RECORD_NOT_FOUND: {
    status: 404,
    message: 'Historial medico no encontrado',
    error: 'NotFound',
  },
  PROFESSIONAL_NOT_FOUND: {
    status: 404,
    message: 'El profesional con ese ID no existe',
    error: 'NotFound',
  },
  PATIENT_NOT_FOUND: {
    status: 404,
    message: 'El paciente con ese ID no existe',
    error: 'NotFound',
  },
  ACCESS_DENIED: {
    status: 403,
    message: 'Access denied: Admins only',
    error: 'Forbidden',
  },
  AVATAR_UPLOAD_FAILED: {
    status: 403,
    message: 'Avatar fallo',
    error: 'Forbidden',
  },
  PROFESSIONAL_NOT_FOUND_FOR_USER: {
    status: 404,
    message: 'No se encontró un profesional asociado al usuario',
    error: 'NotFound',
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
