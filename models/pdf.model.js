import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import axios from 'axios'

const generateMedicalHistoryPDF = async ({ patient_id, user_id, outputPath }) => {
  // 1. Obtener el professional_id a partir del user_id
  const profQuery = {
    text: `SELECT id, user_id FROM professional WHERE user_id = $1`,
    values: [user_id],
  }
  const { rows: profRows } = await db.query(profQuery)
  if (!profRows || !profRows[0]) throw createError('PROFESSIONAL_NOT_FOUND')
  const professional_id = profRows[0].id

  // 2. Obtener los registros médicos del paciente con ese profesional
  const query = {
    text: `
      SELECT mr.*, 
             p.id AS patient_id, up.first_name AS patient_first_name, up.last_name AS patient_last_name,
             prof.id AS professional_id, u.first_name AS professional_first_name, u.last_name AS professional_last_name
      FROM medical_record mr
      JOIN patient p ON mr.patient_id = p.id
      JOIN users up ON p.user_id = up.id
      JOIN professional prof ON mr.professional_id = prof.id
      JOIN users u ON prof.user_id = u.id
      WHERE mr.patient_id = $1 AND mr.professional_id = $2
      ORDER BY mr.created_at ASC
    `,
    values: [patient_id, professional_id],
  }
  const { rows } = await db.query(query)
  if (!rows.length) throw createError('NO_MEDICAL_RECORDS_FOUND')

  // 3. Crear PDF
  const doc = new PDFDocument({ margin: 50 })
  const stream = fs.createWriteStream(outputPath)
  doc.pipe(stream)

  // Paleta de colores
  const navyBlue = '#002855'
  const skyBlue = '#87CEEB'
  const white = '#FFFFFF'

  // Logo y mensaje
  const logoPath = path.join(process.cwd(), 'src', 'image', '1.png')
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 20, { width: 80 })
  }
  doc
    .fillColor(navyBlue)
    .fontSize(12)
    .text(
      'Every appointment is an opportunity to change a life. This panel will help you do it with love and excellence.',
      150,
      40,
      { align: 'right', width: doc.page.width - 200 },
    )

  // Título centrado
  doc
    .moveDown(2)
    .fontSize(24)
    .fillColor(navyBlue)
    .text('Historial Médico', { align: 'center', underline: true })
  doc.moveDown(1.5)

  // Datos del paciente y profesional
  doc
    .fontSize(17)
    .fillColor('#000')
    .text(`Paciente: ${rows[0].patient_first_name} ${rows[0].patient_last_name}`, 50, undefined, {
      continued: true,
    })
  doc.moveDown(2)

  // Líneas divisorias estilizadas
  const drawLine = () => {
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor(skyBlue)
      .lineWidth(1.5)
      .stroke()
  }
  drawLine()
  doc.moveDown(1)
  doc.text('')
  for (const [idx, record] of rows.entries()) {
    const circleSize = 20
    const circleX = 60
    const filaTop = doc.y // Punto superior inicial del registro

    // Calcula el centro vertical del círculo basándose en filaTop
    const circleY = filaTop + circleSize / 2

    // Dibuja el círculo
    doc.circle(circleX, circleY, circleSize / 2).fillAndStroke(skyBlue, navyBlue)

    // Dibuja el número centrado en el círculo
    const numberStr = String(idx + 1)
    const fontSize = 12
    doc.fontSize(fontSize).fillColor('white')

    // Calcula el ancho y la altura del número
    const numberWidth = doc.widthOfString(numberStr)
    const numberHeight = doc.currentLineHeight()

    // Ajusta las coordenadas para centrar el número en el círculo
    doc.text(
      numberStr,
      circleX - numberWidth / 2, // Centrado horizontal
      circleY - numberHeight / 2, // Centrado vertical
    )

    // Fuerza el cursor a la parte superior del registro
    doc.y = filaTop

    // Dibuja el texto alineado a la derecha del círculo
    doc
      .fontSize(13)
      .fillColor(navyBlue)
      .text(`Registro #${idx + 1}`, 90, filaTop, { underline: true })
    doc.fontSize(11).fillColor('#000')

    // Palabra "Fecha:" en negrita, luego la fecha normal
    doc.font('Helvetica-Bold').text('Fecha:', 90, undefined, { continued: true })
    doc.font('Helvetica').text(` ${new Date(record.created_at).toLocaleString()}`)

    // Salto de línea antes de "Notas:"
    doc.moveDown(0.5)

    // Palabra "Notas:" en negrita, luego el texto normal
    doc.font('Helvetica-Bold').text('Notas:', 90, undefined, { continued: true })
    doc.font('Helvetica').text(` ${record.general_notes || 'Sin notas'}`)
    // Asegura que el cursor baje al menos el alto del círculo para el siguiente registro
    doc.y = Math.max(doc.y, filaTop + circleSize + 5)

    // Imagen asociada al registro (si existe)
    if (record.image) {
      if (record.image.startsWith('http')) {
        // Si es una URL remota, descargar la imagen y pasar el buffer
        try {
          const response = await axios.get(record.image, { responseType: 'arraybuffer' })
          const imgBuffer = Buffer.from(response.data, 'binary')
          doc.moveDown(0.5)
          doc.image(imgBuffer, { width: 100, align: 'left', height: 100 })
          doc.moveDown(0.5)
        } catch (e) {
          doc.text('Imagen no encontrada o inaccesible.', { italic: true })
        }
      } else {
        // Si es ruta local
        const imagePath = path.isAbsolute(record.image)
          ? record.image
          : path.join(process.cwd(), record.image)
        if (fs.existsSync(imagePath)) {
          doc.moveDown(0.5)
          doc.image(imagePath, { width: 180, align: 'left' })
          doc.moveDown(0.5)
        } else {
          doc.text('Imagen no encontrada.', { italic: true })
        }
      }
    }

    // Línea divisoria entre registros
    doc.moveDown(1)
    drawLine()
    doc.moveDown(1)
  }
  doc.text('')
  // Pie de página con firma y sello
  const sealPath = path.join(process.cwd(), 'src', 'image', 'CERTIFICADO MÉDICO.png')
  const sealWidth = 110
  // Línea para la firma
  const lineWidth = 150
  const lineX = (doc.page.width - lineWidth) / 2
  const signatureLineY = doc.page.height - 100

  doc
    .moveTo(lineX, signatureLineY + 15) // Línea para firma ligeramente más arriba
    .lineTo(lineX + lineWidth, signatureLineY + 15)
    .strokeColor('#000')
    .lineWidth(1)
    .stroke()

  // Nombre del profesional debajo de la línea
  doc
    .fontSize(12)
    .fillColor('#000')
    .text('Professional de la salud:', lineX, signatureLineY + 20, {
      align: 'center',
      width: lineWidth,
    })
  doc
    .fontSize(12)
    .fillColor('#000')
    .text(
      rows[0].professional_first_name + ' ' + rows[0].professional_last_name,
      lineX,
      doc.y + 2, // Un poco más abajo del texto anterior
      { align: 'center', width: lineWidth },
    )

  // Sello médico
  if (fs.existsSync(sealPath)) {
    const sealX = doc.page.width / 2 + lineWidth / 2 + 20 // A la derecha de la firma
    doc.image(sealPath, sealX, signatureLineY - 20, { width: sealWidth })
  }
  doc.end()

  // Esperar a que el PDF termine de escribirse antes de continuar
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

const getPatientsByLoggedUser = async (user_id) => {
  // 1. Obtener el professional_id a partir del user_id
  const profQuery = {
    text: `SELECT id FROM professional WHERE user_id = $1`,
    values: [user_id],
  }
  const { rows: profRows } = await db.query(profQuery)
  if (!profRows || !profRows[0]) throw createError('PROFESSIONAL_NOT_FOUND')
  const professional_id = profRows[0].id

  // 2. Obtener los patient_id únicos de las citas de ese profesional, con nombre completo
  const patientQuery = {
    text: `
      SELECT DISTINCT p.id, CONCAT(u.first_name, ' ', u.last_name) AS full_name
      FROM appointment a
      JOIN patient p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.professional_id = $1
    `,
    values: [professional_id],
  }
  const { rows: patientRows } = await db.query(patientQuery)
  return patientRows // Array de pacientes con full_name
}
export const PdfModel = {
  generateMedicalHistoryPDF,
  getPatientsByLoggedUser,
}
