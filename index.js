import { kysely } from 'kysely'
const db = new kysely({
  dialect: new PostgresDialect()
})