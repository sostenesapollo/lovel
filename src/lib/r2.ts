import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function storagePublicBaseUrl() {
  return (
    process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL?.replace(/\/$/, "") ||
    ""
  );
}

export function createR2Client() {
  const { STORAGE_ACCESS_KEY, STORAGE_SECRET, STORAGE_REGION, STORAGE_ENDPOINT } =
    process.env;
  if (!STORAGE_ACCESS_KEY || !STORAGE_SECRET || !STORAGE_ENDPOINT) {
    throw new Error("R2 não configurado (STORAGE_* env vars)");
  }
  return new S3Client({
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY,
      secretAccessKey: STORAGE_SECRET,
    },
    region: STORAGE_REGION || "auto",
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function isR2Configured() {
  return Boolean(
    process.env.STORAGE_ACCESS_KEY &&
      process.env.STORAGE_SECRET &&
      process.env.STORAGE_ENDPOINT &&
      process.env.STORAGE_BUCKET,
  );
}

function extFromMime(contentType: string, filename: string) {
  const fromMime = MIME_TO_EXT[contentType.toLowerCase()];
  if (fromMime) return fromMime;
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export async function presignProductUpload(input: {
  filename: string;
  contentType: string;
}) {
  const bucket = process.env.STORAGE_BUCKET!;
  const ext = extFromMime(input.contentType, input.filename);
  const key = `products/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const client = createR2Client();

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: 3600 },
  );

  const publicBase = storagePublicBaseUrl();
  const publicUrl = publicBase ? `${publicBase}/${key}` : key;

  return { uploadUrl, key, publicUrl };
}

export async function uploadBufferToR2(input: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const client = createR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  const publicBase = storagePublicBaseUrl();
  return publicBase ? `${publicBase}/${input.key}` : input.key;
}

export async function deleteR2Object(key: string) {
  const client = createR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
    }),
  );
}

export async function getR2ObjectBuffer(key: string) {
  const client = createR2Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
    }),
  );
  const bytes = await res.Body?.transformToByteArray();
  return bytes ? Buffer.from(bytes) : null;
}
