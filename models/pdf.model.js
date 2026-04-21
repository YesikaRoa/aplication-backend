import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { db } from '../database/connection.js'
import { createError } from '../utils/errors.js'
import axios from 'axios'
import sharp from 'sharp'

const generateMedicalHistoryPDF = async ({ patient_id, user_id, outputPath }) => {
  // Convertir patient_id a entero para evitar errores de tipo en la query
  const patientIdInt = parseInt(patient_id, 10)
  if (isNaN(patientIdInt)) throw createError('INVALID_ID')

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
    values: [patientIdInt, professional_id],
  }
  const { rows } = await db.query(query)
  if (!rows.length) throw createError('MEDICAL_RECORD_NOT_FOUND')

  // ---------------------
  // ⚠️ NUEVO: función para header repetido
  // ---------------------
  const addHeader = (doc) => {
    const navyBlue = '#002855'
    const logoPath = path.join(process.cwd(), 'src', 'image', 'Logo-mediPanel.png')

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 20, { width: 150 })
    }

    doc
      .fillColor(navyBlue)
      .fontSize(14)
      .text(
        'Transforming lives begins with quality care, delivered with dedication and empathy.',
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
      if (doc.y > 100) {
        doc.addPage()
      }
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
    .text('Medical History', 51, doc.y, { align: 'center', underline: true })
  doc.moveDown(1.5)

  const label = 'Patient:'
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
      .text(`Record #${idx + 1}`, 90, filaTop, { underline: true })
    doc.fontSize(10).fillColor('#444')
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').text('Date: ', 90, undefined, { continued: true })
    doc.font('Helvetica').text(`${new Date(record.created_at).toLocaleString()}`)

    const labelWidth = 110 // Fixed width for labels to align values

    // Helper to render a field with alignment
    const renderField = (label, value) => {
      if (value) {
        const textStr = String(value)
        doc.font('Helvetica').fontSize(10)
        const textWidth = doc.page.width - 150 - labelWidth
        const textHeight = doc.heightOfString(textStr, { width: textWidth, align: 'justify' })

        // Avoid orphaned labels by ensuring space for the whole block
        ensureSpace(doc, textHeight + 15)

        // Restaurar tamaño de fuente y color original en caso de que ensureSpace haya provocado
        // un page break (lo cual inyecta el Navy Blue grande del header de la página)
        doc.fontSize(10).fillColor('#333')

        if (doc.y > 100) {
          doc.moveDown(0.2)
        }

        const currentY = doc.y
        doc.font('Helvetica-Bold').text(`${label}:`, 90, currentY, { width: labelWidth })
        doc.font('Helvetica').text(textStr, 90 + labelWidth, currentY, {
          width: textWidth,
          align: 'justify',
        })

        // Espaciado extra al final de cada resultado para permitir respirar al campo
        doc.y += 6
      }
    }

    // Helper to render a section header
    const renderHeader = (title) => {
      ensureSpace(doc, 40)
      doc.moveDown(0.8)
      doc.font('Helvetica-Bold').fontSize(11).fillColor(navyBlue).text(title, 90)
      doc.y += 8
      doc.fontSize(10).fillColor('#333')
    }

    // --- Motivo y Síntomas ---
    if (record.reason_for_visit || record.current_illness_history || record.symptoms) {
      renderHeader('Reason for Visit & Symptoms')
      renderField('Reason', record.reason_for_visit)
      renderField('History', record.current_illness_history)
      renderField('Symptoms', record.symptoms)
      doc.y += 20
    }

    // --- Examen Físico y Signos Vitales ---
    const hasVitals =
      record.weight ||
      record.height ||
      record.body_mass_index ||
      record.blood_pressure ||
      record.heart_rate ||
      record.respiratory_rate ||
      record.temperature ||
      record.oxygen_saturation
    if (record.physical_exam || hasVitals) {
      renderHeader('Physical Exam & Vital Signs')
      renderField('Physical Exam', record.physical_exam)

      if (hasVitals) {
        doc.moveDown(0.3)
        const vitals = []
        if (record.weight) vitals.push(`Weight: ${record.weight} kg`)
        if (record.height) vitals.push(`Height: ${record.height} cm`)
        if (record.body_mass_index) vitals.push(`BMI: ${record.body_mass_index}`)
        if (record.blood_pressure) vitals.push(`B.P.: ${record.blood_pressure}`)
        if (record.heart_rate) vitals.push(`H.R.: ${record.heart_rate} bpm`)
        if (record.respiratory_rate) vitals.push(`R.R.: ${record.respiratory_rate} rpm`)
        if (record.temperature) vitals.push(`Temp: ${record.temperature} °C`)
        if (record.oxygen_saturation) vitals.push(`SpO2: ${record.oxygen_saturation}%`)
        doc.font('Helvetica').fontSize(9).text(vitals.join('  |  '), 90 + labelWidth)
      }
      doc.y += 20
    }

    // --- Diagnóstico ---
    if (record.diagnosis || record.differential_diagnosis) {
      renderHeader('Diagnosis')
      renderField('Diagnosis', record.diagnosis)
      renderField('Diff. Diagnosis', record.differential_diagnosis)
      doc.y += 20
    }
    doc.text('')
    // --- Tratamiento ---
    if (record.treatment || record.treatment_plan || record.medications_prescribed) {
      renderHeader('Treatment & Plan')
      renderField('Treatment', record.treatment)
      renderField('Plan', record.treatment_plan)
      renderField('Medications', record.medications_prescribed)
      doc.y += 20
    }
    doc.text('')
    // --- Estudios Solicitados ---
    if (
      record.laboratory_tests_requested ||
      record.imaging_tests_requested ||
      record.test_instructions
    ) {
      renderHeader('Requested Studies')
      renderField('Laboratory', record.laboratory_tests_requested)
      renderField('Imaging', record.imaging_tests_requested)
      renderField('Instructions', record.test_instructions)
      doc.y += 20
    }
    doc.text('')
    // --- Seguimiento y Notas ---
    renderHeader('Follow-up & Notes')
    if (record.follow_up_date) {
      renderField('Next Appoint.', new Date(record.follow_up_date).toLocaleDateString())
    }
    renderField('Evolution', record.evolution_notes)
    renderField('General Notes', record.general_notes || 'No notes')
    doc.y += 20
    doc.text('')
    // Espacio antes de la imagen para asegurar que no quede huérfana
    const contentEndY = doc.y
    doc.text('')
    // Imagen asociada
    if (record.image) {
      ensureSpace(doc, 120)
      doc.moveDown(0.5)
      try {
        let imgBuffer
        if (record.image.startsWith('http')) {
          const response = await axios.get(record.image, { responseType: 'arraybuffer' })
          imgBuffer = Buffer.from(response.data)
        } else {
          const imagePath = path.isAbsolute(record.image)
            ? record.image
            : path.join(process.cwd(), record.image)

          if (fs.existsSync(imagePath)) {
            imgBuffer = fs.readFileSync(imagePath)
          }
        }

        if (imgBuffer) {
          const convertedImgBuffer = await sharp(imgBuffer).png().toBuffer()
          // Establecer la posición 'x' fija a 90 para alinear con el texto.
          // Usar 'fit' para definir un ancho y alto máximo (ej. 250x250) sin distorsionar la imagen.
          doc.x = 90
          doc.image(convertedImgBuffer, {
            fit: [250, 250],
            align: 'left'
          })
        }
      } catch (e) {
        console.error('Error cargando imagen:', e.message)
        doc.fontSize(10).fillColor('#888').text('[Image not available]', 90)
      }
      doc.moveDown(1)
    }

    // Espacio al final del registro si no es el último (sin línea separadora)
    if (idx < rows.length - 1) {
      doc.moveDown(2)
    }

    doc.y = Math.max(doc.y, filaTop + circleSize + 10)
  }

  doc.text('')

  // Pie de página
  const sealPath = path.join(process.cwd(), 'src', 'image', 'Sello-mediPanel.png')
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
    .text('Healthcare professional:', lineX, signatureLineY + 20, {
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

  // Solo retorna pacientes que tienen al menos un medical_record con este profesional
  const patientQuery = {
    text: `
      SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS full_name
      FROM patient p
      JOIN users u ON p.user_id = u.id
      WHERE EXISTS (
        SELECT 1 FROM medical_record mr
        WHERE mr.patient_id = p.id AND mr.professional_id = $1
      )
      ORDER BY full_name ASC
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
