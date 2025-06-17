import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

const getDashboardStats = async () => {
  try {
    // Pacientes atendidos en el último mes con estado completado
    const attendedPatientsQuery = {
      text: `
    SELECT COUNT(*) AS attended_patients
    FROM appointment
    WHERE status = 'completed' 
      AND scheduled_at >= date_trunc('month', NOW() - INTERVAL '1 month')
      AND scheduled_at < date_trunc('month', NOW());
  `,
    }

    const attendedPatients = await db.query(attendedPatientsQuery)

    // Nuevos pacientes confirmados esta semana
    const newPatientsQuery = {
      text: `
        SELECT COUNT(*) AS new_patients
        FROM appointment
        WHERE status = 'confirmed'
          AND scheduled_at >= DATE_TRUNC('week', NOW());
      `,
    }
    const newPatients = await db.query(newPatientsQuery)

    // Especialidad más solicitada
    const topSpecialtyQuery = {
      text: `
    SELECT 
      s.name AS specialty
    FROM appointment a
    JOIN professional_specialty ps ON ps.professional_id = a.professional_id
    JOIN specialty s ON s.id = ps.specialty_id
    WHERE s.id BETWEEN 1 AND 15 -- Solo especialidades
    GROUP BY s.name
    ORDER BY COUNT(DISTINCT a.patient_id) DESC
    LIMIT 1;
  `,
    }

    const topSpecialty = await db.query(topSpecialtyQuery)

    // Resumen de citas por mes por estado
    const appointmentsByMonthQuery = {
      text: `
        SELECT 
          TO_CHAR(scheduled_at, 'YYYY-MM') AS month, 
          status, 
          COUNT(*) AS count
        FROM appointment
        GROUP BY month, status
        ORDER BY month ASC;
      `,
    }
    const appointmentsByMonth = await db.query(appointmentsByMonthQuery)

    // Profesionales con más pacientes atendidos
    const topProfessionalsQuery = {
      text: `
    SELECT 
      CONCAT(u.first_name, ' ', u.last_name) AS professional,
      COUNT(DISTINCT a.patient_id) AS patient_count
    FROM appointment a
    JOIN professional p ON p.id = a.professional_id
    JOIN users u ON u.id = p.user_id
    WHERE a.status = 'completed'
    GROUP BY u.first_name, u.last_name
    ORDER BY patient_count DESC
    LIMIT 5;
  `,
    }

    const topProfessionals = await db.query(topProfessionalsQuery)

    // Pacientes por ciudad
    const patientsByCityQuery = {
      text: `
        SELECT 
          c.name AS city, 
          COUNT(a.id) AS patient_count
        FROM appointment a
        JOIN city c ON c.id = a.city_id
        GROUP BY c.name
        ORDER BY patient_count DESC;
      `,
    }
    const patientsByCity = await db.query(patientsByCityQuery)

    // Especialidades más solicitadas (para un reporte más general)
    const specialtiesByRequestQuery = {
      text: `
    SELECT 
      s.name AS specialty, 
      COUNT(DISTINCT a.patient_id) AS patient_count
    FROM appointment a
    JOIN professional_specialty ps ON ps.professional_id = a.professional_id
    JOIN specialty s ON s.id = ps.specialty_id
    WHERE s.id BETWEEN 1 AND 15 -- Solo especialidades
    GROUP BY s.name
    ORDER BY patient_count DESC;
  `,
    }

    const specialtiesByRequest = await db.query(specialtiesByRequestQuery)

    // Pacientes recientes registrados en citas durante los últimos 7 días
    const recentPatientsQuery = {
      text: `
    SELECT 
      CONCAT(u_p.first_name, ' ', u_p.last_name) AS patient,
      CONCAT(u_prof.first_name, ' ', u_prof.last_name) AS professional,
      c.name AS city,
      a.scheduled_at,
      a.status
    FROM appointment a
    JOIN patient p ON p.id = a.patient_id
    JOIN users u_p ON u_p.id = p.user_id
    JOIN professional prof ON prof.id = a.professional_id
    JOIN users u_prof ON u_prof.id = prof.user_id
    JOIN city c ON c.id = a.city_id
    WHERE a.created_at >= NOW() - INTERVAL '7 days' -- Filtro por fecha de creación
    ORDER BY a.created_at DESC
    LIMIT 10;
  `,
    }

    const recentPatients = await db.query(recentPatientsQuery)

    return {
      attendedPatients: parseInt(attendedPatients.rows[0]?.attended_patients || 0, 10),
      newPatients: parseInt(newPatients.rows[0]?.new_patients || 0, 10),
      topSpecialty: topSpecialty.rows[0] || null,
      appointmentsByMonth: appointmentsByMonth.rows.map((row) => ({
        ...row,
        count: parseInt(row.count, 10),
      })),
      topProfessionals: topProfessionals.rows.map((row) => ({
        ...row,
        patient_count: parseInt(row.patient_count, 10),
      })),
      patientsByCity: patientsByCity.rows.map((row) => ({
        ...row,
        patient_count: parseInt(row.patient_count, 10),
      })),
      specialtiesByRequest: specialtiesByRequest.rows.map((row) => ({
        ...row,
        patient_count: parseInt(row.patient_count, 10),
      })),
      recentPatients: recentPatients.rows,
    }
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error.message)
    throw createError('INTERNAL_SERVER_ERROR', 'Failed to fetch dashboard stats')
  }
}

export const DashboardModel = {
  getDashboardStats,
}
