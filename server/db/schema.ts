import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Converter should write convertedAt, limit, and a JSON counts object. */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value')
})
