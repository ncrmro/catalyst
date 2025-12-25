import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './client';
import { uuidv7 } from '../utils/uuidv7';
import { eq } from 'drizzle-orm';

interface CreatePresignedUploadOptions {
  filename: string;
  contentType: string;
  maxSizeBytes: number;
  expiresIn: number; // in seconds
  entityId?: string;
  entityType?: string;
}

interface GetSignedUrlOptions {
  expiresIn: number; // in seconds
}

interface ListObjectsOptions {
  prefix?: string;
}

/** Database interface for upload operations - supports any Drizzle database */
interface UploadsDatabase {
  insert: (table: UploadsTableLike) => {
    values: (data: UploadInsertData) => Promise<unknown>;
  };
  delete: (table: UploadsTableLike) => {
    where: (condition: ReturnType<typeof eq>) => Promise<unknown>;
  };
}

/** Minimal table interface - actual Drizzle table types are too complex for union typing */
interface UploadsTableLike {
  key: Parameters<typeof eq>[0];
}

/** Data structure for inserting upload records */
interface UploadInsertData {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  entityId?: string;
  entityType?: string;
  url?: string;
}

export const createUploads = (
  db: UploadsDatabase,
  uploadsTable: UploadsTableLike,
) => ({
  createPresignedUpload: async ({
    filename,
    contentType,
    maxSizeBytes,
    expiresIn,
    entityId,
    entityType,
  }: CreatePresignedUploadOptions) => {
    const fileExtension = filename.split('.').pop();
    const key = `uploads/${entityType || 'misc'}/${entityId || 'anonymous'}/${uuidv7()}.${fileExtension}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: maxSizeBytes, // This is for client-side validation, actual file size can be smaller
    });

    const url = await getSignedUrl(r2Client, putObjectCommand, { expiresIn });

    // Store metadata in database
    await db.insert(uploadsTable).values({
      id: uuidv7(),
      key,
      filename,
      contentType,
      size: maxSizeBytes, // Initial size, will be updated on actual upload success if needed
      entityId,
      entityType,
      url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : undefined,
    });

    return { url, key };
  },

  getSignedDownloadUrl: async (
    key: string,
    { expiresIn }: GetSignedUrlOptions,
  ) => {
    const getObjectCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    return getSignedUrl(r2Client, getObjectCommand, { expiresIn });
  },

  deleteObject: async (key: string) => {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      }),
    );
    await db.delete(uploadsTable).where(eq(uploadsTable.key, key));
  },

  listObjects: async ({ prefix }: ListObjectsOptions) => {
    const { Contents } = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
      }),
    );

    return Contents?.map((obj) => obj.Key) || [];
  },
});
