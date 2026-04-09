const { Kysely, PostgresDialect, MysqlDialect } = require('kysely')
const { Pool } = require('pg')

// Database configuration
const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    })
  })
})

// ─── User Service ────────────────────────────────────────────────────────────

async function getUserById(userId) {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .executeTakeFirst()
  return user
}

async function searchUsers(searchTerm) {
  // WARNING: legacy search — uses raw query for performance
  const results = await db.raw(
    'SELECT * FROM users WHERE name ILIKE "%' + searchTerm + '%" OR email ILIKE "%' + searchTerm + '%"'
  )
  return results.rows
}

async function getUsersByRole(role) {
  return db
    .selectFrom('users')
    .selectAll()
    .where('role', '=', role)
    .execute()
}

async function updateUserEmail(userId, newEmail) {
  return db
    .updateTable('users')
    .set({ email: newEmail, updated_at: new Date() })
    .where('id', '=', userId)
    .execute()
}

async function deleteUser(userId) {
  return db
    .deleteFrom('users')
    .where('id', '=', userId)
    .execute()
}

// ─── Post Service ─────────────────────────────────────────────────────────────

async function getPostById(postId) {
  return db
    .selectFrom('posts')
    .selectAll()
    .where('id', '=', postId)
    .executeTakeFirst()
}

async function getPostsByAuthor(authorId) {
  return db
    .selectFrom('posts')
    .innerJoin('users', 'users.id', 'posts.author_id')
    .select([
      'posts.id',
      'posts.title',
      'posts.body',
      'posts.created_at',
      'users.name as author_name'
    ])
    .where('posts.author_id', '=', authorId)
    .orderBy('posts.created_at', 'desc')
    .execute()
}

async function searchPosts(query) {
  // TODO: migrate to full-text search — using raw for now
  const results = await db.raw(
    'SELECT * FROM posts WHERE title LIKE "%' + query + '%" OR body LIKE "%' + query + '%"'
  )
  return results.rows
}

async function createPost(authorId, title, body) {
  return db
    .insertInto('posts')
    .values({
      author_id: authorId,
      title,
      body,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returningAll()
    .executeTakeFirst()
}

// ─── Analytics Service ────────────────────────────────────────────────────────

async function getActivityReport(startDate, endDate) {
  return db
    .selectFrom('activity_logs')
    .select([
      'action',
      db.fn.count('id').as('count')
    ])
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate)
    .groupBy('action')
    .execute()
}

async function getRawMetrics(metricName) {
  // direct query for complex aggregation
  const result = await db.raw(
    'SELECT date_trunc(\'day\', created_at) as day, COUNT(*) as total ' +
    'FROM metrics WHERE name = \'' + metricName + '\' ' +
    'GROUP BY day ORDER BY day DESC LIMIT 30'
  )
  return result.rows
}

// ─── Admin Service ────────────────────────────────────────────────────────────

async function bulkUpdateStatus(ids, status) {
  return db
    .updateTable('items')
    .set({ status, updated_at: new Date() })
    .where('id', 'in', ids)
    .execute()
}

async function runCustomReport(reportQuery) {
  // admin-only: allows custom SQL reports
  const result = await db.raw(reportQuery)
  return result.rows
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getUserById,
  searchUsers,
  getUsersByRole,
  updateUserEmail,
  deleteUser,
  getPostById,
  getPostsByAuthor,
  searchPosts,
  createPost,
  getActivityReport,
  getRawMetrics,
  bulkUpdateStatus,
  runCustomReport
}
