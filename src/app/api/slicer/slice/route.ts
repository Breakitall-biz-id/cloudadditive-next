import { NextRequest, NextResponse } from "next/server"

const SLICER_URL = process.env.SLICER_SERVICE_URL || "http://localhost:3001"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const stlFile = formData.get("stl") as File
        const material = formData.get("material") as string || "pla"
        const quality = formData.get("quality") as string || "normal"
        const infill = formData.get("infill") as string || "0.20"

        if (!stlFile) {
            return NextResponse.json(
                { success: false, error: "No STL file provided" },
                { status: 400 }
            )
        }

        console.log(`[Slicer] Slicing file: ${stlFile.name}, size: ${stlFile.size}, material: ${material}, quality: ${quality}`)

        // Convert File to Blob for FormData
        const arrayBuffer = await stlFile.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: stlFile.type || 'application/octet-stream' })

        // Forward to slicer service
        const slicerFormData = new FormData()
        slicerFormData.append("stl", blob, stlFile.name)
        slicerFormData.append("material", material)
        slicerFormData.append("quality", quality)
        slicerFormData.append("infill", infill)
        slicerFormData.append("printerProfile", "generic_fdm")

        const response = await fetch(`${SLICER_URL}/slice`, {
            method: "POST",
            body: slicerFormData,
        })

        // Get response as text first to handle non-JSON errors
        const responseText = await response.text()
        console.log(`[Slicer] Response status: ${response.status}, body:`, responseText.substring(0, 200))

        // Try to parse as JSON
        let result
        try {
            result = JSON.parse(responseText)
        } catch {
            console.error("[Slicer] Non-JSON response:", responseText.substring(0, 500))
            return NextResponse.json(
                { success: false, error: "Slicer returned invalid response" },
                { status: 500 }
            )
        }

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: result.error || "Slicing failed" },
                { status: response.status }
            )
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("[Slicer] Proxy error:", error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to connect to slicer service" },
            { status: 500 }
        )
    }
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
