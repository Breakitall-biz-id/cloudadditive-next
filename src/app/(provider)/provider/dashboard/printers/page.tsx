import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrinterFleet } from "@/components/provider/printer/PrinterFleet"
import { getProviderPrinterReadiness } from "@/lib/provider-printer-readiness"
import { redirect } from "next/navigation"

export default async function PrinterFleetPage() {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        include: {
            printers: {
                include: {
                    orders: {
                        where: {
                            status: { in: ["CONFIRMED", "IN_QUEUE", "SLICING", "PRINTING", "POST_PROCESSING"] },
                        },
                        select: {
                            id: true,
                            status: true,
                            materialId: true,
                            gcodeFileUrl: true,
                            queuePosition: true,
                            createdAt: true,
                        },
                        orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
                    },
                    currentMaterial: true
                }
            }
        }
    })

    if (!provider) return <div>Provider profile not found</div>
    if (!provider.isVerified) return redirect("/provider/dashboard")

    // Transform data for UI
    const printers = provider.printers.map(p => {
        const readiness = getProviderPrinterReadiness({
            id: p.id,
            name: p.name,
            status: p.status,
            isAcceptingOrders: p.isAcceptingOrders,
            lastSeenAt: p.lastSeenAt,
            currentMaterialId: p.currentMaterialId,
            currentMaterial: p.currentMaterial ? { name: p.currentMaterial.name } : null,
            orders: p.orders,
        })

        return {
            id: p.id,
            name: p.name,
            model: p.model || "Unknown",
            // Map implementation details
            isAcceptingOrders: p.isAcceptingOrders,
            preprocessingTime: p.preprocessingTime,
            currentMaterialId: p.currentMaterialId,
            materialName: p.currentMaterial?.name,
            material: p.currentMaterial ? `${p.currentMaterial.name} (${p.currentMaterial.type})` : "Not Configured",

            // Technical specs
            buildWidth: p.buildWidth,
            buildDepth: p.buildDepth,
            buildHeight: p.buildHeight,

            status: p.status.toLowerCase() as any,
            lastSeenAt: p.lastSeenAt?.toISOString() || null,
            lastTemperatures: p.lastTemperatures as any,
            lastJobInfo: p.lastJobInfo as any,
            hasQueuedOrders: p.orders?.some(o => ["CONFIRMED", "IN_QUEUE", "SLICING"].includes(o.status)) || false,
            readiness,
            isOnline: ["ONLINE", "IDLE", "PRINTING", "PAUSED", "COOLING"].includes(p.status),
            stats: {
                printTime: "0 hrs",
                successRate: "100%"
            }
        }
    })

    return (
        <PrinterFleet
            initialPrinters={printers}
            isVerified={provider.isVerified}
            providerId={provider.id}
        />
    )
}
