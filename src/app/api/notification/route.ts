import { NextRequest, NextResponse } from "next/server";
import { processMidtransWebhook } from "@/lib/midtrans-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await processMidtransWebhook(body, "api/notification");
        return NextResponse.json(result.body, { status: result.status });
    } catch (error) {
        console.error("[MidtransWebhook:api/notification] Error:", error);
        return NextResponse.json(
            { error: "Failed to process notification" },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: "Webhook endpoint active" });
}
