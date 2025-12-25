import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../../utils/uuidv7';

export const uploads = pgTable('uploads', {
  id: uuid('id')
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
  metadata: jsonb('metadata'), // Optional: JSON blob for additional metadata (using native PostgreSQL jsonb)
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }), // Soft delete
});
