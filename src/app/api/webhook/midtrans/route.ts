import { NextRequest, NextResponse } from "next/server";
import { processMidtransWebhook } from "@/lib/midtrans-webhook";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await processMidtransWebhook(body, "api/webhook/midtrans");
        return NextResponse.json(result.body, { status: result.status });
    } catch (error) {
        console.error("[MidtransWebhook:api/webhook/midtrans] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
