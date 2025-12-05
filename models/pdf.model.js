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

  // ---------------------
  // ⚠️ NUEVO: función para header repetido
  // ---------------------
  const addHeader = (doc) => {
    const navyBlue = '#002855'
    const logoPath = path.join(process.cwd(), 'src', 'image', '6.png')

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 20, { width: 150 })
    }

    doc
      .fillColor(navyBlue)
      .fontSize(14)
      .text(
        'Transformar vidas comienza con una atención de calidad, brindada con compromiso y empatía.',
        150,
        40,
        { align: 'right', width: doc.page.width - 200 },
      )

    doc.moveDown(5)
  }

  // ⚠️ NUEVO: evitar distorsión en saltos de página
  const ensureSpace = (doc, neededHeight = 150) => {
    const bottomMargin = 60
    if (doc.y + neededHeight > doc.page.height - bottomMargin) {
      doc.addPage()
    }
  }

  // 3. Crear PDF
  const doc = new PDFDocument({ margin: 50 })
  const stream = fs.createWriteStream(outputPath)
  doc.pipe(stream)

  // ⚠️ NUEVO: cada vez que se agregue página → agregar header
  doc.on('pageAdded', () => addHeader(doc))

  // Dibujar header en primera página
  addHeader(doc)

  // Paleta de colores
  const navyBlue = '#002855'
  const skyBlue = '#87CEEB'
  const white = '#FFFFFF'

  // Título centrado
  doc
    .moveDown(2)
    .fontSize(24)
    .fillColor(navyBlue)
    .text('Historial Médico', 51, doc.y, { align: 'center', underline: true })
  doc.moveDown(1.5)

  const label = 'Paciente:'
  const labelX = 50
  const labelY = doc.y

  doc.fontSize(17).fillColor('#002855').text(label, labelX, labelY)

  const labelWidth = doc.widthOfString(label)
  const spacing = 6

  const nameText = `${rows[0].patient_first_name} ${rows[0].patient_last_name}`
  const nameFontSize = 17
  doc.fontSize(nameFontSize)
  const nameWidth = doc.widthOfString(nameText)
  const nameHeight = doc.currentLineHeight()

  const nameX = labelX + labelWidth + spacing
  const nameY = labelY - 2

  doc.save()
  doc.rect(nameX, nameY, nameWidth + 8, nameHeight + 4).fill('#E5F1FF')
  doc.restore()

  doc.fillColor('#000').text(nameText, nameX + 4, nameY + 2)

  doc.moveDown(2)
  doc.text('')

  // Recorrer registros
  for (const [idx, record] of rows.entries()) {
    ensureSpace(doc, 180)

    const circleSize = 20
    const circleX = 60
    const filaTop = doc.y

    const circleY = filaTop + circleSize / 2

    doc.circle(circleX, circleY, circleSize / 2).fillAndStroke(skyBlue, navyBlue)

    const numberStr = String(idx + 1)
    doc.fontSize(12).fillColor('white')

    const numberWidth = doc.widthOfString(numberStr)
    const numberHeight = doc.currentLineHeight()

    doc.text(numberStr, circleX - numberWidth / 2, circleY - numberHeight / 2)

    doc.y = filaTop

    doc
      .fontSize(14)
      .fillColor(navyBlue)
      .text(`Registro #${idx + 1}`, 90, filaTop, { underline: true })
    doc.fontSize(11).fillColor('#000')
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').text('Fecha:', 90, undefined, { continued: true })
    doc.font('Helvetica').text(` ${new Date(record.created_at).toLocaleString()}`)

    doc.moveDown(0.5)

    doc.font('Helvetica-Bold').text('Notas:', 90, undefined, { continued: true })
    doc.font('Helvetica').text(` ${record.general_notes || 'Sin notas'}`)

    doc.y = Math.max(doc.y, filaTop + circleSize + 5)

    // Imagen asociada
    if (record.image) {
      ensureSpace(doc, 160)
      if (record.image.startsWith('http')) {
        try {
          const response = await axios.get(record.image, { responseType: 'arraybuffer' })
          const imgBuffer = Buffer.from(response.data, 'binary')
          doc.moveDown(0.5)
          doc.image(imgBuffer, { width: 100, height: 100 })
          doc.moveDown(0.5)
        } catch (e) {
          doc.text('Imagen no encontrada o inaccesible.', { italic: true })
        }
      } else {
        const imagePath = path.isAbsolute(record.image)
          ? record.image
          : path.join(process.cwd(), record.image)
        if (fs.existsSync(imagePath)) {
          doc.moveDown(0.5)
          doc.image(imagePath, { width: 180 })
          doc.moveDown(0.5)
        } else {
          doc.text('Imagen no encontrada.', { italic: true })
        }
      }
    }

    doc.moveDown(1)

    doc.moveDown(1)
  }

  doc.text('')

  // Pie de página
  const sealPath = path.join(process.cwd(), 'src', 'image', 'CERTIFICADO MÉDICO.png')
  const sealWidth = 110
  const lineWidth = 150
  const lineX = (doc.page.width - lineWidth) / 2
  const signatureLineY = doc.page.height - 100

  doc
    .moveTo(lineX, signatureLineY + 15)
    .lineTo(lineX + lineWidth, signatureLineY + 15)
    .strokeColor('#000')
    .lineWidth(1)
    .stroke()

  doc
    .fontSize(12)
    .fillColor('#002855')
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
      doc.y + 2,
      { align: 'center', width: lineWidth },
    )

  if (fs.existsSync(sealPath)) {
    const sealX = doc.page.width / 2 + lineWidth / 2 + 20
    doc.image(sealPath, sealX, signatureLineY - 20, { width: sealWidth })
  }

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

const getPatientsByLoggedUser = async (user_id) => {
  const profQuery = {
    text: `SELECT id FROM professional WHERE user_id = $1`,
    values: [user_id],
  }
  const { rows: profRows } = await db.query(profQuery)
  if (!profRows || !profRows[0]) throw createError('PROFESSIONAL_NOT_FOUND')
  const professional_id = profRows[0].id

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
  return patientRows
}

export const PdfModel = {
  generateMedicalHistoryPDF,
  getPatientsByLoggedUser,
}
