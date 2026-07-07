import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2, generateFileKey } from "@/lib/r2-storage";

export const runtime = "nodejs";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const orderId = formData.get("orderId") as string | null;
        const fileType = (formData.get("type") as "stl" | "gcode" | "print-photo") || "stl";

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: "File too large. Maximum size is 50MB" },
                { status: 400 }
            );
        }

        // Generate unique key
        const key = generateFileKey(
            fileType,
            orderId || session.user.id,
            file.name
        );

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const result = await uploadToR2(buffer, key, file.type || "application/octet-stream");

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: result.url,
            key: result.key,
            filename: file.name,
            size: file.size,
        });

    } catch (error) {
        console.error("[Upload API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Upload failed" },
            { status: 500 }
        );
    }
}
