import { NextRequest, NextResponse } from "next/server"
import { handleCustomerSlicerRequest } from "@/lib/customer-slicer"
import { uploadToR2 } from "@/lib/r2-storage"
import { randomUUID } from "node:crypto"

const SLICER_URL = (process.env.SLICER_SERVICE_URL || "http://localhost:3001").replace(/\/+$/, "")

export async function POST(request: NextRequest) {
    return handleCustomerSlicerRequest(
        request,
        {
            fetcher: fetch,
            uploadToStorage: uploadToR2,
            randomId: randomUUID,
        },
        { slicerUrl: SLICER_URL }
    )
}

export async function GET() {
    try {
        const response = await fetch(`${SLICER_URL}/health`)
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { status: "error", message: "Slicer service unavailable" },
            { status: 503 }
        )
    }
}
