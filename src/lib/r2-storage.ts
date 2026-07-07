import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize R2 client (S3-compatible)
const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "cloudprint-files";

// Public URL domain (if you set up a custom domain or R2.dev subdomain)
const PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL || "";

/**
 * Upload a file to R2
 */
export async function uploadToR2(
    fileBuffer: Buffer,
    key: string,
    contentType: string = "application/octet-stream"
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await R2.send(command);

        // Generate URL
        const url = PUBLIC_URL_BASE
            ? `${PUBLIC_URL_BASE}/${key}`
            : `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

        console.log(`[R2] Uploaded file: ${key}`);

        return {
            success: true,
            url,
            key,
        };
    } catch (error) {
        console.error("[R2] Upload error:", error);
        return {
            success: false,
            url: "",
            key,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
}

/**
 * Upload a file from base64 data URL
 */
export async function uploadBase64ToR2(
    dataUrl: string,
    key: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    try {
        // Parse base64 data URL
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            return { success: false, url: "", key, error: "Invalid data URL format" };
        }

        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        return uploadToR2(buffer, key, contentType);
    } catch (error) {
        console.error("[R2] Base64 upload error:", error);
        return {
            success: false,
            url: "",
            key,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
}

/**
 * Upload G-code file for an order
 */
export async function uploadGcodeToR2(
    gcodeContent: string | Buffer,
    orderId: string,
    filename: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    const key = `gcode/${orderId}/${filename}`;
    const buffer = typeof gcodeContent === "string"
        ? Buffer.from(gcodeContent)
        : gcodeContent;

    return uploadToR2(buffer, key, "text/x-gcode");
}

/**
 * Upload STL file for an order
 */
export async function uploadSTLToR2(
    stlContent: Buffer,
    orderId: string,
    filename: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
    const key = `stl/${orderId}/${filename}`;
    return uploadToR2(stlContent, key, "model/stl");
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(R2, command, { expiresIn: expiresInSeconds });
}

/**
 * Resolve a download URL (generate presigned URL if it's an R2 private URL)
 */
export async function resolveDownloadUrl(url: string, expiresInSeconds: number = 3600): Promise<string> {
    // 1. If it's a Data URL, return as is
    if (url.startsWith("data:")) {
        return url;
    }

    // 2. If it's a Public URL (Custom Domain or R2.dev), return as is
    // Assuming PUBLIC_URL_BASE is set if the bucket is public
    if (PUBLIC_URL_BASE && url.startsWith(PUBLIC_URL_BASE)) {
        return url;
    }

    // 3. If it looks like a direct R2 URL (which is private by default), try to sign it
    const defaultR2Domain = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    if (url.includes(defaultR2Domain)) {
        try {
            // Extract key from URL
            // Format: https://bucket.account.r2.cloudflarestorage.com/KEY
            const urlObj = new URL(url);
            const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;

            if (key) {
                console.log(`[R2] Generating signed URL for key: ${key}`);
                return getSignedDownloadUrl(key, expiresInSeconds);
            }
        } catch (e) {
            console.error("[R2] Error resolving URL:", e);
        }
    }

    // Fallback: return original URL
    return url;
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await R2.send(command);
        console.log(`[R2] Deleted file: ${key}`);
        return true;
    } catch (error) {
        console.error("[R2] Delete error:", error);
        return false;
    }
}

/**
 * Generate a unique key for a file
 */
export function generateFileKey(
    type: "stl" | "gcode" | "print-photo",
    orderId: string,
    filename: string
): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${type}/${orderId}/${timestamp}-${sanitizedFilename}`;
}
