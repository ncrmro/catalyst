import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './client';
import { uuidv7 } from '../utils/uuidv7';
import { eq } from 'drizzle-orm';
export const createUploads = (db, uploadsTable) => ({
    createPresignedUpload: async ({ filename, contentType, maxSizeBytes, expiresIn, entityId, entityType, }) => {
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
    getSignedDownloadUrl: async (key, { expiresIn }) => {
        const getObjectCommand = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });
        return getSignedUrl(r2Client, getObjectCommand, { expiresIn });
    },
    deleteObject: async (key) => {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }));
        await db.delete(uploadsTable).where(eq(uploadsTable.key, key));
    },
    listObjects: async ({ prefix }) => {
        const { Contents } = await r2Client.send(new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: prefix,
        }));
        return Contents?.map((obj) => obj.Key) || [];
    },
});
