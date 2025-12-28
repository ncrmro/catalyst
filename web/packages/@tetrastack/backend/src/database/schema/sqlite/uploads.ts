import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { uuidv7 } from '../../../utils/uuidv7';

export const uploads = sqliteTable('uploads', {
  id: text('id')
    .notNull()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  key: text('key').notNull().unique(), // S3/R2 object key
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(), // in bytes
  entityId: text('entity_id'), // Optional: ID of the entity this upload belongs to
  entityType: text('entity_type'), // Optional: Type of the entity (e.g., 'user', 'product')
  url: text('url'), // Optional: Public URL if available
  metadata: text('metadata', { mode: 'json' }), // Optional: JSON blob for additional metadata
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'), // Soft delete
});
