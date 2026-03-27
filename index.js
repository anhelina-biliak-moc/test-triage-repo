const { kysely } = require('kysely')
const db = new kysely({
  dialect: new PostgresDialect()
})