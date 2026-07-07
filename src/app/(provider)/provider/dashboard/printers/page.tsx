import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrinterFleet } from "@/components/provider/printer/PrinterFleet"
import { redirect } from "next/navigation"

export default async function PrinterFleetPage() {
    const session = await auth()
    if (!session?.user?.id) return redirect("/login")

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        include: {
            printers: {
                include: {
                    orders: true,
                    currentMaterial: true
                }
            }
        }
    })

    if (!provider) return <div>Provider profile not found</div>
    if (!provider.isVerified) return redirect("/provider/dashboard")

    // Transform data for UI
    const printers = provider.printers.map(p => ({
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
        isOnline: ["ONLINE", "IDLE", "PRINTING", "PAUSED", "COOLING"].includes(p.status),
        stats: {
            printTime: "0 hrs",
            successRate: "100%"
        }
    }))

    return (
        <PrinterFleet
            initialPrinters={printers}
            isVerified={provider.isVerified}
            providerId={provider.id}
        />
    )
}
