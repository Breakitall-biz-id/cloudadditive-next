import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculatePrinterScore, sortByScore } from "@/lib/printer-matching/scoring"
import type { PrinterCandidate, OrderForMatching, PrinterScore } from "@/lib/printer-matching/types"

/**
 * Pre-check API for finding best printer BEFORE order creation
 * Called in Step 3 (Delivery) to validate printer availability
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            materialId,
            modelWidth,
            modelHeight,
            modelDepth,
            customerLat,
            customerLng,
            estimatedPrintTime,
        } = body

        // Validate required fields
        if (!materialId) {
            return NextResponse.json(
                { success: false, error: "Material is required" },
                { status: 400 }
            )
        }
        if (!customerLat || !customerLng) {
            return NextResponse.json(
                { success: false, error: "Customer location is required" },
                { status: 400 }
            )
        }

        // Find all compatible printers
        const printers = await prisma.printer.findMany({
            where: {
                // Must support the selected material
                materials: {
                    some: { materialId: materialId },
                },
                // Must fit the model dimensions (if provided)
                ...(modelWidth && { buildWidth: { gte: modelWidth } }),
                ...(modelDepth && { buildDepth: { gte: modelDepth } }),
                ...(modelHeight && { buildHeight: { gte: modelHeight } }),
                // Provider must be verified
                provider: {
                    isVerified: true,
                },
            },
            select: {
                id: true,
                providerId: true,
                name: true,
                buildWidth: true,
                buildDepth: true,
                buildHeight: true,
                currentMaterialId: true,
                isAcceptingOrders: true,
                preprocessingTime: true,
                status: true,
                provider: {
                    select: {
                        id: true,
                        businessName: true,
                        latitude: true,
                        longitude: true,
                        city: true,
                        province: true,
                        isVerified: true,
                    },
                },
                orders: {
                    where: {
                        status: { in: ["IN_QUEUE", "PRINTING", "SLICING"] },
                    },
                    select: {
                        id: true,
                        status: true,
                        estimatedPrintTime: true,
                    },
                },
            },
        })

        if (printers.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No compatible printers found for the selected material and model size",
                availablePrinters: 0,
            })
        }

        // Filter printers with valid provider coordinates
        const printersWithCoords = printers.filter(
            (p) => p.provider.latitude !== null && p.provider.longitude !== null
        )

        if (printersWithCoords.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No printers available in your area",
                availablePrinters: 0,
            })
        }

        // Create order placeholder for scoring
        const orderForMatching: OrderForMatching = {
            id: "pre-check",
            materialId,
            modelWidth: modelWidth || null,
            modelHeight: modelHeight || null,
            modelDepth: modelDepth || null,
            shippingLat: customerLat,
            shippingLng: customerLng,
            estimatedPrintTime: estimatedPrintTime || null,
        }

        // Score each printer
        const scores = printersWithCoords.map((printer) => {
            const candidate: PrinterCandidate = {
                id: printer.id,
                providerId: printer.providerId,
                name: printer.name,
                buildWidth: printer.buildWidth,
                buildDepth: printer.buildDepth,
                buildHeight: printer.buildHeight,
                currentMaterialId: printer.currentMaterialId,
                isAcceptingOrders: printer.isAcceptingOrders,
                preprocessingTime: printer.preprocessingTime,
                status: printer.status,
                provider: {
                    latitude: printer.provider.latitude,
                    longitude: printer.provider.longitude,
                    city: printer.provider.city,
                },
                orders: printer.orders.map((o) => ({
                    id: o.id,
                    status: o.status,
                    estimatedPrintTime: o.estimatedPrintTime,
                })),
            }
            return {
                score: calculatePrinterScore(candidate, orderForMatching),
                printer,
            }
        })

        // Sort by score
        const sorted = scores.sort((a, b) => b.score.score - a.score.score)
        const bestMatch = sorted[0]

        if (!bestMatch) {
            return NextResponse.json({
                success: false,
                error: "Unable to find a suitable printer",
                availablePrinters: 0,
            })
        }

        // Return best printer with provider details
        return NextResponse.json({
            success: true,
            availablePrinters: sorted.length,
            bestPrinter: {
                printerId: bestMatch.printer.id,
                printerName: bestMatch.printer.name,
                providerId: bestMatch.printer.providerId,
                providerName: bestMatch.printer.provider.businessName,
                providerCity: bestMatch.printer.provider.city,
                providerProvince: bestMatch.printer.provider.province,
                isVerified: bestMatch.printer.provider.isVerified,
                coordinates: {
                    lat: bestMatch.printer.provider.latitude,
                    lng: bestMatch.printer.provider.longitude,
                },
                score: bestMatch.score.score,
                canPrintImmediately: bestMatch.score.canPrintImmediately,
                breakdown: bestMatch.score.breakdown,
                status: bestMatch.printer.status,
                isAcceptingOrders: bestMatch.printer.isAcceptingOrders,
                queuedOrders: bestMatch.printer.orders.length,
            },
            // Also return top 3 alternatives for transparency
            alternatives: sorted.slice(1, 4).map((s) => ({
                printerId: s.printer.id,
                printerName: s.printer.name,
                providerName: s.printer.provider.businessName,
                providerCity: s.printer.provider.city,
                score: s.score.score,
                distanceKm: s.score.breakdown.distanceKm,
            })),
        })
    } catch (error) {
        console.error("[Pre-check] Error:", error)
        return NextResponse.json(
            { success: false, error: "Failed to check printer availability" },
            { status: 500 }
        )
    }
}
