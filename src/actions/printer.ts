"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PrinterStatus, PrintTech, type Prisma } from "@prisma/client"
import crypto from "crypto"
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config"
import { resolvePrinterStateUpdate, resolveRequestedReadiness } from "@/lib/printer-state"

type PrinterFormData = {
    name?: unknown
    model?: unknown
    volumeX?: unknown
    volumeY?: unknown
    volumeZ?: unknown
    octoprintUrl?: unknown
    octoprintApiKey?: unknown
    isAcceptingOrders?: unknown
    preprocessingTime?: unknown
    currentMaterialId?: unknown
}

// Generate unique connection token for OctoPrint plugin auth
function generateConnectionToken(): string {
    return `cpt_${crypto.randomBytes(32).toString("hex")}`
}

export async function addPrinter(formData: PrinterFormData) {
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
                name: String(formData.name ?? ""),
                model: formData.model ? String(formData.model) : null,
                technology: PrintTech.FDM, // Default for now, should add to form
                buildWidth: parseInt(String(formData.volumeX)),
                buildDepth: parseInt(String(formData.volumeY)),
                buildHeight: parseInt(String(formData.volumeZ)),
                octoprintUrl: formData.octoprintUrl ? String(formData.octoprintUrl) : null,
                octoprintApiKey: formData.octoprintApiKey ? String(formData.octoprintApiKey) : null,
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
            data: resolvePrinterStateUpdate(status, printer.isAcceptingOrders)
        })

        revalidatePath("/provider/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Failed to update printer status:", error)
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
export async function updatePrinter(printerId: string, formData: PrinterFormData) {
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

        const data: Prisma.PrinterUncheckedUpdateInput = {
            name: String(formData.name ?? ""),
            model: formData.model ? String(formData.model) : null,
            buildWidth: parseInt(String(formData.volumeX)),
            buildDepth: parseInt(String(formData.volumeY)),
            buildHeight: parseInt(String(formData.volumeZ)),
        }

        // Add optional readiness fields if present
        if (formData.isAcceptingOrders !== undefined) {
            const requested = formData.isAcceptingOrders === 'true' || formData.isAcceptingOrders === true;
            const config = await loadMatchingConfig();
            data.isAcceptingOrders = resolveRequestedReadiness(
                requested,
                printer,
                new Date(),
                config.heartbeatTimeoutSeconds
            );
        }
        if (formData.preprocessingTime !== undefined) {
            data.preprocessingTime = parseInt(String(formData.preprocessingTime));
        }
        if (formData.currentMaterialId !== undefined) {
            // Handle "null" string or actual null
            data.currentMaterialId = formData.currentMaterialId === "null" || !formData.currentMaterialId
                ? null
                : String(formData.currentMaterialId);
        }

        await prisma.$transaction(async (tx) => {
            await tx.printer.update({
                where: { id: printerId },
                data
            })

            if (typeof data.currentMaterialId === "string") {
                await tx.printerMaterial.upsert({
                    where: {
                        printerId_materialId: {
                            printerId,
                            materialId: data.currentMaterialId,
                        },
                    },
                    update: {},
                    create: {
                        printerId,
                        materialId: data.currentMaterialId,
                    },
                })
            }
        })

        // If enabled accepting orders, trigger queue processing
        if (!printer.isAcceptingOrders && data.isAcceptingOrders) {
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
        console.error("Failed to load materials:", error)
        return { error: "Failed to load materials" }
    }
}
