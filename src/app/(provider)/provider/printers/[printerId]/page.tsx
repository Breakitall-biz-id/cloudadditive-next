"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrinterQueueClient } from "./PrinterQueueClient"

interface PrinterQueuePageProps {
    params: Promise<{ printerId: string }>
}

export default async function PrinterQueuePage({ params }: PrinterQueuePageProps) {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/login")
    }

    const { printerId } = await params

    // Get provider
    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
    })

    if (!provider) {
        redirect("/provider/register")
    }

    // Get printer with material
    const printer = await prisma.printer.findFirst({
        where: {
            id: printerId,
            providerId: provider.id
        },
        include: {
            currentMaterial: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    if (!printer) {
        redirect("/provider/dashboard")
    }

    // Get queued orders for this printer
    const queuedOrders = await prisma.order.findMany({
        where: {
            printerId: printerId,
            status: {
                in: ["IN_QUEUE", "SLICING", "CONFIRMED"]
            }
        },
        include: {
            material: {
                select: {
                    name: true
                }
            },
            quality: {
                select: {
                    name: true,
                    layerHeight: true
                }
            }
        },
        orderBy: [
            { queuePosition: "asc" },
            { createdAt: "asc" }
        ]
    })

    // Get current printing order (if any)
    const currentJob = await prisma.order.findFirst({
        where: {
            printerId: printerId,
            status: "PRINTING"
        },
        include: {
            material: {
                select: { name: true }
            },
            quality: {
                select: { name: true, layerHeight: true }
            }
        }
    })

    // Transform data for client
    const printerData = {
        id: printer.id,
        name: printer.name,
        model: printer.model || "Unknown Model",
        status: printer.status,
        currentMaterial: printer.currentMaterial?.name || null,
        buildVolume: {
            width: printer.buildWidth,
            depth: printer.buildDepth,
            height: printer.buildHeight
        },
        lastTemperatures: printer.lastTemperatures as { hotend?: number; bed?: number } | null,
        lastSeenAt: printer.lastSeenAt?.toISOString() || null
    }

    const queueData = queuedOrders.map((order, index) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        filename: order.stlFileName,
        material: order.material.name,
        quality: order.quality.name,
        layerHeight: order.quality.layerHeight,
        estimatedTime: order.estimatedPrintTime || 0,
        weight: order.filamentWeightG || 0,
        thumbnailUrl: order.thumbnailUrl,
        position: order.queuePosition || index + 1,
        status: order.status
    }))

    const currentJobData = currentJob ? {
        id: currentJob.id,
        orderNumber: currentJob.orderNumber,
        filename: currentJob.stlFileName,
        material: currentJob.material.name,
        estimatedTime: currentJob.estimatedPrintTime || 0,
        startedAt: currentJob.printStartedAt?.toISOString() || null,
        thumbnailUrl: currentJob.thumbnailUrl
    } : null

    return (
        <PrinterQueueClient
            providerId={provider.id}
            printer={printerData}
            queue={queueData}
            currentJob={currentJobData}
        />
    )
}
