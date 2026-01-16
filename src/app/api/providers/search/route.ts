import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { lat, lng } = body

        if (!lat || !lng) {
            return NextResponse.json(
                { error: "Latitude and longitude are required" },
                { status: 400 }
            )
        }

        // Find all active providers with available printers
        const providers = await prisma.provider.findMany({
            where: {
                isActive: true,
                printers: {
                    some: {
                        status: { in: ["ONLINE", "PRINTING"] } // Available printers
                    }
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                printers: {
                    where: {
                        status: { in: ["ONLINE", "PRINTING"] }
                    },
                    include: {
                        materials: {
                            include: {
                                material: true
                            }
                        }
                    }
                }
            }
        })

        // Calculate distance for each provider and sort by nearest
        const providersWithDistance = providers
            .map(provider => {
                const distance = calculateDistance(
                    lat,
                    lng,
                    provider.latitude,
                    provider.longitude
                )

                // Check if within service radius
                const isWithinRadius = distance <= provider.serviceRadius

                // Count available printers
                const availablePrinters = provider.printers.filter(p => p.status === "ONLINE").length
                const printingPrinters = provider.printers.filter(p => p.status === "PRINTING").length

                return {
                    id: provider.id,
                    businessName: provider.businessName,
                    ownerName: provider.user.name,
                    distance: Math.round(distance * 10) / 10,
                    distanceUnit: "km",
                    isWithinRadius,
                    serviceRadius: provider.serviceRadius,
                    rating: provider.rating,
                    totalOrders: provider.totalOrders,
                    isVerified: provider.isVerified,
                    availablePrinters,
                    totalPrinters: provider.printers.length,
                    queueEstimate: printingPrinters * 30, // Rough estimate: 30 min per printing job
                    city: provider.city,
                    province: provider.province,
                    coordinates: {
                        lat: provider.latitude,
                        lng: provider.longitude,
                    }
                }
            })
            .sort((a, b) => a.distance - b.distance)

        // Filter to only those within service radius (or all if none available)
        const withinRadius = providersWithDistance.filter(p => p.isWithinRadius)
        const resultProviders = withinRadius.length > 0 ? withinRadius : providersWithDistance

        // Get the nearest provider
        const nearestProvider = resultProviders[0] || null

        return NextResponse.json({
            success: true,
            totalProviders: resultProviders.length,
            nearestProvider,
            providers: resultProviders.slice(0, 5), // Return top 5 nearest
            hasProvidersOutsideRadius: withinRadius.length === 0 && providersWithDistance.length > 0,
        })
    } catch (error) {
        console.error("Provider search error:", error)
        return NextResponse.json(
            { error: "Failed to search providers" },
            { status: 500 }
        )
    }
}
