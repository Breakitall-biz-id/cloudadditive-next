"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PrinterStatus, PrintTech } from "@prisma/client"
import crypto from "crypto"

// Generate unique connection token for OctoPrint plugin auth
function generateConnectionToken(): string {
    return `cpt_${crypto.randomBytes(32).toString("hex")}`
}

export async function addPrinter(formData: any) {
    const session = await auth()

    // 1. Auth & role check
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
        return { error: "Unauthorized" }
    }

    try {
        // 2. Get Provider profile & verify status
        const provider = await prisma.provider.findUnique({
            where: { userId: session.user.id }
        })

        if (!provider) {
            return { error: "Provider profile not found" }
        }

        if (!provider.isVerified) {
            return { error: "Account not verified. Please wait for admin approval." }
        }

        // 3. Create Printer with connection token for OctoPrint plugin
        const printer = await prisma.printer.create({
            data: {
                providerId: provider.id,
                name: formData.name,
                model: formData.model,
                technology: PrintTech.FDM, // Default for now, should add to form
                buildWidth: parseInt(formData.volumeX),
                buildDepth: parseInt(formData.volumeY),
                buildHeight: parseInt(formData.volumeZ),
                octoprintUrl: formData.octoprintUrl || null,
                octoprintApiKey: formData.octoprintApiKey || null,
                connectionToken: generateConnectionToken(), // For Pusher auth
                status: PrinterStatus.OFFLINE // Start as offline until plugin connects
            }
        })

        revalidatePath("/provider/dashboard")
        return {
            success: true,
            printerId: printer.id,
            connectionToken: printer.connectionToken // Return token for setup
        }
    } catch (error) {
        console.error("Failed to add printer:", error)
        return { error: "Failed to add printer" }
    }
}

export async function togglePrinterStatus(printerId: string, status: PrinterStatus) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        // Verify ownership
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: { provider: true }
        })

        if (!printer || printer.provider.userId !== session.user.id) {
            return { error: "Unauthorized" }
        }

        await prisma.printer.update({
            where: { id: printerId },
            data: { status }
        })

        revalidatePath("/provider/dashboard")
        return { success: true }
    } catch (error) {
        return { error: "Failed to update status" }
    }
}

// Get single printer with ownership check
export async function getPrinter(printerId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: { provider: true }
        })

        if (!printer || printer.provider.userId !== session.user.id) {
            return { error: "Printer not found" }
        }

        return {
            success: true,
            printer: {
                id: printer.id,
                name: printer.name,
                model: printer.model,
                technology: printer.technology,
                buildWidth: printer.buildWidth,
                buildDepth: printer.buildDepth,
                buildHeight: printer.buildHeight,
                status: printer.status,
                connectionToken: printer.connectionToken,
                lastSeenAt: printer.lastSeenAt,
                createdAt: printer.createdAt
            }
        }
    } catch (error) {
        console.error("Failed to get printer:", error)
        return { error: "Failed to get printer" }
    }
}

// Update printer details
export async function updatePrinter(printerId: string, formData: any) {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
        return { error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: { provider: true }
        })

        if (!printer || printer.provider.userId !== session.user.id) {
            return { error: "Printer not found" }
        }

        const data: any = {
            name: formData.name,
            model: formData.model,
            buildWidth: parseInt(formData.volumeX),
            buildDepth: parseInt(formData.volumeY),
            buildHeight: parseInt(formData.volumeZ),
        }

        // Add optional readiness fields if present
        if (formData.isAcceptingOrders !== undefined) {
            data.isAcceptingOrders = formData.isAcceptingOrders === 'true' || formData.isAcceptingOrders === true;
        }
        if (formData.preprocessingTime !== undefined) {
            data.preprocessingTime = parseInt(formData.preprocessingTime);
        }
        if (formData.currentMaterialId !== undefined) {
            // Handle "null" string or actual null
            data.currentMaterialId = formData.currentMaterialId === "null" || !formData.currentMaterialId
                ? null
                : formData.currentMaterialId;
        }

        const updatedPrinter = await prisma.printer.update({
            where: { id: printerId },
            data
        })

        // If enabled accepting orders, trigger queue processing
        if (data.isAcceptingOrders) {
            // Import dynamically to avoid circular dependencies if any
            const { processQueueForPrinter } = await import("@/lib/printer-matching");
            await processQueueForPrinter(printerId);
        }

        revalidatePath("/provider/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Failed to update printer:", error)
        return { error: "Failed to update printer" }
    }
}

// Delete printer
export async function deletePrinter(printerId: string) {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
        return { error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: { provider: true }
        })

        if (!printer || printer.provider.userId !== session.user.id) {
            return { error: "Printer not found" }
        }

        // Check for active jobs - don't allow delete if printer has active jobs
        // (implement this check when jobs are implemented)

        await prisma.printer.delete({
            where: { id: printerId }
        })

        revalidatePath("/provider/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete printer:", error)
        return { error: "Failed to delete printer" }
    }
}

// Regenerate connection token (for security)
export async function regenerateConnectionToken(printerId: string) {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
        return { error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: { provider: true }
        })

        if (!printer || printer.provider.userId !== session.user.id) {
            return { error: "Printer not found" }
        }

        const newToken = generateConnectionToken()

        await prisma.printer.update({
            where: { id: printerId },
            data: { connectionToken: newToken }
        })

        revalidatePath("/provider/dashboard")
        return { success: true, connectionToken: newToken }
    } catch (error) {
        console.error("Failed to regenerate token:", error)
        return { error: "Failed to regenerate token" }
    }
}

// Get active materials for dropdown
export async function getMaterials() {
    try {
        const materials = await prisma.material.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                type: true,
                colors: {
                    select: { name: true, hexCode: true }
                }
            }
        })
        return { success: true, materials }
    } catch (error) {
        return { error: "Failed to load materials" }
    }
}

