import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const isProduction = process.env.NODE_ENV === 'production'

const connectionString = isProduction
  ? process.env.DATABASE_URL_REMOTE
  : process.env.DATABASE_URL_LOCAL

console.log('📦 Usando base de datos:', connectionString)

export const db = new Pool({
  allowExitOnIdle: true,
  connectionString,
  // Agregamos la configuración de SSL condicional
  ssl: isProduction ? { rejectUnauthorized: false } : false,
})

try {
  await db.query('SELECT NOW()')
  console.log('✅ Database connected successfully')
} catch (error) {
  console.error('❌ Database connection failed', error)
}
