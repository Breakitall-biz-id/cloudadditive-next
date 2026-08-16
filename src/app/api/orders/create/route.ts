import { NextResponse } from "next/server";
import { createOrderDirect } from "@/actions/create-order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createOrderDirect(payload);
    const status = result.success ? 200 : result.error === "Unauthorized" ? 401 : 400;

    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("[Orders API] Create order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gagal membuat order",
      },
      { status: 500 }
    );
  }
}
