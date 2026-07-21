"use server";

/**
 * Provider Order Management Actions
 * Handles order status updates, printer readiness, and shipping info
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
    assignOrderToPrinter,
    processQueueForPrinter,
} from "@/lib/printer-matching";
import type { OrderStatus } from "@prisma/client";
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config";
import { getPrinterStartBlockReason, resolveRequestedReadiness } from "@/lib/printer-state";
import { startPrinterOrder } from "@/lib/printer-dispatch";
import { triggerPrinterEvent } from "@/lib/pusher";
import { buildShipmentHistoryNote } from "@/lib/order-shipping";

// ====================== HELPER FUNCTIONS ======================

async function getProviderFromSession() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const provider = await prisma.provider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });

    if (!provider) {
        throw new Error("Provider not found");
    }

    return provider;
}

// ====================== ORDER ACTIONS ======================

/**
 * Get all orders for the current provider
 */
export async function getProviderOrders(
    status?: OrderStatus | OrderStatus[]
): Promise<{
    success: boolean;
    orders?: Array<{
        id: string;
        status: OrderStatus;
        stlFileName: string;
        quantity: number;
        totalPrice: number;
        estimatedPrintTime: number | null;
        createdAt: Date;
        printer: { id: string; name: string } | null;
        user: { name: string | null; email: string | null };
        material: { name: string } | null;
        shippingAddress: string;
    }>;
    error?: string;
}> {
    try {
        const provider = await getProviderFromSession();

        const statusFilter = status
            ? { status: { in: Array.isArray(status) ? status : [status] } }
            : {};

        const orders = await prisma.order.findMany({
            where: {
                providerId: provider.id,
                ...statusFilter,
            },
            select: {
                id: true,
                status: true,
                stlFileName: true,
                quantity: true,
                totalPrice: true,
                estimatedPrintTime: true,
                createdAt: true,
                shippingAddress: true,
                printer: {
                    select: { id: true, name: true },
                },
                user: {
                    select: { name: true, email: true },
                },
                material: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            orders: orders.map((o) => ({
                ...o,
                totalPrice: Number(o.totalPrice),
            })),
        };
    } catch (error) {
        console.error("[getProviderOrders] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update order status (with validation)
 */
export async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        // Verify order belongs to provider
        const order = await prisma.order.findFirst({
            where: { id: orderId, providerId: provider.id },
            select: { id: true, status: true },
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        // Status transition validation (using actual OrderStatus enum)
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING_PAYMENT: [],
            PAYMENT_FAILED: [],
            CONFIRMED: ["IN_QUEUE"],
            IN_QUEUE: ["SLICING", "PRINTING", "CANCELLED"],
            SLICING: ["PRINTING", "CANCELLED"],
            PRINTING: ["POST_PROCESSING", "CANCELLED"],
            POST_PROCESSING: ["PACKING", "CANCELLED"],
            PACKING: ["SHIPPED"],
            SHIPPED: ["DELIVERED"],
            DELIVERED: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
            REFUNDED: [],
        };

        const allowed = validTransitions[order.status] || [];
        if (!allowed.includes(newStatus)) {
            return {
                success: false,
                error: `Cannot transition from ${order.status} to ${newStatus}`,
            };
        }

        // Update status
        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: newStatus,
                    ...(newStatus === 'PRINTING' ? { printStartedAt: new Date() } : {}),
                    ...(newStatus === 'POST_PROCESSING' ? { printCompletedAt: new Date() } : {}),
                    ...(newStatus === 'SHIPPED' ? { shippedAt: new Date() } : {}),
                    ...((newStatus === 'DELIVERED' || newStatus === 'COMPLETED') ? { deliveredAt: new Date() } : {}),
                },
                select: { id: true, printerId: true },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    status: newStatus,
                    note: note || `Status updated to ${newStatus}`,
                },
            });
            return updated;
        });

        // When an order leaves PRINTING state, try to start next queue item on this printer
        if (order.status === 'PRINTING' && newStatus !== 'PRINTING' && updatedOrder.printerId) {
            try {
                await processQueueForPrinter(updatedOrder.printerId);
                console.log(`[updateOrderStatus] Queue processed for printer ${updatedOrder.printerId}`);
            } catch (err) {
                console.error('[updateOrderStatus] Queue processing error:', err);
            }
        }

        revalidatePath("/provider/dashboard/orders");
        return { success: true };
    } catch (error) {
        console.error("[updateOrderStatus] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update shipping information (tracking number, courier)
 */
export async function updateShippingInfo(
    orderId: string,
    trackingNumber: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        const order = await prisma.order.findFirst({
            where: { id: orderId, providerId: provider.id },
            select: { id: true, status: true, courierCode: true, courierService: true },
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        if (order.status !== "PACKING" && order.status !== "SHIPPED") {
            return { success: false, error: "Order is not ready to ship" };
        }

        const trimmedTrackingNumber = trackingNumber.trim();
        if (!trimmedTrackingNumber) {
            return { success: false, error: "Tracking number is required" };
        }

        await prisma.$transaction([
            prisma.order.update({
                where: { id: orderId },
                data: {
                    trackingNumber: trimmedTrackingNumber,
                    shippedAt: new Date(),
                    status: "SHIPPED",
                },
            }),
            prisma.orderStatusHistory.create({
                data: {
                    orderId,
                    status: "SHIPPED",
                    note: buildShipmentHistoryNote({
                        trackingNumber: trimmedTrackingNumber,
                        courierCode: order.courierCode,
                        courierService: order.courierService,
                    }),
                },
            }),
        ]);

        revalidatePath("/provider/dashboard/orders");
        return { success: true };
    } catch (error) {
        console.error("[updateShippingInfo] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// ====================== PRINTER READINESS ACTIONS ======================

/**
 * Update printer readiness and current material
 */
export async function updatePrinterReadiness(
    printerId: string,
    data: {
        isAcceptingOrders?: boolean;
        currentMaterialId?: string | null;
        preprocessingTime?: number;
    }
): Promise<{ success: boolean; queueProcessed?: number; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        // Verify printer belongs to provider
        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: {
                id: true,
                status: true,
                lastSeenAt: true,
                isAcceptingOrders: true,
            },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        const config = await loadMatchingConfig();
        const isAcceptingOrders = resolveRequestedReadiness(
            data.isAcceptingOrders,
            printer,
            new Date(),
            config.heartbeatTimeoutSeconds
        );

        await prisma.printer.update({
            where: { id: printerId },
            data: {
                isAcceptingOrders,
                currentMaterialId: data.currentMaterialId,
                preprocessingTime: data.preprocessingTime,
            },
        });

        // If printer is now accepting orders, process the queue
        let queueProcessed = 0;
        if (!printer.isAcceptingOrders && isAcceptingOrders) {
            const result = await processQueueForPrinter(printerId);
            queueProcessed = result.started;
        }

        revalidatePath("/provider/dashboard/printers");
        return { success: true, queueProcessed };
    } catch (error) {
        console.error("[updatePrinterReadiness] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Manually assign an order to a specific printer
 */
export async function manualAssignOrder(
    orderId: string,
    printerId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        // Verify both belong to provider
        const [order, printer] = await Promise.all([
            prisma.order.findFirst({
                where: { id: orderId, providerId: provider.id },
            }),
            prisma.printer.findFirst({
                where: { id: printerId, providerId: provider.id },
            }),
        ]);

        if (!order) {
            return { success: false, error: "Order not found" };
        }
        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { printerId },
        });

        revalidatePath("/provider/dashboard/orders");
        return { success: true };
    } catch (error) {
        console.error("[manualAssignOrder] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Bulk assign orders to a specific printer
 */
export async function bulkAssignOrders(
    orderIds: string[],
    printerId: string
): Promise<{ success: boolean; updated?: number; skipped?: string[]; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: { id: true },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                providerId: provider.id,
            },
            select: { id: true },
        });

        const validIds = orders.map(o => o.id);
        const skipped = orderIds.filter(id => !validIds.includes(id));

        if (validIds.length === 0) {
            return { success: false, error: "No valid orders selected" };
        }

        const result = await prisma.order.updateMany({
            where: { id: { in: validIds } },
            data: { printerId },
        });

        revalidatePath("/provider/dashboard/orders");
        return { success: true, updated: result.count, skipped };
    } catch (error) {
        console.error("[bulkAssignOrders] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Bulk update order status with validation
 */
export async function bulkUpdateOrderStatus(
    orderIds: string[],
    newStatus: OrderStatus
): Promise<{ success: boolean; updated?: number; failed?: Array<{ id: string; error: string }>; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING_PAYMENT: [],
            PAYMENT_FAILED: [],
            CONFIRMED: ["IN_QUEUE"],
            IN_QUEUE: ["SLICING", "PRINTING", "CANCELLED"],
            SLICING: ["PRINTING", "CANCELLED"],
            PRINTING: ["POST_PROCESSING", "CANCELLED"],
            POST_PROCESSING: ["PACKING", "CANCELLED"],
            PACKING: ["SHIPPED"],
            SHIPPED: ["DELIVERED"],
            DELIVERED: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
            REFUNDED: [],
        };

        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                providerId: provider.id,
            },
            select: { id: true, status: true, printerId: true },
        });

        const failed: Array<{ id: string; error: string }> = [];
        let updated = 0;

        for (const order of orders) {
            const allowed = validTransitions[order.status] || [];
            if (!allowed.includes(newStatus)) {
                failed.push({ id: order.id, error: `Cannot transition from ${order.status}` });
                continue;
            }

            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: newStatus,
                        ...(newStatus === 'PRINTING' ? { printStartedAt: new Date() } : {}),
                        ...(newStatus === 'POST_PROCESSING' ? { printCompletedAt: new Date() } : {}),
                        ...(newStatus === 'SHIPPED' ? { shippedAt: new Date() } : {}),
                        ...((newStatus === 'DELIVERED' || newStatus === 'COMPLETED') ? { deliveredAt: new Date() } : {}),
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        status: newStatus,
                        note: `Bulk status update to ${newStatus}`,
                        changedBy: provider.id,
                    },
                });
            });

            updated += 1;
        }

        revalidatePath("/provider/dashboard/orders");
        return { success: true, updated, failed };
    } catch (error) {
        console.error("[bulkUpdateOrderStatus] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Bulk advance orders to their next valid status
 */
export async function bulkAdvanceOrderStatus(
    orderIds: string[]
): Promise<{ success: boolean; updated?: number; skipped?: Array<{ id: string; reason: string }>; error?: string }> {
    try {
        const provider = await getProviderFromSession();

        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING_PAYMENT: [],
            PAYMENT_FAILED: [],
            CONFIRMED: ["IN_QUEUE"],
            IN_QUEUE: ["SLICING", "PRINTING", "CANCELLED"],
            SLICING: ["PRINTING", "CANCELLED"],
            PRINTING: ["POST_PROCESSING", "CANCELLED"],
            POST_PROCESSING: ["PACKING", "CANCELLED"],
            PACKING: ["SHIPPED"],
            SHIPPED: ["DELIVERED"],
            DELIVERED: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
            REFUNDED: [],
        };

        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                providerId: provider.id,
            },
            select: { id: true, status: true },
        });

        const skipped: Array<{ id: string; reason: string }> = [];
        let updated = 0;

        for (const order of orders) {
            const allowed = validTransitions[order.status] || [];
            const nextStatus = allowed[0];

            if (!nextStatus) {
                skipped.push({ id: order.id, reason: `No next status from ${order.status}` });
                continue;
            }

            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: nextStatus,
                        ...(nextStatus === 'PRINTING' ? { printStartedAt: new Date() } : {}),
                        ...(nextStatus === 'POST_PROCESSING' ? { printCompletedAt: new Date() } : {}),
                        ...(nextStatus === 'SHIPPED' ? { shippedAt: new Date() } : {}),
                        ...((nextStatus === 'DELIVERED' || nextStatus === 'COMPLETED') ? { deliveredAt: new Date() } : {}),
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        status: nextStatus,
                        note: `Bulk advanced to ${nextStatus}`,
                        changedBy: provider.id,
                    },
                });
            });

            updated += 1;
        }

        revalidatePath("/provider/dashboard/orders");
        return { success: true, updated, skipped };
    } catch (error) {
        console.error("[bulkAdvanceOrderStatus] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Start next order in queue for a printer (earliest by queuePosition/createdAt)
 */
export async function startNextQueuedPrint(printerId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        const provider = await getProviderFromSession();

        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: { id: true, status: true, isAcceptingOrders: true, lastSeenAt: true },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        const config = await loadMatchingConfig();
        const startBlockReason = getPrinterStartBlockReason(
            printer,
            new Date(),
            config.heartbeatTimeoutSeconds
        );
        if (startBlockReason) {
            return { success: false, error: startBlockReason };
        }

        const nextOrder = await prisma.order.findFirst({
            where: {
                providerId: provider.id,
                printerId,
                status: { in: ["IN_QUEUE", "SLICING", "CONFIRMED"] },
                gcodeFileUrl: { not: null },
            },
            orderBy: [
                { queuePosition: "asc" },
                { createdAt: "asc" },
            ],
            select: { id: true },
        });

        if (!nextOrder) {
            return { success: false, error: "No queued orders with G-code for this printer" };
        }

        const result = await startPrintViaPlugin(nextOrder.id);
        return result;
    } catch (error) {
        console.error("[startNextQueuedPrint] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to start next print",
        };
    }
}

/**
 * Get queue list for printer (including G-code availability)
 */
export async function getPrinterQueueForSelection(printerId: string): Promise<{
    success: boolean;
    orders?: Array<{
        id: string;
        stlFileName: string;
        estimatedPrintTime: number | null;
        createdAt: Date;
        status: OrderStatus;
        gcodeFileUrl: string | null;
    }>;
    error?: string;
}> {
    try {
        const provider = await getProviderFromSession();

        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: { id: true },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        const orders = await prisma.order.findMany({
            where: {
                printerId,
                status: { in: ["IN_QUEUE", "SLICING", "CONFIRMED"] },
            },
            select: {
                id: true,
                stlFileName: true,
                estimatedPrintTime: true,
                createdAt: true,
                status: true,
                gcodeFileUrl: true,
            },
            orderBy: [
                { queuePosition: "asc" },
                { createdAt: "asc" },
            ],
            take: 20,
        });

        return { success: true, orders };
    } catch (error) {
        console.error("[getPrinterQueueForSelection] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Trigger auto-assignment for an order
 * Called after payment confirmation
 */
export async function triggerOrderAssignment(orderId: string): Promise<{
    success: boolean;
    printerId?: string;
    status?: string;
    error?: string;
}> {
    try {
        const result = await assignOrderToPrinter(orderId);

        if (result.success) {
            revalidatePath("/provider/dashboard/orders");
        }

        return result;
    } catch (error) {
        console.error("[triggerOrderAssignment] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get orders in queue for a specific printer
 */
export async function getPrinterQueue(printerId: string): Promise<{
    success: boolean;
    orders?: Array<{
        id: string;
        stlFileName: string;
        estimatedPrintTime: number | null;
        createdAt: Date;
        status: OrderStatus;
    }>;
    totalMinutes?: number;
    error?: string;
}> {
    try {
        const provider = await getProviderFromSession();

        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: { id: true, preprocessingTime: true },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        const orders = await prisma.order.findMany({
            where: {
                printerId,
                status: { in: ["IN_QUEUE", "PRINTING", "SLICING"] },
            },
            select: {
                id: true,
                stlFileName: true,
                estimatedPrintTime: true,
                createdAt: true,
                status: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const totalMinutes = orders.reduce(
            (sum, o) =>
                sum + (o.estimatedPrintTime || 0) + ((printer.preprocessingTime as number) || 10),
            0
        );

        return { success: true, orders, totalMinutes };
    } catch (error) {
        console.error("[getPrinterQueue] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// ====================== G-CODE UPLOAD ACTION ======================

/**
 * Upload G-code for an order
 * For MVP: stores as data URL. Later: upload to cloud storage.
 */
import { uploadGcodeToR2 } from "@/lib/r2-storage";

export async function uploadGcodeForOrder(
    orderId: string,
    gcodeContent: string,
    filename: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const provider = await getProviderFromSession();
        if (!provider) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify order belongs to this provider
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                providerId: provider.id,
            },
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        // Upload to R2
        const uploadResult = await uploadGcodeToR2(gcodeContent, orderId, filename);

        if (!uploadResult.success) {
            throw new Error(uploadResult.error || "Failed to upload to storage");
        }

        // Update order with G-code URL
        await prisma.order.update({
            where: { id: orderId },
            data: {
                gcodeFileUrl: uploadResult.url,
            },
        });

        // Create status history
        await prisma.orderStatusHistory.create({
            data: {
                orderId,
                status: order.status,
                note: `G-code uploaded: ${filename}`,
                changedBy: provider.id,
            },
        });

        console.log(`[uploadGcodeForOrder] Uploaded G-code for order ${orderId}: ${filename}`);

        revalidatePath("/provider/dashboard/orders");

        return { success: true };
    } catch (error) {
        console.error("[uploadGcodeForOrder] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
}

// ====================== PRINT VIA PLUGIN ======================

/**
 * Start print via the connected printer plugin (Pusher).
 * The plugin downloads the G-code URL and starts the job locally.
 */
export async function startPrintViaPlugin(orderId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const provider = await getProviderFromSession();
        const result = await startPrinterOrder(orderId, {
            providerId: provider.id,
            changedBy: provider.id,
            source: "plugin",
        });

        if (result.success) {
            revalidatePath("/provider/dashboard/orders");
            revalidatePath("/provider/dashboard/printers");
        }

        return result;
    } catch (error) {
        console.error("[startPrintViaPlugin] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to start print",
        };
    }
}

/**
 * Send control command to printer (pause/resume/cancel)
 */
export async function sendPrinterCommand(
    printerId: string,
    command: "job:pause" | "job:resume" | "job:cancel"
): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const provider = await getProviderFromSession();

        // Verify printer belongs to provider
        const printer = await prisma.printer.findFirst({
            where: { id: printerId, providerId: provider.id },
            select: { id: true, name: true },
        });

        if (!printer) {
            return { success: false, error: "Printer not found" };
        }

        // Send command via Pusher
        await triggerPrinterEvent(printerId, command, {});

        console.log(`[sendPrinterCommand] Sent ${command} to printer ${printerId}`);

        revalidatePath("/provider/dashboard/printers");

        return {
            success: true,
            message: `${command.replace("job:", "")} sent to ${printer.name}`,
        };
    } catch (error) {
        console.error("[sendPrinterCommand] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to send command",
        };
    }
}
