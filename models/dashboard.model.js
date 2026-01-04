import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'

const getDashboardStats = async (user_id, role) => {
  try {
    let professional_id = null

    // Obtener professional_id si es rol profesional
    if (role === 3) {
      const result = await db.query(`SELECT id FROM professional WHERE user_id = $1`, [user_id])
      professional_id = result.rows[0]?.id || null
    }

    const profCondition = professional_id ? `AND a.professional_id = ${professional_id}` : ``

    // 1. Pacientes atendidos último mes
    const attendedPatients = await db.query(`
      SELECT COUNT(*) AS attended_patients
      FROM appointment a
      WHERE a.status = 'completed'
        ${profCondition}
        AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') >= date_trunc('month', (NOW() AT TIME ZONE 'America/Caracas') - INTERVAL '1 month')
        AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') < date_trunc('month', NOW() AT TIME ZONE 'America/Caracas');
    `)

    // 2. Nuevos pacientes esta semana
    const newPatients = await db.query(`
      SELECT COUNT(DISTINCT patient_id) AS new_patients
      FROM appointment a
      WHERE a.status = 'confirmed'
        ${profCondition}
        AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') >= DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Caracas');
    `)

    // --- CAMBIOS PARA PROFESSIONAL ---
    let topSpecialty = null
    let appointmentsByWeekday = []
    let patientsNewVsReturning = []
    let todayAppointments = null

    if (role === 3) {
      // CARD — Citas programadas para hoy
      const today = await db.query(
        `
        SELECT COUNT(*) AS today_appointments
        FROM appointment a
        WHERE a.status = 'confirmed'
        ${profCondition}
        AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas')
            >= date_trunc('day', NOW() AT TIME ZONE 'America/Caracas')
        AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas')
            < date_trunc('day', NOW() AT TIME ZONE 'America/Caracas') + INTERVAL '1 day';

      `,
      )

      todayAppointments = parseInt(today.rows[0].today_appointments || 0)

      // GRÁFICO DE BARRAS — Citas por día de la semana
      const weekData = await db.query(`
        SELECT
            wd.day_name,
            -- Contar solo las citas con status 'confirmed'
            COALESCE(SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed_count,
            -- Contar solo las citas con status 'completed'
            COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_count
        FROM (
            -- 1. Creamos una tabla temporal de DOWs (1=Monday a 6=Saturday)
            VALUES (1), (2), (3), (4), (5), (6)
        ) AS w(day_of_week_num)
        
        -- [Lógica para obtener el nombre del día se mantiene igual]
        CROSS JOIN LATERAL (
            SELECT (EXTRACT(DOW FROM date_trunc('week', NOW() AT TIME ZONE 'America/Caracas'))::int) AS start_dow_num,
                  date_trunc('week', NOW() AT TIME ZONE 'America/Caracas')::date AS start_date
        ) AS s
        CROSS JOIN LATERAL (
            SELECT TRIM(TO_CHAR(s.start_date + (w.day_of_week_num - s.start_dow_num) * INTERVAL '1 day', 'Day')) AS day_name
        ) AS wd
        
        -- 3. Hacemos LEFT JOIN con las citas
        LEFT JOIN appointment a ON 
            (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') >= date_trunc('week', NOW() AT TIME ZONE 'America/Caracas')
            AND (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') < date_trunc('week', NOW() AT TIME ZONE 'America/Caracas') + INTERVAL '7 days'
            AND EXTRACT(DOW FROM (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas')) = w.day_of_week_num
            -- El filtro global ahora incluye ambos estatus en la unión para optimización
            AND a.status IN ('confirmed', 'completed') 
            ${profCondition}
            
        GROUP BY w.day_of_week_num, wd.day_name
        ORDER BY w.day_of_week_num;
    `)

      // 4. Mapeo de datos en Node.js/JavaScript
      appointmentsByWeekday = weekData.rows.map((r) => ({
        day: r.day_name,
        // Ahora tenemos dos propiedades de conteo por día
        confirmed: parseInt(r.confirmed_count),
        completed: parseInt(r.completed_count),
      }))

      // DONA — Pacientes nuevos vs recurrentes
      const newReturning = await db.query(`
      SELECT type, COUNT(*) AS count
        FROM (
          SELECT
            a.patient_id,
            CASE
              WHEN COUNT(*) = 1 THEN 'new'
              ELSE 'recurrent'
            END AS type
          FROM appointment a
          WHERE 1 = 1
            ${profCondition}
          GROUP BY a.patient_id
        ) AS t
        GROUP BY type;
      `)

      patientsNewVsReturning = newReturning.rows.map((r) => ({
        type: r.type,
        count: parseInt(r.count),
      }))
    } else {
      // ADMIN mantiene su lógica normal
      const specialty = await db.query(`
        SELECT s.name AS specialty
        FROM appointment a
        JOIN professional_specialty ps ON ps.professional_id = a.professional_id
        JOIN specialty s ON s.id = ps.specialty_id
        WHERE s.id BETWEEN 1 AND 15
          ${profCondition}
        GROUP BY s.name
        ORDER BY COUNT(DISTINCT a.patient_id) DESC
        LIMIT 1;
      `)

      topSpecialty = specialty.rows[0] || null
    }

    // Resumen citas por mes (igual para ambos roles)
    const appointmentsByMonth = await db.query(`
      SELECT 
        TO_CHAR((a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas'), 'YYYY-MM') AS month,
        a.status,
        COUNT(*) AS count
      FROM appointment a
      WHERE 1=1
        ${profCondition}
      GROUP BY month, a.status
      ORDER BY month ASC;
    `)

    // Top profesionales (solo admin)
    const topProfessionals =
      role === 1
        ? await db.query(`
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
        `)
        : { rows: [] }

    // Pacientes por ciudad (solo admin)
    const patientsByCity =
      role === 1 || role === 3
        ? await db.query(`
        SELECT 
          c.name AS city,
          COUNT(a.id) AS patient_count
        FROM appointment a
        JOIN city c ON c.id = a.city_id
        WHERE 1=1
          ${profCondition}   -- si es profesional, filtra por su id
        GROUP BY c.name
        ORDER BY patient_count DESC;
      `)
        : { rows: [] }

    // Especialidades más solicitadas (solo admin)
    const specialtiesByRequest =
      role === 1
        ? await db.query(`
          SELECT 
            s.name AS specialty,
            COUNT(DISTINCT a.patient_id) AS patient_count
          FROM appointment a
          JOIN professional_specialty ps ON ps.professional_id = a.professional_id
          JOIN specialty s ON s.id = ps.specialty_id
          WHERE s.id BETWEEN 1 AND 15
          GROUP BY s.name
          ORDER BY patient_count DESC;
        `)
        : { rows: [] }

    // Pacientes recientes (ambos roles)
    const recentPatients = await db.query(`
      SELECT 
        CONCAT(u_p.first_name, ' ', u_p.last_name) AS patient,
        CONCAT(u_prof.first_name, ' ', u_prof.last_name) AS professional,
        c.name AS city,
        (a.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Caracas') AS scheduled_at,
        a.status
      FROM appointment a
      JOIN patient p ON p.id = a.patient_id
      JOIN users u_p ON u_p.id = p.user_id
      JOIN professional prof ON prof.id = a.professional_id
      JOIN users u_prof ON u_prof.id = prof.user_id
      JOIN city c ON c.id = a.city_id
      WHERE a.created_at >= NOW() - INTERVAL '7 days'
        ${profCondition}
      ORDER BY a.created_at DESC
      LIMIT 10;
    `)

    return {
      attendedPatients: parseInt(attendedPatients.rows[0]?.attended_patients || 0),
      newPatients: parseInt(newPatients.rows[0]?.new_patients || 0),

      // ADMIN → Especialidad más solicitada
      // PROFESSIONAL → Citas de hoy
      topSpecialty,
      todayAppointments,

      // ADMIN → Especialidades más solicitadas / Top profesionales
      // PROFESSIONAL → Citas por día / Nuevos vs recurrentes
      appointmentsByWeekday,
      patientsNewVsReturning,

      appointmentsByMonth: appointmentsByMonth.rows.map((r) => ({
        ...r,
        count: parseInt(r.count),
      })),

      topProfessionals: topProfessionals.rows.map((r) => ({
        ...r,
        patient_count: parseInt(r.patient_count),
      })),

      patientsByCity: patientsByCity.rows.map((r) => ({
        ...r,
        patient_count: parseInt(r.patient_count),
      })),

      specialtiesByRequest: specialtiesByRequest.rows.map((r) => ({
        ...r,
        patient_count: parseInt(r.patient_count),
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
