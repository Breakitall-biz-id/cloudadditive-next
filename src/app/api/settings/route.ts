import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Default settings jika belum ada di database
const DEFAULT_SETTINGS = {
    id: "default",
    markupPercentage: 0.15,
    platformFeePercentage: 0.10,
    machineRatePerHour: 10000,
    estimatedPrintSpeed: 15000,
    defaultInfillPercentage: 0.20,
}

export async function GET() {
    try {
        // Get or create default settings
        let settings = await prisma.systemSettings.findUnique({
            where: { id: "default" },
        })

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: DEFAULT_SETTINGS,
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error("Get settings error:", error)
        return NextResponse.json(DEFAULT_SETTINGS)
    }
}
