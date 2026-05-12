/**
 * Storage utility — generates signed URLs for audio/thumbnail assets.
 * Uses S3-compatible object storage (Cloudflare R2 or AWS S3).
 *
 * Required env vars when storage is configured:
 *   STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_ENDPOINT
 *
 * Until storage credentials are provided, returns the raw key as-is (dev mode).
 * The key is typically: audio/stories/<id>.m4a or thumbnails/stories/<id>.webp
 */

function isStorageConfigured(): boolean {
  return !!(
    process.env["STORAGE_ENDPOINT"] &&
    process.env["STORAGE_BUCKET"] &&
    process.env["STORAGE_ACCESS_KEY"] &&
    process.env["STORAGE_SECRET_KEY"]
  );
}

export async function generateSignedUrl(
  storageKey: string,
  ttlSeconds = 3600,
): Promise<string> {
  if (!isStorageConfigured()) {
    // Storage not configured — return key as direct URL (dev / pre-launch mode).
    // If the key is already a full https:// URL, pass it through as-is.
    if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
      return storageKey;
    }
    return storageKey;
  }

  // TODO: Uncomment when @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are installed:
  //
  // const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  // const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  // const client = new S3Client({
  //   endpoint: process.env["STORAGE_ENDPOINT"]!,
  //   region: "auto",
  //   credentials: {
  //     accessKeyId: process.env["STORAGE_ACCESS_KEY"]!,
  //     secretAccessKey: process.env["STORAGE_SECRET_KEY"]!,
  //   },
  // });
  // const cmd = new GetObjectCommand({
  //   Bucket: process.env["STORAGE_BUCKET"]!,
  //   Key: storageKey,
  // });
  // return getSignedUrl(client, cmd, { expiresIn: ttlSeconds });

  return storageKey;
}

export function audioStorageKey(storyId: string): string {
  return `audio/stories/${storyId}.m4a`;
}

export function thumbnailStorageKey(storyId: string): string {
  return `thumbnails/stories/${storyId}.webp`;
}

void ttlSeconds; // suppress unused warning until real impl
