import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

// Si NODE_ENV = production → usa la remota, si no → la local
const connectionString =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL_REMOTE
    : process.env.DATABASE_URL_LOCAL

console.log('📦 Usando base de datos:', connectionString)

export const db = new Pool({
  allowExitOnIdle: true,
  connectionString,
})

try {
  await db.query('SELECT NOW()')
  console.log('Database connected successfully')
} catch (error) {
  console.error('Database connection failed', error)
}
